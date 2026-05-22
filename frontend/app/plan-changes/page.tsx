"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getPlanChanges, reviewPlanChange } from "@/lib/api";
import { PlanChangeListResponse, PlanChangeRequest, PlanChangeStatus } from "@/types";

const STATUS_BADGE: Record<PlanChangeStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  approved: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
};

const STATUS_ICONS: Record<PlanChangeStatus, React.ReactNode> = {
  pending: <Clock size={13} />,
  approved: <CheckCircle2 size={13} />,
  rejected: <XCircle size={13} />,
};

export default function PlanChangesAdminPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [reviewing, setReviewing] = useState<PlanChangeRequest | null>(null);
  const [decision, setDecision] = useState<"approved" | "rejected">("approved");
  const [staffNote, setStaffNote] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<PlanChangeListResponse>({
    queryKey: ["plan-changes", statusFilter],
    queryFn: () =>
      getPlanChanges(
        statusFilter !== "all" ? { status_filter: statusFilter } : undefined
      ).then((r) => r.data),
  });

  const mutation = useMutation({
    mutationFn: ({ id, status, staff_note }: { id: string; status: string; staff_note?: string }) =>
      reviewPlanChange(id, { status, staff_note }),
    onSuccess: () => {
      toast.success("Request reviewed successfully");
      queryClient.invalidateQueries({ queryKey: ["plan-changes"] });
      setReviewing(null);
      setStaffNote("");
    },
    onError: () => toast.error("Failed to review request"),
  });

  const summary = {
    pending: data?.items.filter((i) => i.status === "pending").length ?? 0,
    approved: data?.items.filter((i) => i.status === "approved").length ?? 0,
    rejected: data?.items.filter((i) => i.status === "rejected").length ?? 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Plan Change Requests</h2>
          <p className="text-slate-500 mt-1 text-sm">Review and approve customer plan upgrade/downgrade requests</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard label="Pending" count={summary.pending} color="text-yellow-600" bg="bg-yellow-50" />
        <SummaryCard label="Approved" count={summary.approved} color="text-green-600" bg="bg-green-50" />
        <SummaryCard label="Rejected" count={summary.rejected} color="text-red-600" bg="bg-red-50" />
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-500">Filter:</span>
        {(["all", "pending", "approved", "rejected"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
              statusFilter === s
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm ring-1 ring-slate-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Customer</TableHead>
              <TableHead>Change</TableHead>
              <TableHead>Price Diff</TableHead>
              <TableHead>Note</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <div className="w-6 h-6 border-2 border-[#C41230] border-t-transparent rounded-full animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-slate-400">
                  No requests found
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map((req) => {
                const priceDiff =
                  (req.requested_plan?.price_monthly ?? 0) -
                  (req.current_plan?.price_monthly ?? 0);
                const isUpgrade = priceDiff > 0;

                return (
                  <TableRow key={req.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium text-slate-800">
                      {req.customer_id.slice(0, 8)}…
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm">
                        <span className="text-slate-500">{req.current_plan?.name ?? "—"}</span>
                        <ChevronRight size={12} className="text-slate-300" />
                        <span className="font-medium text-slate-800">
                          {req.requested_plan?.name ?? "—"}
                        </span>
                        {req.current_plan && req.requested_plan && (
                          <span>
                            {isUpgrade ? (
                              <ArrowUpCircle size={13} className="text-green-500" />
                            ) : (
                              <ArrowDownCircle size={13} className="text-blue-500" />
                            )}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-sm font-semibold ${
                          priceDiff > 0 ? "text-green-600" : priceDiff < 0 ? "text-blue-600" : "text-slate-400"
                        }`}
                      >
                        {priceDiff > 0 ? "+" : ""}
                        {priceDiff !== 0 ? `৳${Math.abs(priceDiff).toLocaleString()}` : "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm max-w-[160px] truncate">
                      {req.note ?? <span className="text-slate-300">—</span>}
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {new Date(req.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${STATUS_BADGE[req.status]} border flex items-center gap-1 w-fit`}>
                        {STATUS_ICONS[req.status]}
                        {req.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {req.status === "pending" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => {
                            setReviewing(req);
                            setDecision("approved");
                            setStaffNote("");
                          }}
                        >
                          Review
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-400">
                          {req.staff_note ? `"${req.staff_note.slice(0, 20)}…"` : "Done"}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!reviewing} onOpenChange={(o) => !o && setReviewing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review Plan Change Request</DialogTitle>
          </DialogHeader>
          {reviewing && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-slate-50 rounded-lg px-4 py-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">From</span>
                  <span className="font-medium">{reviewing.current_plan?.name ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">To</span>
                  <span className="font-medium text-[#C41230]">
                    {reviewing.requested_plan?.name ?? "—"}
                  </span>
                </div>
                {reviewing.note && (
                  <div className="pt-1 border-t border-slate-200">
                    <span className="text-slate-400">Customer note: </span>
                    <span className="italic text-slate-600">"{reviewing.note}"</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Decision</Label>
                <Select
                  value={decision}
                  onValueChange={(v) => setDecision(v as "approved" | "rejected")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">
                      <span className="flex items-center gap-2 text-green-700">
                        <CheckCircle2 size={14} /> Approve
                      </span>
                    </SelectItem>
                    <SelectItem value="rejected">
                      <span className="flex items-center gap-2 text-red-700">
                        <XCircle size={14} /> Reject
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Staff Note (optional)</Label>
                <Textarea
                  placeholder="Reason for decision…"
                  value={staffNote}
                  onChange={(e) => setStaffNote(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setReviewing(null)}
                >
                  Cancel
                </Button>
                <Button
                  className={`flex-1 text-white ${
                    decision === "approved"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-[#C41230] hover:bg-[#a30f28]"
                  }`}
                  disabled={mutation.isPending}
                  onClick={() =>
                    mutation.mutate({
                      id: reviewing.id,
                      status: decision,
                      staff_note: staffNote || undefined,
                    })
                  }
                >
                  {mutation.isPending ? "Saving…" : decision === "approved" ? "Approve" : "Reject"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({
  label,
  count,
  color,
  bg,
}: {
  label: string;
  count: number;
  color: string;
  bg: string;
}) {
  return (
    <div className={`${bg} rounded-xl px-5 py-4 border border-transparent`}>
      <p className={`text-3xl font-bold ${color}`}>{count}</p>
      <p className="text-slate-500 text-sm mt-0.5">{label}</p>
    </div>
  );
}
