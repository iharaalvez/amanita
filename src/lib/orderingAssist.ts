export type OrderingAssistDetection = {
  name: string;
  confidence: number;
  source: "mock" | "ocr";
  rawText?: string | null;
  isShiny?: boolean | null;
  gender?: "male" | "female" | null;
};

export type OrderingAssistEventType =
  | "detected"
  | "confirm-current"
  | "mark-ordered"
  | "clear"
  | "pause-changed";

export type OrderingAssistIncomingEvent = {
  type: OrderingAssistEventType;
  detection?: OrderingAssistDetection | null;
  paused?: boolean | null;
  createdAt?: string;
};

export type OrderingAssistStoredEvent = OrderingAssistIncomingEvent & {
  id: number;
  createdAt: string;
};

type OrderingAssistMailbox = {
  nextId: number;
  events: OrderingAssistStoredEvent[];
  subscribers: Set<(event: OrderingAssistStoredEvent) => void>;
};

const MAX_EVENTS = 100;
const GLOBAL_KEY = "__amanitaOrderingAssistMailbox";

type GlobalWithMailbox = typeof globalThis & {
  [GLOBAL_KEY]?: OrderingAssistMailbox;
};

function mailbox(): OrderingAssistMailbox {
  const globalScope = globalThis as GlobalWithMailbox;
  globalScope[GLOBAL_KEY] ??= { nextId: 1, events: [], subscribers: new Set() };
  return globalScope[GLOBAL_KEY];
}

export function appendOrderingAssistEvent(
  event: OrderingAssistIncomingEvent,
): OrderingAssistStoredEvent {
  const box = mailbox();
  const stored: OrderingAssistStoredEvent = {
    ...event,
    id: box.nextId,
    createdAt: event.createdAt ?? new Date().toISOString(),
  };
  box.nextId += 1;
  box.events = [...box.events, stored].slice(-MAX_EVENTS);
  for (const subscriber of box.subscribers) {
    subscriber(stored);
  }
  return stored;
}

export function getOrderingAssistEventsAfter(
  afterId: number,
): OrderingAssistStoredEvent[] {
  return mailbox().events.filter((event) => event.id > afterId);
}

export function subscribeToAssistEvents(
  callback: (event: OrderingAssistStoredEvent) => void,
): () => void {
  const box = mailbox();
  box.subscribers.add(callback);
  return () => box.subscribers.delete(callback);
}
