"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getMyInvoices, downloadInvoicePdf } from "@/lib/api";
import { Invoice, InvoiceListResponse, InvoiceStatus } from "@/types";

const STATUS_BADGE: Record<InvoiceStatus, string> = {
  paid: "bg-green-100 text-green-700",
  unpaid: "bg-yellow-100 text-yellow-700",
  overdue: "bg-red-100 text-[#C41230]",
};

export default function PortalInvoicesPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<InvoiceListResponse>({
    queryKey: ["my-invoices", page],
    queryFn: () => getMyInvoices({ page, limit: 10 }).then((r) => r.data),
  });

  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 10);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#C41230] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Invoice History</h2>
        <p className="text-sm text-slate-500 mt-0.5">{total} invoice(s) total</p>
      </div>

      <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Billing Month</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">PDF</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-400 py-10">
                  No invoices yet
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map((inv) => <InvoiceRow key={inv.id} invoice={inv} />)
            )}
          </TableBody>
        </Table>
      </div>

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

function InvoiceRow({ invoice }: { invoice: Invoice }) {
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
      <TableCell className="font-medium text-slate-800">{invoice.billing_month}</TableCell>
      <TableCell className="text-slate-600">{invoice.plan?.name ?? "—"}</TableCell>
      <TableCell className="font-semibold text-slate-800">
        BDT {Number(invoice.amount).toLocaleString()}
      </TableCell>
      <TableCell className="text-slate-600">
        {new Date(invoice.due_date).toLocaleDateString()}
      </TableCell>
      <TableCell>
        <Badge className={STATUS_BADGE[invoice.status]}>{invoice.status}</Badge>
      </TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="sm" onClick={handleDownload} disabled={downloading}>
          <Download size={14} className="mr-1" />
          PDF
        </Button>
      </TableCell>
    </TableRow>
  );
}
