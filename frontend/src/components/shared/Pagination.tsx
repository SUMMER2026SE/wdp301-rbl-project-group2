import React from "react";
import { clsx } from "clsx";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, start + maxVisiblePages - 1);

      if (end === totalPages) {
        start = Math.max(1, end - maxVisiblePages + 1);
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-white border border-[#e7dbcf] rounded-xl shadow-sm mt-6">
      <p className="text-sm text-[#9a734c] font-medium">
        Hiển thị{" "}
        <span className="font-bold text-[#1b140d]">
          {startItem}-{endItem}
        </span>{" "}
        trong tổng số{" "}
        <span className="font-bold text-[#1b140d]">{totalItems}</span> món ăn
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="w-10 h-10 rounded-lg flex items-center justify-center border border-[#e7dbcf] text-[#9a734c] hover:bg-[#fcfaf8] hover:text-[#ee8c2b] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          title="Trang trước"
        >
          <span className="material-symbols-outlined">chevron_left</span>
        </button>

        {getPageNumbers().map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={clsx(
              "w-10 h-10 rounded-lg text-sm font-bold flex items-center justify-center transition-all border",
              page === currentPage
                ? "bg-[#ee8c2b] border-[#ee8c2b] text-white shadow-lg shadow-[#ee8c2b]/20"
                : "bg-white border-[#e7dbcf] text-[#9a734c] hover:border-[#ee8c2b] hover:text-[#ee8c2b]",
            )}
          >
            {page}
          </button>
        ))}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="w-10 h-10 rounded-lg flex items-center justify-center border border-[#e7dbcf] text-[#9a734c] hover:bg-[#fcfaf8] hover:text-[#ee8c2b] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          title="Trang sau"
        >
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      </div>
    </div>
  );
};
