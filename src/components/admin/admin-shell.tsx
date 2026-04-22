import Link from "next/link";
import { BellRing, CalendarDays, LayoutDashboard, Map, UtensilsCrossed, UserRoundCog, UsersRound } from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/bookings", label: "Booking", icon: UsersRound },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/staff", label: "Nhân viên", icon: UserRoundCog },
  { href: "/waiter-requests", label: "Gọi nhân viên", icon: BellRing },
  { href: "/tables", label: "Bàn / Khu vực", icon: Map },
  { href: "/services", label: "Dịch vụ", icon: UtensilsCrossed },
] as const;

export function AdminShell({
  pathname,
  children,
  title,
  description,
  actions,
}: {
  pathname: string;
  children: React.ReactNode;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="admin-grid-bg min-h-screen p-4 md:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1600px] grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-[28px] border border-[color:var(--line)] bg-[rgba(244,251,240,0.92)] p-5 shadow-[var(--shadow-soft)] backdrop-blur-md">
          <div className="rounded-[24px] bg-[linear-gradient(180deg,rgba(12,27,18,0.06),rgba(12,27,18,0.38))] p-5 text-[var(--white)] shadow-[var(--shadow-float)]">
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-white/75">Sam Camping</div>
            <h1 className="mt-3 font-[family:var(--font-hachi-maru-pop)] text-xl leading-tight">Admin console</h1>
            <p className="mt-3 text-sm leading-6 text-white/80">Điều phối booking, vận hành phục vụ và dịch vụ từ một giao diện thống nhất.</p>
          </div>

          <nav className="mt-5 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-[18px] px-4 py-3 text-sm font-semibold transition",
                    active
                      ? "bg-[var(--mint-strong)] text-[var(--forest-dark)] shadow-[0_12px_22px_rgba(45,82,44,0.08)]"
                      : "text-[var(--forest)] hover:bg-white/50",
                  )}
                >
                  <span className={cn("flex h-10 w-10 items-center justify-center rounded-full", active ? "bg-white/75" : "bg-[rgba(63,111,66,0.08)]")}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 rounded-[24px] border border-[color:var(--line)] bg-[var(--panel-strong)] p-4 text-sm text-[var(--forest-dark)]">
            <div className="font-[family:var(--font-charm)] text-lg font-bold">Gợi ý vận hành</div>
            <p className="mt-2 leading-6 text-[var(--muted)]">Tuần tới mật độ booking tăng cao. Ưu tiên theo dõi calendar tuần và xuất Excel để sắp xếp ca làm.</p>
          </div>
        </aside>

        <main className="rounded-[30px] border border-white/50 bg-[rgba(248,255,245,0.76)] p-4 shadow-[var(--shadow-soft)] backdrop-blur-md md:p-6">
          <header className="flex flex-col gap-4 border-b border-[color:var(--line)] pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--mint-deep)]">Sam Camping Admin</div>
              <h2 className="mt-2 font-[family:var(--font-charm)] text-3xl font-bold text-[var(--forest-dark)]">{title}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">{description}</p>
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
          </header>
          <div className="pt-5">{children}</div>
        </main>
      </div>
    </div>
  );
}
