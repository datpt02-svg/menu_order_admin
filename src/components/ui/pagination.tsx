import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
};

function getPaginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }).map((_, i) => i + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis-end", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [1, "ellipsis-start", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "ellipsis-start", currentPage - 1, currentPage, currentPage + 1, "ellipsis-end", totalPages];
}

export function Pagination({ currentPage, totalPages, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  const items = getPaginationItems(currentPage, totalPages);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <button
        type="button"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="flex h-8 w-8 items-center justify-center rounded-[10px] text-[var(--muted)] transition-colors enabled:hover:bg-[rgba(63,111,66,0.06)] enabled:hover:text-[var(--forest-dark)] disabled:opacity-50"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {items.map((item) => {
        if (typeof item === "string") {
          return (
            <div key={item} className="flex h-8 w-8 items-center justify-center text-[var(--muted)]">
              <MoreHorizontal className="h-4 w-4 opacity-50" />
            </div>
          );
        }

        const isActive = item === currentPage;
        return (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-[10px] text-sm font-semibold transition-all duration-200",
              isActive 
                ? "bg-[var(--forest)] text-white shadow-[0_4px_12px_rgba(45,82,44,0.2)]"
                : "text-[var(--muted)] hover:bg-[rgba(63,111,66,0.06)] hover:text-[var(--forest-dark)]"
            )}
          >
            {item}
          </button>
        );
      })}

      <button
        type="button"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="flex h-8 w-8 items-center justify-center rounded-[10px] text-[var(--muted)] transition-colors enabled:hover:bg-[rgba(63,111,66,0.06)] enabled:hover:text-[var(--forest-dark)] disabled:opacity-50"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
