import { createMachine, interpret } from 'xstate';

import {
  config,
  makeBrewClickedEvent,
  reservoirEmptiedEvent,
  potPartialEvent,
  potRemovedEvent,
  potEmptiedEvent,
} from '../../src/index';

import type { Context, Event } from '../../src/index';

const HW_VALUE = {
  valveClosed: {
    mask: 0x01,
    value: 0x01,
  },
  boilerOn: {
    mask: 0x02,
    value: 0x02,
  },
  warmerOn: {
    mask: 0x04,
    value: 0x04,
  },
  lightOn: {
    mask: 0x08,
    value: 0x08,
  },
  reservoirLoaded: {
    mask: 0x10,
    value: 0x10,
  },
  potEmpty: {
    mask: 0x60,
    value: 0x20,
  },
  potPartial: {
    mask: 0x60,
    value: 0x60,
  },
} as const;

type TypeHwValue = typeof HW_VALUE;
type HwValueName = keyof TypeHwValue;
type HwValueInfo = TypeHwValue[HwValueName];
export type HwValue = HwValueInfo['value'];
export type HwMask = HwValueInfo['mask'];

// shift least significant zeros
function shiftLSZ(value: number) {
  const n = value >>> 0;
  if (n === 0) return n;

  const firstSet = n & ~(n - 1);
  return n >>> Math.log2(firstSet);
}

const toOffOn: (v: number) => string = (value: number) =>
  value > 0 ? 'on' : 'off';

const toOpenClosed: (v: number) => string = (value: number) =>
  value > 0 ? 'closed' : 'open';

const toEmptyLoaded: (v: number) => string = (value: number) =>
  value > 0 ? 'loaded' : 'empty';

const toRemovedEmptyPartial: (v: number) => string = (value) => {
  const n = shiftLSZ(value);

  return n === 0 ? 'removed' : n === 1 ? 'emptied' : 'partial';
};

const maskToString: [HwMask, (v: number) => string, string][] = [
  [HW_VALUE.valveClosed.mask, toOpenClosed, 'valve'],
  [HW_VALUE.boilerOn.mask, toOffOn, 'boiler'],
  [HW_VALUE.warmerOn.mask, toOffOn, 'warmer'],
  [HW_VALUE.lightOn.mask, toOffOn, 'light'],
  [HW_VALUE.reservoirLoaded.mask, toEmptyLoaded, 'reservoir'],
  [HW_VALUE.potPartial.mask, toRemovedEmptyPartial, 'pot'],
];

function reportStateDifferences(expected: number, actual: number): string {
  return maskToString.reduce(appendPartReport, []).join(', ');

  function appendPartReport(
    acc: string[],
    [mask, toString, name]: [HwMask, (v: number) => void, string]
  ): string[] {
    const partExpected = expected & mask;
    const partActual = actual & mask;
    if (partExpected === partActual) return acc;

    acc.push(`${name}(${toString(partExpected)}, ${toString(partActual)})`);
    return acc;
  }
}

class Mark4HwFake {
  static defaultState = 0;

  static stateValueSet(info: HwValueInfo, hw: Mark4HwFake): void {
    const { mask, value } = info;
    hw.internal = value | (hw.internal & ~mask);
  }

  static stateValueClear(info: HwValueInfo, hw: Mark4HwFake): void {
    hw.internal &= ~info.mask;
  }

  static stateBooleanGet(trueInfo: HwValueInfo, hw: Mark4HwFake) {
    return Boolean(hw.internal & trueInfo.mask);
  }

  static stateBooleanSet(
    trueInfo: HwValueInfo,
    hw: Mark4HwFake,
    value: boolean
  ) {
    if (value) Mark4HwFake.stateValueSet(trueInfo, hw);
    else Mark4HwFake.stateValueClear(trueInfo, hw);
  }

  static stateTriGet(
    trueInfo: HwValueInfo,
    falseInfo: HwValueInfo,
    hw: Mark4HwFake
  ) {
    const field = hw.internal & trueInfo.mask;
    return field === trueInfo.value
      ? true
      : field === falseInfo.value
      ? false
      : undefined;
  }

