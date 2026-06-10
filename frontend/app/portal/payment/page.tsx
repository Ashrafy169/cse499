"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2,
  CreditCard,
  Smartphone,
  Wallet,
  ChevronRight,
  AlertCircle,
  Lock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMyInvoices, submitPayment } from "@/lib/api";
import { Invoice, InvoiceListResponse, InvoiceStatus, PaymentMethod } from "@/types";

const STATUS_BADGE: Record<InvoiceStatus, string> = {
  paid: "bg-green-100 text-green-700 border-green-200",
  unpaid: "bg-yellow-100 text-yellow-700 border-yellow-200",
  overdue: "bg-red-100 text-red-700 border-red-200",
};

const METHODS: { id: PaymentMethod; label: string; icon: React.ReactNode; color: string; bg: string; hint: string }[] = [
  {
    id: "bkash",
    label: "bKash",
    icon: <Smartphone size={20} />,
    color: "text-pink-600",
    bg: "bg-pink-50 border-pink-200 hover:border-pink-400",
    hint: "Enter your bKash account number",
  },
  {
    id: "nagad",
    label: "Nagad",
    icon: <Wallet size={20} />,
    color: "text-orange-500",
    bg: "bg-orange-50 border-orange-200 hover:border-orange-400",
    hint: "Enter your Nagad account number",
  },
  {
    id: "card",
    label: "Card",
    icon: <CreditCard size={20} />,
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200 hover:border-blue-400",
    hint: "Enter your 16-digit card number",
  },
];

type Step = "select-invoice" | "select-method" | "enter-details" | "success";

