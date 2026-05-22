"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getMyTickets, createTicket } from "@/lib/api";
import { Ticket, TicketCategory, TicketListResponse, TicketStatus } from "@/types";

const STATUS_BADGE: Record<TicketStatus, string> = {
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  resolved: "bg-green-100 text-green-700",
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
};

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  connection: "Connection Issue",
  billing: "Billing",
  general: "General",
};

const schema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().min(10, "Please provide more detail (min 10 characters)"),
  category: z.enum(["connection", "billing", "general"]),
});
type TicketForm = z.infer<typeof schema>;

export default function PortalTicketsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailTicket, setDetailTicket] = useState<Ticket | null>(null);

  const { data, isLoading } = useQuery<TicketListResponse>({
    queryKey: ["my-tickets", page],
    queryFn: () => getMyTickets({ page, limit: 10 }).then((r) => r.data),
  });

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<TicketForm>({
    resolver: zodResolver(schema),
    defaultValues: { category: "general" },
  });

  const createMutation = useMutation({
    mutationFn: createTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
      toast.success("Ticket submitted successfully");
      setDialogOpen(false);
      reset();
    },
    onError: () => toast.error("Failed to submit ticket"),
  });

  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 10);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Support Tickets</h2>
          <p className="text-sm text-slate-500 mt-0.5">{total} ticket(s) total</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus size={16} className="mr-1" />
          New Ticket
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#C41230] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data?.items.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center text-slate-400">
          <p>No tickets yet.</p>
          <p className="text-sm mt-1">Open a ticket and our support team will get back to you.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.items.map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => setDetailTicket(ticket)}
              className="bg-white rounded-lg border border-slate-200 p-4 cursor-pointer hover:border-slate-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 truncate">{ticket.title}</p>
                  <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">{ticket.description}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Badge className="bg-slate-100 text-slate-600 text-xs">
                    {CATEGORY_LABELS[ticket.category]}
                  </Badge>
                  <Badge className={`text-xs ${STATUS_BADGE[ticket.status]}`}>
                    {STATUS_LABELS[ticket.status]}
                  </Badge>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {new Date(ticket.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Create ticket dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Open a Support Ticket</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="connection">Connection Issue</SelectItem>
                      <SelectItem value="billing">Billing</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input placeholder="Brief summary of your issue" {...register("title")} />
              {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Textarea
                placeholder="Describe your issue in detail…"
                rows={4}
                {...register("description")}
              />
              {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
            </div>
            <Button type="submit" disabled={createMutation.isPending} className="w-full">
              {createMutation.isPending ? "Submitting…" : "Submit Ticket"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={!!detailTicket} onOpenChange={() => setDetailTicket(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{detailTicket?.title}</DialogTitle>
          </DialogHeader>
          {detailTicket && (
            <div className="space-y-3 text-sm">
              <div className="flex gap-2">
                <Badge className="bg-slate-100 text-slate-600">
                  {CATEGORY_LABELS[detailTicket.category]}
                </Badge>
                <Badge className={STATUS_BADGE[detailTicket.status]}>
                  {STATUS_LABELS[detailTicket.status]}
                </Badge>
              </div>
              <p className="text-slate-400 text-xs">
                Submitted {new Date(detailTicket.created_at).toLocaleString()}
                {detailTicket.updated_at !== detailTicket.created_at && (
                  <> · Updated {new Date(detailTicket.updated_at).toLocaleString()}</>
                )}
              </p>
              <div className="bg-slate-50 rounded-lg p-3 text-slate-700 whitespace-pre-wrap">
                {detailTicket.description}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
