"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getTickets, updateTicketStatus } from "@/lib/api";
import { Ticket, TicketListResponse, TicketStatus, TicketCategory } from "@/types";

const STATUS_BADGE: Record<TicketStatus, string> = {
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  resolved: "bg-green-100 text-green-700",
};

const CATEGORY_BADGE: Record<TicketCategory, string> = {
  connection: "bg-purple-100 text-purple-700",
  billing: "bg-orange-100 text-orange-700",
  general: "bg-slate-100 text-slate-600",
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
};

export default function TicketsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const params: Record<string, unknown> = { page, limit: 10 };
  if (search) params.user_search = search;
  if (statusFilter !== "all") params.status = statusFilter;
  if (categoryFilter !== "all") params.category = categoryFilter;

  const { data, isLoading } = useQuery<TicketListResponse>({
    queryKey: ["tickets", params],
    queryFn: () => getTickets(params).then((r) => r.data),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateTicketStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 10);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Support Tickets</h2>
          <p className="text-sm text-slate-500 mt-0.5">{total} total tickets</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Input
          placeholder="Search user…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-52"
        />
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v ?? "all"); setPage(1); }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v ?? "all"); setPage(1); }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="connection">Connection</SelectItem>
            <SelectItem value="billing">Billing</SelectItem>
            <SelectItem value="general">General</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#C41230] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>User</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-400 py-10">
                    No tickets found
                  </TableCell>
                </TableRow>
              ) : (
                data?.items.map((ticket) => (
                  <TableRow
                    key={ticket.id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <TableCell>
                      <p className="font-medium text-slate-800">{ticket.user?.full_name ?? "—"}</p>
                      <p className="text-xs text-slate-400">{ticket.user?.email}</p>
                    </TableCell>
                    <TableCell className="text-slate-700 max-w-xs truncate">
                      {ticket.title}
                    </TableCell>
                    <TableCell>
                      <Badge className={CATEGORY_BADGE[ticket.category]}>
                        {ticket.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_BADGE[ticket.status]}>
                        {STATUS_LABELS[ticket.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={ticket.status}
                        onValueChange={(s) => s && statusMutation.mutate({ id: ticket.id, status: s })}
                      >
                        <SelectTrigger className="h-7 w-32 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedTicket?.title}</DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-3 text-sm">
              <div className="flex gap-2">
                <Badge className={CATEGORY_BADGE[selectedTicket.category]}>
                  {selectedTicket.category}
                </Badge>
                <Badge className={STATUS_BADGE[selectedTicket.status]}>
                  {STATUS_LABELS[selectedTicket.status]}
                </Badge>
              </div>
              <div className="text-slate-500">
                From: <span className="text-slate-700 font-medium">{selectedTicket.user?.full_name}</span>
                {" "}&lt;{selectedTicket.user?.email}&gt;
              </div>
              <div className="text-slate-500">
                Created: {new Date(selectedTicket.created_at).toLocaleString()}
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-slate-700 whitespace-pre-wrap">
                {selectedTicket.description}
              </div>
              <Select
                value={selectedTicket.status}
                onValueChange={(s) => {
                  if (!s) return;
                  statusMutation.mutate({ id: selectedTicket.id, status: s });
                  setSelectedTicket({ ...selectedTicket, status: s as TicketStatus });
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
