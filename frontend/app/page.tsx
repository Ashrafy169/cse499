"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Users,
  UserCheck,
  TrendingUp,
  AlertTriangle,
  BadgeDollarSign,
  UserPlus,
  CreditCard,
  FileText,
  Download,
  RefreshCw,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getReportSummary,
  getRevenueTrend,
  getCustomerGrowth,
  getPlanDistribution,
  getPaymentMethods,
  getActivity,
  downloadReportCsv,
} from "@/lib/api";
import {
  DashboardSummary,
  RevenueTrendPoint,
  CustomerGrowthPoint,
  PlanDistributionPoint,
  PaymentMethodPoint,
  ActivityEvent,
} from "@/types";
import { toast } from "sonner";
import { useState } from "react";

const PLAN_COLORS = ["#C41230", "#1e40af", "#065f46", "#92400e", "#6b21a8"];
const METHOD_COLORS: Record<string, string> = {
  bkash: "#e91e8c",
  nagad: "#f97316",
  card: "#3b82f6",
};

const ACTIVITY_ICONS: Record<ActivityEvent["type"], React.ReactNode> = {
  new_customer: <UserPlus size={15} className="text-emerald-500" />,
  payment_received: <CreditCard size={15} className="text-blue-500" />,
  invoice_generated: <FileText size={15} className="text-violet-500" />,
};

const ACTIVITY_BADGE: Record<ActivityEvent["type"], string> = {
  new_customer: "bg-emerald-100 text-emerald-700",
  payment_received: "bg-blue-100 text-blue-700",
  invoice_generated: "bg-violet-100 text-violet-700",
};

const ACTIVITY_LABEL: Record<ActivityEvent["type"], string> = {
  new_customer: "Customer",
  payment_received: "Payment",
  invoice_generated: "Invoice",
};

function fmt(n: number) {
  return `৳${n.toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;
}

function monthLabel(ym: string) {
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1).toLocaleString("default", {
    month: "short",
    year: "2-digit",
  });
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded-lg ${className}`} />;
}

function SummaryCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <Card className="border-0 shadow-sm ring-1 ring-slate-200">
      <CardContent className="pt-5 pb-4 px-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${accent}`}>{value}</p>
            {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
          </div>
          <div className="p-3 rounded-xl bg-slate-50">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function RevenueTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow text-sm">
      <p className="font-semibold text-slate-700">{label}</p>
      <p className="text-[#C41230]">{fmt(payload[0].value)}</p>
    </div>
  );
}

function GrowthTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow text-sm">
      <p className="font-semibold text-slate-700">{label}</p>
      <p className="text-indigo-600">{payload[0].value} new customers</p>
    </div>
  );
}

