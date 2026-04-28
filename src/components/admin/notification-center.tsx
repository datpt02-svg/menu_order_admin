"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { io, type Socket } from "socket.io-client";

import { Badge } from "@/components/ui/badge";
import { REALTIME_EVENTS, type RealtimePayload } from "@/lib/server/realtime-events";

type NotificationTone = "warning" | "danger";

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  createdAt: string;
  tone: NotificationTone;
  label: string;
};

type DeletedBookingNotice = NotificationItem & {
  source: "user_cancel_before_confirmation";
  bookingCode: string;
};

const STORAGE_KEY = "samcamping_admin_read_notifications";
const COOKIE_KEY = STORAGE_KEY;
const DELETED_NOTICES_STORAGE_KEY = "samcamping_admin_deleted_booking_notices";
const MAX_DELETED_NOTICES = 8;

let socket: Socket | null = null;

function getSocket() {
  if (!socket) {
    socket = io({ path: "/socket.io" });
  }
  return socket;
}

function formatNotificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  return `${hour}:${minute} ${day}/${month}`;
}

function parseStoredIds(raw: string | null) {
  if (!raw) return [] as string[];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [] as string[];
  }
}

function readStoredIds() {
  return parseStoredIds(window.localStorage.getItem(STORAGE_KEY));
}

function writeStoredIds(ids: string[]) {
  const serialized = JSON.stringify(ids);
  window.localStorage.setItem(STORAGE_KEY, serialized);
  document.cookie = `${COOKIE_KEY}=${encodeURIComponent(serialized)}; path=/; max-age=31536000; samesite=lax`;
}

function parseStoredDeletedNotices(raw: string | null) {
  if (!raw) return [] as DeletedBookingNotice[];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter(
          (value): value is DeletedBookingNotice =>
            Boolean(
              value
              && typeof value === "object"
              && typeof value.id === "string"
              && typeof value.title === "string"
              && typeof value.description === "string"
              && typeof value.href === "string"
              && typeof value.createdAt === "string"
              && typeof value.label === "string"
              && typeof value.bookingCode === "string"
              && (value.tone === "warning" || value.tone === "danger")
              && value.source === "user_cancel_before_confirmation",
            ),
        )
      : [];
  } catch {
    return [] as DeletedBookingNotice[];
  }
}

function readStoredDeletedNotices() {
  return parseStoredDeletedNotices(window.localStorage.getItem(DELETED_NOTICES_STORAGE_KEY));
}

function writeStoredDeletedNotices(notices: DeletedBookingNotice[]) {
  window.localStorage.setItem(DELETED_NOTICES_STORAGE_KEY, JSON.stringify(notices));
}

function buildDeletedBookingNotice(payload: RealtimePayload): DeletedBookingNotice | null {
  if (payload.source !== "user_cancel_before_confirmation" || !payload.code || !payload.customerName) {
    return null;
  }

  const createdAt = payload.deletedAt ?? payload.updatedAt ?? new Date().toISOString();
  const bookingDateTime = [payload.bookingDate, payload.bookingTime].filter(Boolean).join(" ");

  return {
    id: `booking-deleted-${payload.code}-${createdAt}`,
    title: `${payload.customerName} đã hủy booking`,
    description: bookingDateTime ? `${payload.code} · ${bookingDateTime}` : payload.code,
    href: "/bookings",
    createdAt,
    tone: "warning",
    label: "Booking đã bị hủy",
    source: "user_cancel_before_confirmation",
    bookingCode: payload.code,
  };
}

function upsertDeletedBookingNotice(notice: DeletedBookingNotice) {
  const nextNotices = [notice, ...readStoredDeletedNotices().filter((item) => item.id !== notice.id)].slice(0, MAX_DELETED_NOTICES);
  writeStoredDeletedNotices(nextNotices);
  return nextNotices;
}

function pruneDeletedBookingNotices(notices: DeletedBookingNotice[], activeNotifications: NotificationItem[]) {
  const activeCodes = new Set(activeNotifications.map((item) => item.description.split(" · ")[0]).filter(Boolean));
  const nextNotices = notices.filter((item) => !activeCodes.has(item.bookingCode)).slice(0, MAX_DELETED_NOTICES);
  writeStoredDeletedNotices(nextNotices);
  return nextNotices;
}

