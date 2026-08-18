"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print rounded-lg bg-sunset-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sunset-600"
    >
      Print / Save as PDF
    </button>
  );
}