export default function PaymentPage() {
  const [step, setStep] = useState<Step>("select-invoice");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [accountInput, setAccountInput] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [successRef, setSuccessRef] = useState("");
  const [successPaid, setSuccessPaid] = useState<number>(0);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<InvoiceListResponse>({
    queryKey: ["my-invoices-payment"],
    queryFn: () => getMyInvoices({ page: 1, limit: 50 }).then((r) => r.data),
  });

  const unpaidInvoices = data?.items.filter((i) => i.status !== "paid") ?? [];

  const mutation = useMutation({
    mutationFn: (payload: { invoice_id: string; method: PaymentMethod; transaction_ref: string; amount?: number }) =>
      submitPayment(payload),
    onSuccess: (res) => {
      setSuccessRef(res.data.transaction_ref);
      setSuccessPaid(res.data.amount);
      setStep("success");
      queryClient.invalidateQueries({ queryKey: ["my-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["my-invoices-payment"] });
      queryClient.invalidateQueries({ queryKey: ["my-payments"] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Payment failed. Please try again.";
      toast.error(msg);
    },
  });

  function remainingBalance(inv: Invoice): number {
    return Number(inv.amount) - Number(inv.amount_paid ?? 0);
  }

  function handlePay() {
    if (!selectedInvoice || !selectedMethod || !accountInput.trim()) return;
    const ref = `${selectedMethod.toUpperCase()}-${Date.now()}-${accountInput.slice(-4)}`;
    const amount = payAmount ? parseFloat(payAmount) : undefined;
    mutation.mutate({ invoice_id: selectedInvoice.id, method: selectedMethod, transaction_ref: ref, amount });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#C41230] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Success Screen ──────────────────────────────────────────────────────────
  if (step === "success") {
    return (
      <div className="max-w-lg mx-auto pt-8">
        <Card className="border-green-200 bg-green-50 shadow-lg">
          <CardContent className="flex flex-col items-center gap-4 pt-10 pb-10 text-center">
            <div className="rounded-full bg-green-100 p-5">
              <CheckCircle2 size={48} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-800">Payment Successful!</h2>
            <p className="text-green-700">
              Your invoice for{" "}
              <span className="font-semibold">{selectedInvoice?.billing_month}</span> has been
              marked as paid.
            </p>
            <div className="w-full rounded-lg bg-white border border-green-200 px-5 py-4 text-left space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Paid</span>
                <span className="font-semibold text-slate-800">
                  ৳ {Number(successPaid || selectedInvoice?.amount).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Method</span>
                <span className="font-semibold text-slate-800 capitalize">{selectedMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction Ref</span>
                <span className="font-mono font-semibold text-slate-800">{successRef}</span>
              </div>
            </div>
            <Button
              className="mt-2 bg-[#C41230] hover:bg-[#a30f28] text-white"
              onClick={() => {
                setStep("select-invoice");
                setSelectedInvoice(null);
                setSelectedMethod(null);
                setAccountInput("");
                setPayAmount("");
                setSuccessPaid(0);
              }}
            >
              Pay Another Invoice
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Online Payment</h2>
        <p className="text-slate-500 mt-1">Pay your invoices instantly — no waiting in line</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 text-sm">
        {(["select-invoice", "select-method", "enter-details"] as Step[]).map((s, i) => {
          const labels = ["1. Invoice", "2. Method", "3. Pay"];
          const active = step === s;
          const done =
            (s === "select-invoice" && (step === "select-method" || step === "enter-details")) ||
            (s === "select-method" && step === "enter-details");
          return (
            <div key={s} className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full font-medium transition-colors ${
                  active
                    ? "bg-[#C41230] text-white"
                    : done
                    ? "bg-green-100 text-green-700"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                {labels[i]}
              </span>
              {i < 2 && <ChevronRight size={14} className="text-slate-300" />}
            </div>
          );
        })}
      </div>

      {/* Step 1 — Select Invoice */}
      {step === "select-invoice" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select an Invoice to Pay</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {unpaidInvoices.length === 0 ? (
              <div className="flex items-center gap-2 text-slate-500 py-6 justify-center">
                <CheckCircle2 size={18} className="text-green-500" />
                <span>All invoices are paid. You're all set!</span>
              </div>
            ) : (
              unpaidInvoices.map((inv) => (
                <button
                  key={inv.id}
                  onClick={() => {
                    setSelectedInvoice(inv);
                    setPayAmount("");
                    setStep("select-method");
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-slate-200 hover:border-[#C41230] hover:bg-red-50 transition-all text-left"
                >
                  <div>
                    <p className="font-semibold text-slate-800">{inv.billing_month}</p>
                    <p className="text-sm text-slate-500">{inv.plan?.name ?? inv.description ?? "—"}</p>
                    {Number(inv.amount_paid ?? 0) > 0 && (
                      <p className="text-xs text-orange-500 mt-0.5">
                        Paid: ৳ {Number(inv.amount_paid).toLocaleString()} · Balance: ৳ {remainingBalance(inv).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={STATUS_BADGE[inv.status]}>{inv.status}</Badge>
                    <span className="font-bold text-slate-800">
                      ৳ {Number(inv.amount).toLocaleString()}
                    </span>
                    <ChevronRight size={16} className="text-slate-400" />
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2 — Select Payment Method */}
      {step === "select-method" && selectedInvoice && (
        <div className="space-y-4">
          {/* Invoice Summary */}
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Paying for</p>
              <p className="font-semibold text-slate-800">{selectedInvoice.billing_month}</p>
            </div>
            <p className="text-xl font-bold text-[#C41230]">
              ৳ {Number(selectedInvoice.amount).toLocaleString()}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Choose Payment Method</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3">
              {METHODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setSelectedMethod(m.id);
                    setStep("enter-details");
                  }}
                  className={`flex flex-col items-center gap-2 px-4 py-5 rounded-xl border-2 transition-all ${m.bg}`}
                >
                  <span className={m.color}>{m.icon}</span>
                  <span className={`font-semibold text-sm ${m.color}`}>{m.label}</span>
                </button>
              ))}
            </CardContent>
          </Card>

          <Button variant="outline" size="sm" onClick={() => setStep("select-invoice")}>
            ← Back
          </Button>
        </div>
      )}

      {/* Step 3 — Enter Details & Confirm */}
      {step === "enter-details" && selectedInvoice && selectedMethod && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">
                {METHODS.find((m) => m.id === selectedMethod)?.label} Payment
              </p>
              <p className="font-semibold text-slate-800">{selectedInvoice.billing_month}</p>
            </div>
            <p className="text-xl font-bold text-[#C41230]">
              ৳ {Number(selectedInvoice.amount).toLocaleString()}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lock size={15} className="text-slate-400" />
                Enter Account Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>
                  {METHODS.find((m) => m.id === selectedMethod)?.hint}
                </Label>
                <Input
                  placeholder={
                    selectedMethod === "card" ? "•••• •••• •••• ••••" : "01XXXXXXXXX"
                  }
                  value={accountInput}
                  onChange={(e) => setAccountInput(e.target.value)}
                  maxLength={selectedMethod === "card" ? 16 : 11}
                  inputMode="numeric"
                />
              </div>

              <div className="space-y-1.5">
                <Label>
                  Amount to Pay (BDT) —{" "}
                  <span className="text-slate-400 font-normal">
                    Balance: ৳ {remainingBalance(selectedInvoice).toLocaleString()}
                  </span>
                </Label>
                <Input
                  type="number"
                  min="1"
                  max={remainingBalance(selectedInvoice)}
                  placeholder={`Full balance: ${remainingBalance(selectedInvoice)}`}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                />
                <p className="text-xs text-slate-400">Leave blank to pay full balance</p>
              </div>

              {selectedMethod !== "card" && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 flex gap-2 text-sm text-amber-700">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>
                    A payment request will be sent to your {selectedMethod === "bkash" ? "bKash" : "Nagad"} account.
                    Please approve it on your mobile.
                  </span>
                </div>
              )}

              {selectedMethod === "card" && (
                <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 flex gap-2 text-sm text-blue-700">
                  <Lock size={16} className="shrink-0 mt-0.5" />
                  <span>Your card details are secured with 256-bit SSL encryption.</span>
                </div>
              )}

              <Button
                className="w-full bg-[#C41230] hover:bg-[#a30f28] text-white h-11 text-base"
                disabled={!accountInput.trim() || mutation.isPending}
                onClick={handlePay}
              >
                {mutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing…
                  </span>
                ) : (
                  `Pay ৳ ${payAmount ? Number(payAmount).toLocaleString() : remainingBalance(selectedInvoice).toLocaleString()}`
                )}
              </Button>
            </CardContent>
          </Card>

          <Button variant="outline" size="sm" onClick={() => setStep("select-method")}>
            ← Back
          </Button>
        </div>
      )}
    </div>
  );
}
