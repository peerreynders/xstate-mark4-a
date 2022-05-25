import { compare } from 'uvu/diff';
import { Assertion } from 'uvu/assert';

import { reportStateDifferences } from './index';

function assertState(expects: number, actual: number, intro: string): void {
  if (expects === actual) return;

  const differences = reportStateDifferences(expects, actual);
  const message = `${intro}:\n      ${differences}`;

  const details = compare(actual, expects);
  const operator = 'assertState';

  throw new Assertion({
    actual,
    expects,
    operator,
    message,
    details,
    generated: false,
  });
}

export { assertState };