function dedupeNotificationItems(items: NotificationItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function mergeDeletedBookingNotices(serverNotifications: NotificationItem[], deletedNotices: DeletedBookingNotice[]) {
  const deletedCodes = new Set(deletedNotices.map((item) => item.bookingCode));
  return dedupeNotificationItems([
    ...serverNotifications.filter((item) => !deletedCodes.has(item.description.split(" · ")[0] ?? "")),
    ...deletedNotices,
  ]).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function NotificationCenter({ notifications, initialReadIds }: { notifications: NotificationItem[]; initialReadIds: string[] }) {
  const [readIds, setReadIds] = useState<string[]>(initialReadIds);
  const [deletedNotices, setDeletedNotices] = useState<DeletedBookingNotice[]>([]);
  const detailsRef = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    const syncReadIds = () => {
      setReadIds(readStoredIds());
    };

    const syncDeletedNotices = () => {
      setDeletedNotices(pruneDeletedBookingNotices(readStoredDeletedNotices(), notifications));
    };

    syncReadIds();
    syncDeletedNotices();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        syncReadIds();
      }
      if (event.key === DELETED_NOTICES_STORAGE_KEY) {
        syncDeletedNotices();
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      const details = detailsRef.current;
      if (!details?.open) return;
      if (details.contains(event.target as Node)) return;
      details.open = false;
    };

    const client = getSocket();
    const handleDeletedBooking = (payload: RealtimePayload) => {
      const notice = buildDeletedBookingNotice(payload);
      if (!notice) return;
      setDeletedNotices(upsertDeletedBookingNotice(notice));
    };

    client.on(REALTIME_EVENTS.bookingDeleted, handleDeletedBooking);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("pointerdown", handlePointerDown);

    return () => {
      client.off(REALTIME_EVENTS.bookingDeleted, handleDeletedBooking);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [notifications]);

  const mergedNotifications = useMemo(
    () => mergeDeletedBookingNotices(notifications, deletedNotices),
    [deletedNotices, notifications],
  );

  const visibleReadIds = useMemo(() => {
    const currentIds = new Set(mergedNotifications.map((item) => item.id));
    return readIds.filter((id) => currentIds.has(id));
  }, [mergedNotifications, readIds]);

  const unreadCount = useMemo(
    () => mergedNotifications.filter((notification) => !visibleReadIds.includes(notification.id)).length,
    [mergedNotifications, visibleReadIds],
  );

  const markAsRead = (id: string) => {
    if (visibleReadIds.includes(id)) return;
    const nextReadIds = [...visibleReadIds, id];
    writeStoredIds(nextReadIds);
    setReadIds(nextReadIds);
  };

  const handleNotificationClick = (id: string) => {
    markAsRead(id);
    if (detailsRef.current) {
      detailsRef.current.open = false;
    }
  };

  return (
    <details ref={detailsRef} className="group relative w-full min-w-[280px] max-w-[380px] lg:w-auto">
      <summary className="flex min-h-11 list-none items-center justify-between gap-3 rounded-[var(--radius-pill)] border border-[color:var(--line)] bg-white/80 px-4 text-sm font-semibold text-[var(--forest-dark)] shadow-[0_12px_24px_rgba(45,82,44,0.08)] transition-all duration-200 hover:-translate-y-[1px] hover:bg-white hover:shadow-[0_16px_28px_rgba(45,82,44,0.12)] marker:hidden [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-3">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(63,111,66,0.08)] text-[var(--forest)]">
            <Bell className={`h-4 w-4 origin-top ${unreadCount > 0 ? "notification-bell-ring" : ""}`} />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#9f4b3e] px-1 text-[10px] font-bold text-white">
                {Math.min(unreadCount, 9)}
                {unreadCount > 9 ? "+" : ""}
              </span>
            ) : null}
          </span>
          <span>
            <span className="block text-left">Thông báo mới</span>
            <span className="block text-xs font-medium text-[var(--muted)]">
              {unreadCount > 0 ? `${unreadCount} mục cần chú ý` : "Chưa có mục mới"}
            </span>
          </span>
        </span>
      </summary>
      <div className="absolute right-0 top-[calc(100%+0.75rem)] z-20 hidden w-full overflow-hidden rounded-[24px] border border-[color:var(--line)] bg-[rgba(255,255,255,0.96)] shadow-[0_24px_48px_rgba(24,51,33,0.18)] backdrop-blur group-open:block">
        <div className="border-b border-[color:var(--line)] px-5 py-4">
          <div className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--mint-deep)]">Notification center</div>
          <div className="mt-1 text-sm text-[var(--muted)]">Booking mới, booking bị user hủy và yêu cầu gọi nhân viên đang chờ xử lý.</div>
        </div>
        <div className="max-h-[420px] space-y-3 overflow-y-auto p-4 admin-scrollbar">
          {mergedNotifications.length > 0 ? (
            mergedNotifications.map((notification) => {
              const isRead = visibleReadIds.includes(notification.id);

              return (
                <Link
                  key={notification.id}
                  href={notification.href}
                  onClick={() => handleNotificationClick(notification.id)}
                  className="block rounded-[20px] border border-[color:var(--line)] bg-white/80 p-4 transition-all duration-200 hover:-translate-y-[1px] hover:bg-[var(--panel)] hover:shadow-[0_14px_24px_rgba(45,82,44,0.12)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={notification.tone}>{notification.label}</Badge>
                        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--mint-deep)]">
                          {formatNotificationTime(notification.createdAt)}
                        </span>
                        {!isRead ? <span className="h-2.5 w-2.5 rounded-full bg-[#9f4b3e]" /> : null}
                      </div>
                      <div className="mt-3 font-semibold text-[var(--forest-dark)]">{notification.title}</div>
                      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{notification.description}</p>
                    </div>
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="rounded-[20px] border border-dashed border-[color:var(--line)] bg-white/70 p-5 text-sm leading-6 text-[var(--muted)]">
              Chưa có notification nào cần xử lý ngay. Khi có booking mới, booking bị user hủy hoặc bàn gọi nhân viên, mục này sẽ tự cập nhật.
            </div>
          )}
        </div>
      </div>
    </details>
  );
}
