import { suite } from 'uvu';

import { assembleMark4, stateFromValueNames } from './helpers';
import { assertState } from './helpers/assert-state';

import type { Mark4Control } from './helpers';

type NormalContext = {
  initialState: number | undefined;
  mark4: Mark4Control | undefined;
};

const Normal = suite<NormalContext>('Normal brew progression', {
  initialState: undefined,
  mark4: undefined,
});

Normal.before((context) => {
  context.initialState = stateFromValueNames(['reservoirLoaded', 'potEmpty']);
});

Normal.before.each((context) => {
  if (typeof context.initialState === 'undefined')
    throw new Error('Initial state for Mark4Control missing');

  // Prep a mark4 with the brewing process started
  // (1) With loaded reservoir
  context.mark4 = assembleMark4(context.initialState);
  // (2) Click brew button
  context.mark4.sendBrewClicked();
});

Normal.after.each((context) => {
  // dispose of instance
  context.mark4 = undefined;
});

Normal('Brewing has started', (context) => {
  if (typeof context.mark4 === 'undefined')
    throw new Error('Mark4Control missing');

  const expected = stateFromValueNames([
    'valveClosed',
    'boilerOn',
    'reservoirLoaded',
    'potEmpty',
  ]);

  // (1) Reservoir loaded, (2) Brew button clicked
  assertState(
    expected,
    context.mark4.internal,
    'Starts with loaded reservoir loaded and empty pot'
  );
});

Normal('Pot starts filling up', (context) => {
  if (typeof context.mark4 === 'undefined')
    throw new Error('Mark4Control missing');

  const expected = stateFromValueNames([
    'valveClosed',
    'boilerOn',
    'warmerOn',
    'reservoirLoaded',
    'potPartial',
  ]);

  // (1) Reservoir loaded, (2) Brew button clicked
  // (3) Pot is beginning to fill (start warming)
  context.mark4.sendPotPartial();

  assertState(
    expected,
    context.mark4.internal,
    'Should start warming once pot fills up'
  );
});

Normal('Reservoir depletes', (context) => {
  if (typeof context.mark4 === 'undefined')
    throw new Error('Mark4Control missing');

  const expected = stateFromValueNames(['warmerOn', 'lightOn', 'potPartial']);

  // (1) Reservoir loaded, (2) Brew button clicked
  // (3) Pot is beginning to fill (start warming)
  context.mark4.sendPotPartial();
  // (4) Reservoir depleted (brewing complete)
  context.mark4.sendReservoirEmptied();

  assertState(
    expected,
    context.mark4.internal,
    'Light should turn on while warming continues'
  );
});

Normal('Remove pot for serving', (context) => {
  if (typeof context.mark4 === 'undefined')
    throw new Error('Mark4Control missing');

  const expected = 0;

  // (1) Reservoir loaded, (2) Brew button clicked
  // (3) Pot is beginning to fill (start warming)
  context.mark4.sendPotPartial();
  // (4) Reservoir depleted (brewing complete)
  context.mark4.sendReservoirEmptied();
  // (5) Remove Pot (return to idle)
  context.mark4.sendPotRemoved();

  assertState(
    expected,
    context.mark4.internal,
    'Return to idle when pot is removed after brewing completes.'
  );
});

Normal('Return pot partially filled', (context) => {
  if (typeof context.mark4 === 'undefined')
    throw new Error('Mark4Control missing');

  const expected = stateFromValueNames(['warmerOn', 'potPartial']);

  // (1) Reservoir loaded, (2) Brew button clicked
  // (3) Pot is beginning to fill (start warming)
  context.mark4.sendPotPartial();
  // (4) Reservoir depleted (brewing complete)
  context.mark4.sendReservoirEmptied();
  // (5) Remove Pot (return to idle)
  context.mark4.sendPotRemoved();
  // (6) Return pot partially filled (return to warming)
  context.mark4.sendPotPartial();

  assertState(
    expected,
    context.mark4.internal,
    'Return to warming partially filled pot.'
  );
});

Normal('Return pot pot empty', (context) => {
  if (typeof context.mark4 === 'undefined')
    throw new Error('Mark4Control missing');

  const expected = stateFromValueNames(['potEmpty']);

  // (1) Reservoir loaded, (2) Brew button clicked
  // (3) Pot is beginning to fill (start warming)
  context.mark4.sendPotPartial();
  // (4) Reservoir depleted (brewing complete)
  context.mark4.sendReservoirEmptied();
  // (5) Remove Pot (return to idle)
  context.mark4.sendPotRemoved();
  // (6) Return empty pot (continue to idle)
  context.mark4.sendPotEmptied();

  assertState(
    expected,
    context.mark4.internal,
    'Continue to idle when empty pot is returned.'
  );
});

Normal.run();
