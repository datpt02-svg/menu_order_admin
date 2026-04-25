"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  className,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Chuyển thành async để thỏa mãn linter tránh "cascading renders"
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleEsc);
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, onClose, mounted]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-8">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-md transition-opacity duration-300 animate-in fade-in" 
        onClick={onClose}
      />
      
      {/* Modal Card */}
      <div 
        className={cn(
          "relative z-[10000] flex flex-col w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-[32px] border border-white/60 bg-[rgba(248,255,245,0.98)] shadow-[0_32px_64px_-16px_rgba(30,58,31,0.4)] animate-in zoom-in-95 fade-in duration-300",
          className
        )}
      >
        <header className="flex items-center justify-between border-b border-[color:var(--line)] bg-white/40 px-8 py-6 shrink-0">
          <h3 className="font-[family:var(--font-charm)] text-3xl font-bold tracking-tight text-[var(--forest-dark)]">
            {title}
          </h3>
          <button 
            onClick={onClose}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--forest-dark)]/5 text-[var(--forest-dark)] transition-all hover:bg-[var(--forest-dark)]/10 hover:rotate-90"
          >
            <X className="h-6 w-6" />
          </button>
        </header>

        <div className="admin-scrollbar min-h-0 flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
