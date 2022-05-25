import { suite } from 'uvu';

import { assembleMark4, stateFromValueNames } from './helpers';
import { assertState } from './helpers/assert-state';

const Guard = suite('Guarding brew start');

Guard('Do not brew without loading the reservoir', () => {
  // valve open, boiler off, warmer off, light off
  // reservoir empty, pot (present and) empty
  const expected = stateFromValueNames(['potEmpty']);

  // (1) Reservoir NOT loaded while pot is empty
  const control = assembleMark4(expected);
  // (2) Click brew button
  control.sendBrewClicked();

  assertState(
    expected,
    control.internal,
    'Should not start with empty reservoir'
  );
});

Guard('Do not brew without pot', () => {
  const expected = stateFromValueNames(['reservoirLoaded']);

  // (1) Reservoir loaded BUT pot is missing
  const control = assembleMark4(expected);
  // (2) Click brew button
  control.sendBrewClicked();

  assertState(
    expected,
    control.internal,
    'Should not start when pot is missing'
  );
});

Guard('Do not brew when pot is not empty', () => {
  const expected = stateFromValueNames(['reservoirLoaded', 'potPartial']);

  // (1) Reservoir loaded BUT pot partially filled
  const control = assembleMark4(expected);
  // (2) Click brew button
  control.sendBrewClicked();

  assertState(
    expected,
    control.internal,
    'Should not start when pot is not empty'
  );
});

Guard.run();
