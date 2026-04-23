export const REALTIME_EVENTS = {
  bookingCreated: "booking:created",
  bookingUpdated: "booking:updated",
  waiterRequestCreated: "waiter-request:created",
  waiterRequestUpdated: "waiter-request:updated",
} as const;

export type RealtimeEventName = (typeof REALTIME_EVENTS)[keyof typeof REALTIME_EVENTS];

export type RealtimePayload = {
  id: number;
  code: string;
  status: string;
  zoneName?: string | null;
  tableCode?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type BroadcastFn = (event: RealtimeEventName, payload: RealtimePayload) => void;

declare global {
  var __samCampingBroadcastRealtime: BroadcastFn | undefined;
}

export function broadcastRealtimeEvent(event: RealtimeEventName, payload: RealtimePayload) {
  global.__samCampingBroadcastRealtime?.(event, payload);
}
