import * as React from "react";

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800" },
  extracting: { label: "Extracting", color: "bg-blue-100 text-blue-800" },
  done: { label: "Done", color: "bg-green-100 text-green-800" },
  error: { label: "Error", color: "bg-red-100 text-red-800" },
  queued: { label: "Queued", color: "bg-purple-100 text-purple-800" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = statusMap[status] || { label: status, color: "bg-gray-100 text-gray-800" };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${s.color}`}>{s.label}</span>
  );
}