export default function DashboardPage() {
  const [exporting, setExporting] = useState(false);

  const { data: summary, isLoading: summaryLoading } = useQuery<DashboardSummary>({
    queryKey: ["report-summary"],
    queryFn: () => getReportSummary().then((r) => r.data),
  });

  const { data: revenueTrend = [], isLoading: revenueLoading } = useQuery<RevenueTrendPoint[]>({
    queryKey: ["revenue-trend"],
    queryFn: () => getRevenueTrend(6).then((r) => r.data),
  });

  const { data: customerGrowth = [], isLoading: growthLoading } = useQuery<CustomerGrowthPoint[]>({
    queryKey: ["customer-growth"],
    queryFn: () => getCustomerGrowth(6).then((r) => r.data),
  });

  const { data: planDist = [] } = useQuery<PlanDistributionPoint[]>({
    queryKey: ["plan-distribution"],
    queryFn: () => getPlanDistribution().then((r) => r.data),
  });

  const { data: paymentMethods = [] } = useQuery<PaymentMethodPoint[]>({
    queryKey: ["payment-methods"],
    queryFn: () => getPaymentMethods().then((r) => r.data),
  });

  const { data: activity = [], isLoading: activityLoading } = useQuery<ActivityEvent[]>({
    queryKey: ["activity-feed"],
    queryFn: () => getActivity(10).then((r) => r.data),
  });

  const revenueFmt = revenueTrend.map((d) => ({ ...d, month: monthLabel(d.month) }));
  const growthFmt = customerGrowth.map((d) => ({ ...d, month: monthLabel(d.month) }));

  async function handleExportCsv() {
    setExporting(true);
    try {
      await downloadReportCsv();
      toast.success("CSV exported successfully");
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Dashboard & Reports</h2>
          <p className="text-slate-500 text-sm mt-1">Business overview and analytics</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2"
          onClick={handleExportCsv}
          disabled={exporting}
        >
          {exporting ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : (
            <Download size={14} />
          )}
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {summaryLoading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28" />)
        ) : (
          <>
            <SummaryCard
              label="Total Customers"
              value={summary?.total_customers ?? 0}
              icon={<Users size={20} className="text-slate-500" />}
              accent="text-slate-800"
            />
            <SummaryCard
              label="Active Customers"
              value={summary?.active_customers ?? 0}
              sub={`${
                summary
                  ? Math.round(
                      (summary.active_customers / Math.max(summary.total_customers, 1)) * 100
                    )
                  : 0
              }% of total`}
              icon={<UserCheck size={20} className="text-emerald-500" />}
              accent="text-emerald-600"
            />
            <SummaryCard
              label="Revenue This Month"
              value={fmt(summary?.revenue_this_month ?? 0)}
              icon={<TrendingUp size={20} className="text-[#C41230]" />}
              accent="text-[#C41230]"
            />
            <SummaryCard
              label="Overdue Invoices"
              value={summary?.overdue_count ?? 0}
              icon={<AlertTriangle size={20} className="text-amber-500" />}
              accent="text-amber-600"
            />
            <SummaryCard
              label="Total Dues"
              value={fmt(summary?.total_dues ?? 0)}
              sub="unpaid + overdue"
              icon={<BadgeDollarSign size={20} className="text-rose-500" />}
              accent="text-rose-600"
            />
          </>
        )}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Trend */}
        <Card className="border-0 shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">
              Monthly Revenue (last 6 months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {revenueLoading ? (
              <Skeleton className="h-52" />
            ) : revenueFmt.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-slate-400 text-sm">
                No data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={revenueFmt} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<RevenueTooltip />} />
                  <Bar dataKey="revenue" fill="#C41230" radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Customer Growth */}
        <Card className="border-0 shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">
              Customer Growth (last 6 months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {growthLoading ? (
              <Skeleton className="h-52" />
            ) : growthFmt.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-slate-400 text-sm">
                No data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <LineChart data={growthFmt} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<GrowthTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="new_customers"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#6366f1", strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Plan Distribution */}
        <Card className="border-0 shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Plan Distribution</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center gap-6">
            {planDist.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-slate-400 text-sm w-full">
                No data yet
              </div>
            ) : (
              <>
                <ResponsiveContainer width="55%" height={200}>
                  <PieChart>
                    <Pie
                      data={planDist}
                      dataKey="count"
                      nameKey="plan"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      strokeWidth={2}
                    >
                      {planDist.map((_, i) => (
                        <Cell key={i} fill={PLAN_COLORS[i % PLAN_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v} customers`, ""]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 min-w-[110px]">
                  {planDist.map((d, i) => (
                    <div key={d.plan} className="flex items-center gap-2 text-sm">
                      <span
                        className="w-3 h-3 rounded-sm shrink-0"
                        style={{ background: PLAN_COLORS[i % PLAN_COLORS.length] }}
                      />
                      <span className="text-slate-600 truncate">{d.plan}</span>
                      <span className="ml-auto font-semibold text-slate-800">{d.count}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Payment Method Donut */}
        <Card className="border-0 shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">
              Payment Method Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center gap-6">
            {paymentMethods.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-slate-400 text-sm w-full">
                No payments yet
              </div>
            ) : (
              <>
                <ResponsiveContainer width="55%" height={200}>
                  <PieChart>
                    <Pie
                      data={paymentMethods}
                      dataKey="count"
                      nameKey="method"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={36}
                      strokeWidth={2}
                    >
                      {paymentMethods.map((d) => (
                        <Cell
                          key={d.method}
                          fill={METHOD_COLORS[d.method] ?? "#64748b"}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v, _name, props) => [
                        `${v} payments · ${fmt((props.payload as PaymentMethodPoint).total)}`,
                        "",
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3 min-w-[130px]">
                  {paymentMethods.map((d) => (
                    <div key={d.method} className="space-y-0.5">
                      <div className="flex items-center gap-2 text-sm">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ background: METHOD_COLORS[d.method] ?? "#64748b" }}
                        />
                        <span className="capitalize font-medium text-slate-700">{d.method}</span>
                      </div>
                      <p className="text-xs text-slate-400 pl-5">
                        {d.count} txn · {fmt(d.total)}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed */}
      <Card className="border-0 shadow-sm ring-1 ring-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0 divide-y divide-slate-100">
          {activityLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="py-3 flex items-center gap-3">
                <Skeleton className="w-7 h-7 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-2.5 w-1/4" />
                </div>
              </div>
            ))
          ) : activity.length === 0 ? (
            <p className="py-8 text-center text-slate-400 text-sm">No recent activity</p>
          ) : (
            activity.map((event, i) => (
              <div key={i} className="py-3 flex items-start gap-3">
                <div className="mt-0.5 w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  {ACTIVITY_ICONS[event.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 truncate">{event.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(event.timestamp).toLocaleString()}
                  </p>
                </div>
                <Badge className={`${ACTIVITY_BADGE[event.type]} border-0 text-[11px] shrink-0`}>
                  {ACTIVITY_LABEL[event.type]}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
