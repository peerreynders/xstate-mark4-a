import { suite } from 'uvu';

import { assembleMark4, stateFromValueNames } from './helpers';
import { assertState } from './helpers/assert-state';

import type { Mark4Control } from './helpers';

type PartialContext = {
  initialState: number | undefined;
  mark4: Mark4Control | undefined;
};

const Partial = suite<PartialContext>('Remove while brew in progress', {
  initialState: undefined,
  mark4: undefined,
});

Partial.before((context) => {
  context.initialState = stateFromValueNames(['potEmpty']);
});

Partial.before.each((context) => {
  if (typeof context.initialState === 'undefined')
    throw new Error('Initial state for Mark4Control missing');

  // Prep a mark4 with the brewing process started
  context.mark4 = assembleMark4(context.initialState);
  // (1) load reservoir
  context.mark4.setReservoirLoaded();
  // (2) Click brew button
  context.mark4.sendBrewClicked();
  // (3) Pot is beginning to fill (start warming)
  context.mark4.sendPotPartial();
});

Partial.after.each((context) => {
  // dispose of instance
  context.mark4 = undefined;
});

Partial('Brew is in progress', (context) => {
  if (typeof context.mark4 === 'undefined')
    throw new Error('Mark4Control missing');

  const expected = stateFromValueNames([
    'valveClosed',
    'boilerOn',
    'warmerOn',
    'reservoirLoaded',
    'potPartial',
  ]);

  assertState(
    expected,
    context.mark4.internal,
    'Brew process has been started'
  );
});

Partial('Brew pauses after pot is removed', (context) => {
  if (typeof context.mark4 === 'undefined')
    throw new Error('Mark4Control missing');

  const expected = stateFromValueNames(['reservoirLoaded']);
  // (4) Remove pot (should idle)
  context.mark4.sendPotRemoved();
  assertState(expected, context.mark4.internal, 'Brew process pauses');
});

Partial('Brew resumes after empty pot is returned', (context) => {
  if (typeof context.mark4 === 'undefined')
    throw new Error('Mark4Control missing');

  const expected = stateFromValueNames([
    'valveClosed',
    'boilerOn',
    'reservoirLoaded',
    'potEmpty',
  ]);
  // (4) Remove pot (should idle)
  context.mark4.sendPotRemoved();
  // (5) Return empty pot (should resume)
  context.mark4.sendPotEmptied();

  assertState(
    expected,
    context.mark4.internal,
    'Brew process resumes with empty pot'
  );
});

Partial('Brew resumes after partial pot is returned', (context) => {
  if (typeof context.mark4 === 'undefined')
    throw new Error('Mark4Control missing');

  const expected = stateFromValueNames([
    'valveClosed',
    'boilerOn',
    'warmerOn',
    'reservoirLoaded',
    'potPartial',
  ]);
  // (4) Remove pot (should idle)
  context.mark4.sendPotRemoved();
  // (5) Return empty pot (should resume with warmer on)
  context.mark4.sendPotPartial();

  assertState(
    expected,
    context.mark4.internal,
    'Brewing resumes with partial pot (warmer on)'
  );
});

Partial.run();
