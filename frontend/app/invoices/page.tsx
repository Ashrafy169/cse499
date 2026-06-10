"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, RefreshCw, AlertCircle, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getInvoices,
  updateInvoiceStatus,
  generateInvoices,
  markOverdueInvoices,
  downloadInvoicePdf,
  createCustomInvoice,
  getCustomers,
} from "@/lib/api";
import { Invoice, InvoiceListResponse, InvoiceStatus, Customer, CustomerListResponse } from "@/types";

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
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customForm, setCustomForm] = useState({
    customer_id: "",
    amount: "",
    due_date: "",
    billing_month: new Date().toISOString().slice(0, 7),
    description: "",
  });

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

  const customInvoiceMutation = useMutation({
    mutationFn: (data: typeof customForm) =>
      createCustomInvoice({
        customer_id: data.customer_id,
        amount: parseFloat(data.amount),
        due_date: data.due_date,
        billing_month: data.billing_month,
        description: data.description || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Custom invoice created");
      setShowCustomModal(false);
      setCustomForm({ customer_id: "", amount: "", due_date: "", billing_month: new Date().toISOString().slice(0, 7), description: "" });
    },
    onError: () => toast.error("Failed to create invoice"),
  });

  const { data: customersData } = useQuery<CustomerListResponse>({
    queryKey: ["customers-for-invoice"],
    queryFn: () => getCustomers({ limit: 200 }).then((r) => r.data),
    enabled: showCustomModal,
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
            variant="outline"
            size="sm"
            onClick={() => setShowCustomModal(true)}
          >
            <Plus size={14} className="mr-1" />
            Custom Invoice
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

      {/* Custom Invoice Dialog */}
      <Dialog open={showCustomModal} onOpenChange={setShowCustomModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Custom Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Customer</Label>
              <Select
                value={customForm.customer_id}
                onValueChange={(v) => setCustomForm((f) => ({ ...f, customer_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer…" />
                </SelectTrigger>
                <SelectContent>
                  {customersData?.items.map((c: Customer) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name} — {c.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Amount (BDT)</Label>
              <Input
                type="number"
                min="1"
                placeholder="e.g. 1500"
                value={customForm.amount}
                onChange={(e) => setCustomForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Billing Month</Label>
                <Input
                  type="month"
                  value={customForm.billing_month}
                  onChange={(e) => setCustomForm((f) => ({ ...f, billing_month: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={customForm.due_date}
                  onChange={(e) => setCustomForm((f) => ({ ...f, due_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Input
                placeholder="e.g. Installation fee, Late charge…"
                value={customForm.description}
                onChange={(e) => setCustomForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                className="flex-1 bg-[#C41230] hover:bg-[#a30f28] text-white"
                disabled={
                  !customForm.customer_id ||
                  !customForm.amount ||
                  !customForm.due_date ||
                  customInvoiceMutation.isPending
                }
                onClick={() => customInvoiceMutation.mutate(customForm)}
              >
                {customInvoiceMutation.isPending ? "Creating…" : "Create Invoice"}
              </Button>
              <Button variant="outline" onClick={() => setShowCustomModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
      <TableCell className="text-slate-600">
        {invoice.plan?.name ?? "—"}
        {invoice.is_custom && (
          <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-purple-100 text-purple-700 rounded font-medium">Custom</span>
        )}
        {invoice.description && (
          <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[120px]" title={invoice.description}>{invoice.description}</p>
        )}
      </TableCell>
      <TableCell className="text-slate-600">{invoice.billing_month}</TableCell>
      <TableCell className="font-medium text-slate-800">
        <p>BDT {Number(invoice.amount).toLocaleString()}</p>
        {Number(invoice.amount_paid ?? 0) > 0 && Number(invoice.amount_paid) < Number(invoice.amount) && (
          <p className="text-xs text-orange-500">Paid: {Number(invoice.amount_paid).toLocaleString()} / Bal: {(Number(invoice.amount) - Number(invoice.amount_paid)).toLocaleString()}</p>
        )}
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
