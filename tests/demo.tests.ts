import { suite } from 'uvu';

import { assertState } from './helpers/assert-state';
import { assembleMark4, stateFromValueNames } from './helpers';

const Demo = suite('Demo');

Demo.skip('Happy Path Run', () => {
  let expected = stateFromValueNames(['potEmpty']);
  const control = assembleMark4(expected);

  // initialized
  assertState(expected, control.internal, 'Should be all zero');

  // (1) fill reservoir
  expected = stateFromValueNames(['reservoirLoaded', 'potEmpty']);
  control.setReservoirLoaded();
  assertState(expected, control.internal, 'reservoir should be LOADED');

  // (2) Click brew button
  expected = stateFromValueNames([
    'valveClosed',
    'boilerOn',
    'reservoirLoaded',
    'potEmpty',
  ]);
  control.sendBrewClicked();
  assertState(
    expected,
    control.internal,
    'valve should be CLOSED; boiler should be ON'
  );

  // (3) Pot is beginning to fill
  expected = stateFromValueNames([
    'valveClosed',
    'boilerOn',
    'warmerOn',
    'reservoirLoaded',
    'potPartial',
  ]);
  control.sendPotPartial();
  assertState(
    expected,
    control.internal,
    'pot should be PARTIAL; warmer should be ON'
  );

  // (4) Reservoir depleted (brewing complete)
  expected = stateFromValueNames(['warmerOn', 'lightOn', 'potPartial']);
  control.sendReservoirEmptied();
  assertState(expected, control.internal, 'light should be ON');

  // (5) Remove Pot (coffee maker off)
  control.sendPotRemoved();
  assertState(0, control.internal, 'back to idle');
});

Demo.run();
