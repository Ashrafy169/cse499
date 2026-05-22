"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Wifi,
  Calendar,
  Mail,
  MapPin,
  Phone,
  Router,
  Network,
  CreditCard,
  FileText,
  ArrowRight,
  Activity,
  CheckCircle2,
  AlertCircle,
  Ban,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { getMyAccount, getMyInvoices } from "@/lib/api";
import { Customer, InvoiceListResponse } from "@/types";

const STATUS_CONFIG = {
  active: {
    label: "Active",
    icon: <CheckCircle2 size={14} />,
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    glow: "shadow-emerald-100",
  },
  suspended: {
    label: "Suspended",
    icon: <AlertCircle size={14} />,
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    glow: "shadow-amber-100",
  },
  inactive: {
    label: "Inactive",
    icon: <Ban size={14} />,
    badge: "bg-slate-100 text-slate-500 border-slate-200",
    dot: "bg-slate-400",
    glow: "",
  },
};

function getBillingCycle(billingStart: string | undefined) {
  const now = new Date();
  const start = billingStart ? new Date(billingStart) : null;
  if (!start) return null;

  const cycleStart = new Date(now.getFullYear(), now.getMonth(), start.getDate());
  if (cycleStart > now) cycleStart.setMonth(cycleStart.getMonth() - 1);
  const cycleEnd = new Date(cycleStart);
  cycleEnd.setMonth(cycleEnd.getMonth() + 1);
  cycleEnd.setDate(cycleEnd.getDate() - 1);
  const nextDue = new Date(cycleEnd);
  nextDue.setDate(nextDue.getDate() + 1);

  const daysLeft = Math.ceil((cycleEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return {
    start: cycleStart.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
    end: cycleEnd.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
    nextDue: nextDue.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
    daysLeft: Math.max(0, daysLeft),
    progress: Math.round(((31 - daysLeft) / 31) * 100),
  };
}

export default function PortalPage() {
  const { user } = useAuth();

  const { data: customer, isLoading } = useQuery<Customer>({
    queryKey: ["my-account"],
    queryFn: () => getMyAccount().then((r) => r.data),
    enabled: !!user,
  });

  const { data: invoiceData } = useQuery<InvoiceListResponse>({
    queryKey: ["my-invoices", 1],
    queryFn: () => getMyInvoices({ page: 1, limit: 5 }).then((r) => r.data),
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-9 h-9 border-2 border-[#C41230] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-24 text-slate-400">
        No account found. Please contact support.
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[customer.status] ?? STATUS_CONFIG.inactive;
  const billing = getBillingCycle(customer.billing_start);
  const unpaidCount = invoiceData?.items.filter((i) => i.status !== "paid").length ?? 0;
  const latestInvoice = invoiceData?.items[0];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* ── Hero Header ───────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-7 text-white shadow-xl">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_#C41230_0%,_transparent_70%)]" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-slate-400 text-sm">Welcome back</p>
            <h1 className="text-2xl font-bold mt-0.5">{customer.full_name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className={`w-2 h-2 rounded-full ${statusCfg.dot} animate-pulse`} />
              <Badge className={`${statusCfg.badge} border text-xs flex items-center gap-1`}>
                {statusCfg.icon}
                {statusCfg.label}
              </Badge>
              <span className="text-slate-400 text-xs">· Member since {new Date(customer.created_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}</span>
            </div>
          </div>
          {unpaidCount > 0 && (
            <Link href="/portal/payment">
              <Button className="bg-[#C41230] hover:bg-[#a30f28] text-white shrink-0 flex items-center gap-2">
                <CreditCard size={16} />
                Pay {unpaidCount} Due Invoice{unpaidCount > 1 ? "s" : ""}
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* ── Stats Row ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Speed"
          value={customer.plan ? `${customer.plan.speed_mbps} Mbps` : "—"}
          icon={<Activity size={18} />}
          accent="text-[#C41230]"
          bg="bg-red-50"
        />
        <StatCard
          label="Monthly Bill"
          value={customer.plan ? `৳ ${Number(customer.plan.price_monthly).toLocaleString()}` : "—"}
          icon={<CreditCard size={18} />}
          accent="text-indigo-600"
          bg="bg-indigo-50"
        />
        <StatCard
          label="Days Remaining"
          value={billing ? `${billing.daysLeft} days` : "—"}
          icon={<Calendar size={18} />}
          accent="text-emerald-600"
          bg="bg-emerald-50"
        />
        <StatCard
          label="Invoices Due"
          value={unpaidCount === 0 ? "All clear" : `${unpaidCount} unpaid`}
          icon={<FileText size={18} />}
          accent={unpaidCount > 0 ? "text-amber-600" : "text-emerald-600"}
          bg={unpaidCount > 0 ? "bg-amber-50" : "bg-emerald-50"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Left Column ──────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Current Plan */}
          <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-slate-200">
            <div className="h-1 bg-gradient-to-r from-[#C41230] to-rose-400" />
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Wifi size={16} className="text-[#C41230]" />
                  Current Plan
                </span>
                <Link href="/portal/plan-change">
                  <Button variant="outline" size="sm" className="text-xs h-7 gap-1">
                    Change Plan <ArrowRight size={11} />
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {customer.plan ? (
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-xl font-bold text-slate-800">{customer.plan.name}</p>
                    <p className="text-slate-500 text-sm">{customer.plan.description}</p>
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Wifi size={14} className="text-[#C41230]" />
                        <span>{customer.plan.speed_mbps} Mbps download</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-3xl font-bold text-[#C41230]">
                      ৳{Number(customer.plan.price_monthly).toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-400">per month</p>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 text-sm">No plan assigned. Contact support.</p>
              )}
            </CardContent>
          </Card>

          {/* Billing Cycle */}
          <Card className="border-0 shadow-sm ring-1 ring-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar size={16} className="text-indigo-500" />
                Billing Cycle
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {billing ? (
                <>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="bg-slate-50 rounded-lg px-3 py-3 text-center">
                      <p className="text-xs text-slate-400 mb-1">Start</p>
                      <p className="font-semibold text-slate-700">{billing.start}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg px-3 py-3 text-center">
                      <p className="text-xs text-slate-400 mb-1">End</p>
                      <p className="font-semibold text-slate-700">{billing.end}</p>
                    </div>
                    <div className="bg-red-50 rounded-lg px-3 py-3 text-center border border-red-100">
                      <p className="text-xs text-red-400 mb-1">Next Due</p>
                      <p className="font-semibold text-[#C41230]">{billing.nextDue}</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                      <span>Cycle progress</span>
                      <span>{billing.daysLeft} days left</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#C41230] to-rose-400 rounded-full transition-all"
                        style={{ width: `${billing.progress}%` }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-slate-400 text-sm">Billing cycle not configured.</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Invoice */}
          {latestInvoice && (
            <Card className="border-0 shadow-sm ring-1 ring-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText size={16} className="text-slate-500" />
                    Latest Invoice
                  </span>
                  <Link href="/portal/invoices">
                    <Button variant="ghost" size="sm" className="text-xs h-7 text-[#C41230] hover:text-[#a30f28]">
                      View all <ArrowRight size={11} />
                    </Button>
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800">{latestInvoice.billing_month}</p>
                    <p className="text-sm text-slate-500">{latestInvoice.plan?.name ?? "—"}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Due {new Date(latestInvoice.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      className={
                        latestInvoice.status === "paid"
                          ? "bg-green-100 text-green-700 border-green-200"
                          : latestInvoice.status === "overdue"
                          ? "bg-red-100 text-red-700 border-red-200"
                          : "bg-yellow-100 text-yellow-700 border-yellow-200"
                      }
                    >
                      {latestInvoice.status}
                    </Badge>
                    <span className="text-lg font-bold text-slate-800">
                      ৳{Number(latestInvoice.amount).toLocaleString()}
                    </span>
                    {latestInvoice.status !== "paid" && (
                      <Link href="/portal/payment">
                        <Button size="sm" className="bg-[#C41230] hover:bg-[#a30f28] text-white h-8 text-xs">
                          Pay Now
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Right Column ─────────────────────────────── */}
        <div className="space-y-5">
          {/* Contact Info */}
          <Card className="border-0 shadow-sm ring-1 ring-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Mail size={16} className="text-slate-400" />
                Contact Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow icon={<Mail size={14} />} value={customer.email} />
              <InfoRow icon={<Phone size={14} />} value={customer.phone} />
              {customer.address && (
                <InfoRow icon={<MapPin size={14} />} value={customer.address} />
              )}
            </CardContent>
          </Card>

          {/* Connection Info */}
          <Card className="border-0 shadow-sm ring-1 ring-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Network size={16} className="text-slate-400" />
                Connection Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ConnectionRow label="IP Address" value={customer.ip_address} icon={<Network size={13} />} mono />
              <ConnectionRow label="Router" value={customer.router_model} icon={<Router size={13} />} />
              <ConnectionRow label="Type" value={customer.connection_type} icon={<Wifi size={13} />} />
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-0 shadow-sm ring-1 ring-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/portal/payment" className="block">
                <div className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-red-50 hover:border-red-200 border border-transparent transition-all cursor-pointer group">
                  <div className="flex items-center gap-2 text-slate-700 group-hover:text-[#C41230]">
                    <CreditCard size={15} />
                    <span className="text-sm font-medium">Pay Invoice</span>
                  </div>
                  <ArrowRight size={14} className="text-slate-400 group-hover:text-[#C41230]" />
                </div>
              </Link>
              <Link href="/portal/plan-change" className="block">
                <div className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all cursor-pointer group">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Wifi size={15} />
                    <span className="text-sm font-medium">Change Plan</span>
                  </div>
                  <ArrowRight size={14} className="text-slate-400" />
                </div>
              </Link>
              <Link href="/portal/invoices" className="block">
                <div className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all cursor-pointer group">
                  <div className="flex items-center gap-2 text-slate-700">
                    <FileText size={15} />
                    <span className="text-sm font-medium">Invoice History</span>
                  </div>
                  <ArrowRight size={14} className="text-slate-400" />
                </div>
              </Link>
              <Link href="/portal/tickets" className="block">
                <div className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all cursor-pointer group">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Activity size={15} />
                    <span className="text-sm font-medium">Support Tickets</span>
                  </div>
                  <ArrowRight size={14} className="text-slate-400" />
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
  bg,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: string;
  bg: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-4 flex items-start gap-3">
      <div className={`${bg} ${accent} rounded-lg p-2 shrink-0`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400 leading-none mb-1">{label}</p>
        <p className="text-sm font-bold text-slate-800 truncate">{value}</p>
      </div>
    </div>
  );
}

function InfoRow({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-start gap-2 text-slate-600">
      <span className="text-slate-400 mt-0.5 shrink-0">{icon}</span>
      <span className="break-all">{value}</span>
    </div>
  );
}

function ConnectionRow({
  label,
  value,
  icon,
  mono,
}: {
  label: string;
  value?: string;
  icon: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}
        <span>{label}</span>
      </div>
      <span className={`${mono ? "font-mono" : "font-medium"} text-slate-700 text-xs`}>
        {value ?? "—"}
      </span>
    </div>
  );
}
