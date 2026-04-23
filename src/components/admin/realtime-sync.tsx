"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { io, type Socket } from "socket.io-client";

import { REALTIME_EVENTS } from "@/lib/server/realtime-events";

let socket: Socket | null = null;

function getSocket() {
  if (!socket) {
    socket = io({ path: "/socket.io" });
  }
  return socket;
}

export function RealtimeSync({
  events,
}: {
  events: string[];
}) {
  const router = useRouter();

  useEffect(() => {
    const client = getSocket();
    let timer: ReturnType<typeof setTimeout> | null = null;

    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        router.refresh();
      }, 150);
    };

    for (const event of events) {
      client.on(event, refresh);
    }

    return () => {
      if (timer) clearTimeout(timer);
      for (const event of events) {
        client.off(event, refresh);
      }
    };
  }, [events, router]);

  return null;
}

export function BookingRealtimeSync() {
  return <RealtimeSync events={[REALTIME_EVENTS.bookingCreated, REALTIME_EVENTS.bookingUpdated]} />;
}

export function WaiterRealtimeSync() {
  return <RealtimeSync events={[REALTIME_EVENTS.waiterRequestCreated, REALTIME_EVENTS.waiterRequestUpdated]} />;
}