  static stateTriSet(
    trueInfo: HwValueInfo,
    falseInfo: HwValueInfo,
    hw: Mark4HwFake,
    value: boolean | undefined
  ) {
    if (typeof value !== 'boolean') Mark4HwFake.stateValueClear(trueInfo, hw);
    else Mark4HwFake.stateValueSet(value ? trueInfo : falseInfo, hw);
  }

  static allActions(hw: Mark4HwFake) {
    return {
      valveClose: hw.valveClose,
      valveOpen: hw.valveOpen,
      boilerOn: hw.boilerOn,
      boilerOff: hw.boilerOff,
      warmerOn: hw.warmerOn,
      warmerOff: hw.warmerOff,
      lightOn: hw.lightOn,
      lightOff: hw.lightOff,
    };
  }

  constructor(public internal: number = Mark4HwFake.defaultState) {}

  get reservoirLoaded(): boolean {
    return Mark4HwFake.stateBooleanGet(HW_VALUE.reservoirLoaded, this);
  }

  set reservoirLoaded(value: boolean) {
    Mark4HwFake.stateBooleanSet(HW_VALUE.reservoirLoaded, this, value);
  }

  get pot(): boolean | undefined {
    return Mark4HwFake.stateTriGet(
      HW_VALUE.potPartial,
      HW_VALUE.potEmpty,
      this
    );
  }

  set pot(value: boolean | undefined) {
    Mark4HwFake.stateTriSet(
      HW_VALUE.potPartial,
      HW_VALUE.potEmpty,
      this,
      value
    );
  }

  // actions
  valveClose = () => Mark4HwFake.stateValueSet(HW_VALUE.valveClosed, this);
  valveOpen = () => Mark4HwFake.stateValueClear(HW_VALUE.valveClosed, this);

  boilerOn = () => Mark4HwFake.stateValueSet(HW_VALUE.boilerOn, this);
  boilerOff = () => Mark4HwFake.stateValueClear(HW_VALUE.boilerOn, this);

  warmerOn = () => Mark4HwFake.stateValueSet(HW_VALUE.warmerOn, this);
  warmerOff = () => Mark4HwFake.stateValueClear(HW_VALUE.warmerOn, this);

  lightOn = () => Mark4HwFake.stateValueSet(HW_VALUE.lightOn, this);
  lightOff = () => Mark4HwFake.stateValueClear(HW_VALUE.lightOn, this);
}

type Send = (event: Event) => void;

class Mark4Control {
  constructor(public fake: Mark4HwFake, public send: Send) {}

  sendBrewClicked() {
    const reservoirEmpty = !this.fake.reservoirLoaded;
    const potEmpty = this.fake.pot === false;
    this.send(makeBrewClickedEvent(reservoirEmpty, potEmpty));
  }

  sendReservoirEmptied() {
    this.fake.reservoirLoaded = false;
    this.send(reservoirEmptiedEvent);
  }

  sendPotPartial() {
    this.fake.pot = true;
    this.send(potPartialEvent);
  }

  sendPotRemoved() {
    this.fake.pot = undefined;
    this.send(potRemovedEvent);
  }

  sendPotEmptied() {
    this.fake.pot = false;
    this.send(potEmptiedEvent);
  }

  setReservoirLoaded() {
    this.fake.reservoirLoaded = true;
  }

  get internal() {
    return this.fake.internal;
  }
}

function assembleMark4(
  initial: number = Mark4HwFake.defaultState
): Mark4Control {
  const fake = new Mark4HwFake(initial);
  const actions = Mark4HwFake.allActions(fake);
  const machine = createMachine<Context, Event>(config, {
    actions,
  });
  const service = interpret(machine);
  const control = new Mark4Control(fake, (event) => service.send(event));

  service.start();
  return control;
}

function setHwValue(state: number, name: HwValueName): number {
  return state | HW_VALUE[name].value;
}

function stateFromValueNames(partNames: HwValueName[]): number {
  return partNames.reduce(setHwValue, 0);
}

export { assembleMark4, stateFromValueNames, reportStateDifferences };

export type { Mark4Control };
