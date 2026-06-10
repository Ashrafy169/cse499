"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/api";
import { Notification, NotificationListResponse } from "@/types";
import { cn } from "@/lib/utils";

const TYPE_ICON: Record<string, string> = {
  overdue_invoice: "🔴",
  payment_received: "💚",
  new_ticket: "🎫",
  ticket_updated: "🔄",
  plan_change_requested: "📋",
  plan_change_reviewed: "✅",
  invoice_generated: "🧾",
  custom_invoice: "📝",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const { data } = useQuery<NotificationListResponse>({
    queryKey: ["notifications"],
    queryFn: () => getNotifications({ page: 1, limit: 20 }).then((r) => r.data),
    refetchInterval: 30000,
  });

  const readMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const readAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const unread = data?.unread_count ?? 0;
  const items = data?.items ?? [];

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-[#C41230] text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p className="font-semibold text-slate-800 text-sm">
              Notifications {unread > 0 && <span className="text-[#C41230]">({unread})</span>}
            </p>
            {unread > 0 && (
              <button
                onClick={() => readAllMutation.mutate()}
                disabled={readAllMutation.isPending}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-[#C41230] transition-colors"
              >
                <CheckCheck size={13} />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
                <Bell size={24} className="opacity-40" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              items.map((n: Notification) => (
                <div
                  key={n.id}
                  className={cn(
                    "flex gap-3 px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer",
                    !n.is_read && "bg-red-50/40"
                  )}
                  onClick={() => {
                    if (!n.is_read) readMutation.mutate(n.id);
                  }}
                >
                  <span className="text-base mt-0.5 shrink-0">{TYPE_ICON[n.type] ?? "🔔"}</span>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm leading-snug", !n.is_read ? "font-semibold text-slate-800" : "text-slate-600")}>
                      {n.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.is_read && (
                    <button
                      onClick={(e) => { e.stopPropagation(); readMutation.mutate(n.id); }}
                      className="shrink-0 mt-1 text-slate-300 hover:text-[#C41230] transition-colors"
                      title="Mark read"
                    >
                      <Check size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
