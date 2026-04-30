"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { createPortal } from "react-dom";

import { getBookingStatusLabel } from "@/lib/bookings";
import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";

export type BookingStatus = "pending" | "confirmed" | "seated" | "completed" | "cancelled" | "no_show";

const bookingStatusOptions: Array<{ value: BookingStatus; label: string }> = [
  { value: "pending", label: getBookingStatusLabel("pending") },
  { value: "confirmed", label: getBookingStatusLabel("confirmed") },
  { value: "seated", label: getBookingStatusLabel("seated") },
  { value: "completed", label: getBookingStatusLabel("completed") },
  { value: "cancelled", label: getBookingStatusLabel("cancelled") },
  { value: "no_show", label: getBookingStatusLabel("no_show") },
];

const bookingStatusToneMap: Record<BookingStatus, "warning" | "success" | "info" | "danger" | "default"> = {
  pending: "warning",
  confirmed: "success",
  seated: "info",
  completed: "success",
  cancelled: "danger",
  no_show: "danger",
};

export function isBookingStatus(value: string): value is BookingStatus {
  return ["pending", "confirmed", "seated", "completed", "cancelled", "no_show"].includes(value);
}

export function getBookingStatusValue(value: string): BookingStatus {
  return isBookingStatus(value) ? value : "pending";
}

export function getBookingStatusOptions() {
  return bookingStatusOptions;
}

export function BookingStatusDropdown({
  bookingId,
  status,
  isStatusPending,
  onUpdate,
  className,
}: {
  bookingId: number;
  status: string;
  isStatusPending: boolean;
  onUpdate: (id: number, status: BookingStatus) => void;
  className?: string;
}) {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const summaryRef = useRef<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  const updateMenuPosition = () => {
    const trigger = summaryRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const menuWidth = Math.max(rect.width, 180);
    const viewportPadding = 12;
    const left = Math.min(
      Math.max(viewportPadding, rect.right - menuWidth),
      window.innerWidth - menuWidth - viewportPadding,
    );

    setMenuPosition({
      top: rect.bottom + 8,
      left,
      width: menuWidth,
    });
  };

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const details = detailsRef.current;
      const menu = menuRef.current;
      if (!isOpen || !details) return;
      if (event.target instanceof Node && details.contains(event.target)) return;
      if (event.target instanceof Node && menu?.contains(event.target)) return;
      setIsOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) return;

    updateMenuPosition();

    const handleViewportChange = () => updateMenuPosition();
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [isOpen]);

  const currentStatus = getBookingStatusValue(status);

  return (
    <details ref={detailsRef} open={isOpen} className={cn("relative shrink-0", className)}>
      <summary
        ref={summaryRef}
        className="list-none marker:hidden [&::-webkit-details-marker]:hidden"
        onClick={(event) => {
          event.preventDefault();
          if (isStatusPending) return;
          setIsOpen((current) => !current);
        }}
      >
        <Badge
          tone={bookingStatusToneMap[currentStatus]}
          className={cn(
            "cursor-pointer whitespace-nowrap transition-opacity duration-200 hover:opacity-90",
            isStatusPending && "pointer-events-none opacity-60",
          )}
        >
          {getBookingStatusLabel(currentStatus)}
        </Badge>
      </summary>
      {isOpen && menuPosition ? createPortal(
        <div
          ref={menuRef}
          className="fixed z-[999] rounded-[20px] border border-[color:var(--line)] bg-[rgba(255,255,255,0.96)] p-2 shadow-[0_18px_36px_rgba(24,51,33,0.16)] backdrop-blur"
          style={{ top: menuPosition.top, left: menuPosition.left, minWidth: `${menuPosition.width}px` }}
        >
          <div className="space-y-1">
            {bookingStatusOptions.map((option) => {
              const isActive = option.value === currentStatus;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-[14px] px-3 py-2 text-left text-sm font-semibold text-[var(--forest-dark)] transition-colors duration-200",
                    isActive ? "bg-[rgba(63,111,66,0.10)] text-[var(--forest)]" : "hover:bg-[var(--panel)]",
                  )}
                  disabled={isStatusPending || isActive}
                  onClick={() => {
                    setIsOpen(false);
                    onUpdate(bookingId, option.value);
                  }}
                >
                  <span>{option.label}</span>
                  {isActive ? <Check className="h-4 w-4" /> : null}
                </button>
              );
            })}
          </div>
        </div>,
        document.body,
      ) : null}
    </details>
  );
}
