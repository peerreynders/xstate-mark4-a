import type { MachineConfig } from 'xstate';

export type Context = Record<string, never>;

// Events

function makeBrewClickedEvent(reservoirEmpty: boolean, potEmpty: boolean) {
  return {
    type: 'BREW_CLICKED',
    reservoirEmpty,
    potEmpty,
  };
}

const reservoirEmptiedEvent = {
  type: 'RESERVOIR_EMPTIED',
} as const;

const potPartialEvent = {
  type: 'POT_PARTIAL',
} as const;

const potRemovedEvent = {
  type: 'POT_REMOVED',
} as const;

const potEmptiedEvent = {
  type: 'POT_EMPTIED',
} as const;

type BrewClickedEvent = ReturnType<typeof makeBrewClickedEvent>;

export type Event =
  | BrewClickedEvent
  | typeof reservoirEmptiedEvent
  | typeof potPartialEvent
  | typeof potRemovedEvent
  | typeof potEmptiedEvent;

function passBrewCheck(_context: Context, event: BrewClickedEvent) {
  return !event.reservoirEmpty && event.potEmpty;
}

// Warmer control

const warmRunTarget = 'warmIdle';

const warmRun = {
  entry: ['warmerOn'],
  on: {
    POT_EMPTIED: warmRunTarget,
    POT_REMOVED: warmRunTarget,
  },
};

const warmIdleTarget = 'warmRun';

const warmIdle = {
  entry: ['warmerOff'],
  on: {
    POT_PARTIAL: warmIdleTarget,
  },
};

const warmerControl = {
  initial: 'warmIdle',
  states: {
    warmRun,
    warmIdle,
  },
};

// Brew control

// brewRun sub states
//
const brewing = {
  entry: ['boilerOn', 'valveClose'],
  on: {
    POT_REMOVED: 'waiting',
  },
};

const waitingTarget = 'brewing';

const waiting = {
  entry: ['boilerOff', 'valveOpen'],
  on: {
    POT_PARTIAL: waitingTarget,
    POT_EMPTIED: waitingTarget,
  },
};

// brew controller states
//
const brewIdle = {
  entry: ['boilerOff', 'valveOpen', 'lightOff'],
  on: {
    BREW_CLICKED: {
      target: 'brewRun',
      cond: passBrewCheck,
    },
  },
};

const brewComplete = {
  entry: ['boilerOff', 'valveOpen', 'lightOn'],
  on: {
    POT_REMOVED: 'brewIdle',
  },
};

const brewRun = {
  entry: ['lightOff'],
  on: {
    RESERVOIR_EMPTIED: 'brewComplete',
  },
  initial: 'brewing',
  states: {
    brewing,
    waiting,
  },
};

const brewControl = {
  initial: 'brewIdle',
  states: {
    brewIdle,
    brewRun,
    brewComplete,
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const config: MachineConfig<Context, any, Event> = {
  id: 'mark4-controller',
  type: 'parallel',
  context: {},
  states: {
    brewControl,
    warmerControl,
  },
};

export {
  config,
  makeBrewClickedEvent,
  reservoirEmptiedEvent,
  potPartialEvent,
  potRemovedEvent,
  potEmptiedEvent,
};
