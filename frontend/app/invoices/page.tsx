"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  getInvoices,
  updateInvoiceStatus,
  generateInvoices,
  markOverdueInvoices,
  downloadInvoicePdf,
} from "@/lib/api";
import { Invoice, InvoiceListResponse, InvoiceStatus } from "@/types";

const STATUS_BADGE: Record<InvoiceStatus, string> = {
  paid: "bg-green-100 text-green-700",
  unpaid: "bg-yellow-100 text-yellow-700",
  overdue: "bg-red-100 text-[#C41230]",
};

export default function InvoicesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState("");

  const params: Record<string, unknown> = { page, limit: 10 };
  if (search) params.customer_search = search;
  if (statusFilter !== "all") params.status = statusFilter;
  if (monthFilter) params.billing_month = monthFilter;

  const { data, isLoading } = useQuery<InvoiceListResponse>({
    queryKey: ["invoices", params],
    queryFn: () => getInvoices(params).then((r) => r.data),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateInvoiceStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const generateMutation = useMutation({
    mutationFn: () => generateInvoices(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success(res.data.message);
    },
    onError: () => toast.error("Failed to generate invoices"),
  });

  const overdueMutation = useMutation({
    mutationFn: markOverdueInvoices,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success(res.data.message);
    },
    onError: () => toast.error("Failed to mark overdue"),
  });

  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 10);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Invoices</h2>
          <p className="text-sm text-slate-500 mt-0.5">{total} total invoices</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => overdueMutation.mutate()}
            disabled={overdueMutation.isPending}
          >
            <AlertCircle size={14} className="mr-1" />
            Mark Overdue
          </Button>
          <Button
            size="sm"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            <RefreshCw size={14} className="mr-1" />
            Generate This Month
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Input
          placeholder="Search customer…"
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
            <SelectItem value="unpaid">Unpaid</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="month"
          value={monthFilter}
          onChange={(e) => { setMonthFilter(e.target.value); setPage(1); }}
          className="w-44"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#C41230] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Customer</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Billing Month</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-slate-400 py-10">
                    No invoices found
                  </TableCell>
                </TableRow>
              ) : (
                data?.items.map((inv) => (
                  <InvoiceRow
                    key={inv.id}
                    invoice={inv}
                    onStatusChange={(status) =>
                      statusMutation.mutate({ id: inv.id, status })
                    }
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
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
    </div>
  );
}

function InvoiceRow({
  invoice,
  onStatusChange,
}: {
  invoice: Invoice;
  onStatusChange: (s: string) => void;
}) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadInvoicePdf(invoice.id, invoice.billing_month);
    } catch {
      toast.error("Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <TableRow className="hover:bg-slate-50">
      <TableCell>
        <p className="font-medium text-slate-800">{invoice.customer?.full_name ?? "—"}</p>
        <p className="text-xs text-slate-400">{invoice.customer?.email}</p>
      </TableCell>
      <TableCell className="text-slate-600">{invoice.plan?.name ?? "—"}</TableCell>
      <TableCell className="text-slate-600">{invoice.billing_month}</TableCell>
      <TableCell className="font-medium text-slate-800">
        BDT {Number(invoice.amount).toLocaleString()}
      </TableCell>
      <TableCell className="text-slate-600">
        {new Date(invoice.due_date).toLocaleDateString()}
      </TableCell>
      <TableCell>
        <Badge className={STATUS_BADGE[invoice.status]}>{invoice.status}</Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end items-center gap-2">
          <Select value={invoice.status} onValueChange={(v) => v && onStatusChange(v)}>
            <SelectTrigger className="h-7 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={handleDownload} disabled={downloading}>
            <Download size={14} />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
