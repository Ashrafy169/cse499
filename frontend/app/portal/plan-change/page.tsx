"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2,
  ArrowUpCircle,
  ArrowDownCircle,
  Wifi,
  Clock,
  ChevronRight,
  Minus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getMyAccount, getPlans, submitPlanChange, getMyPlanChanges } from "@/lib/api";
import { Customer, Plan, PlanChangeRequest, PlanChangeStatus } from "@/types";

const STATUS_BADGE: Record<PlanChangeStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  approved: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
};

export default function PlanChangePage() {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const queryClient = useQueryClient();

  const { data: customer, isLoading: customerLoading } = useQuery<Customer>({
    queryKey: ["my-account"],
    queryFn: () => getMyAccount().then((r) => r.data),
  });

  const { data: plansData, isLoading: plansLoading } = useQuery<Plan[]>({
    queryKey: ["plans"],
    queryFn: () => getPlans().then((r) => r.data),
  });

  const { data: myRequests } = useQuery<PlanChangeRequest[]>({
    queryKey: ["my-plan-changes"],
    queryFn: () => getMyPlanChanges().then((r) => r.data),
  });

  const hasPending = myRequests?.some((r) => r.status === "pending");

  const mutation = useMutation({
    mutationFn: (payload: { requested_plan_id: string; note?: string }) =>
      submitPlanChange(payload),
    onSuccess: () => {
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["my-plan-changes"] });
      toast.success("Plan change request submitted!");
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Failed to submit request";
      toast.error(msg);
    },
  });

  const activePlans = (plansData ?? []).filter((p) => p.is_active);
  const currentPlan = customer?.plan;

  function getPlanType(plan: Plan): "upgrade" | "downgrade" | "same" {
    if (!currentPlan) return "upgrade";
    if (plan.id === currentPlan.id) return "same";
    return plan.price_monthly > currentPlan.price_monthly ? "upgrade" : "downgrade";
  }

  if (customerLoading || plansLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#C41230] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto pt-8">
        <Card className="border-green-200 bg-green-50 shadow-lg">
          <CardContent className="flex flex-col items-center gap-4 pt-10 pb-10 text-center">
            <div className="rounded-full bg-green-100 p-5">
              <CheckCircle2 size={48} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-800">Request Submitted!</h2>
            <p className="text-green-700 max-w-xs">
              Your plan change request is under review. Our team will process it within 24 hours.
            </p>
            <Button
              variant="outline"
              className="border-green-300 text-green-700 hover:bg-green-100"
              onClick={() => setSubmitted(false)}
            >
              View Request Status
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Change Your Plan</h2>
        <p className="text-slate-500 mt-1">Upgrade or downgrade your internet subscription</p>
      </div>

      {/* Current Plan Banner */}
      {currentPlan && (
        <div className="flex items-center justify-between bg-slate-900 text-white rounded-xl px-5 py-4">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide">Current Plan</p>
            <p className="text-lg font-bold mt-0.5">{currentPlan.name}</p>
            <p className="text-sm text-slate-400 flex items-center gap-1 mt-0.5">
              <Wifi size={13} /> {currentPlan.speed_mbps} Mbps
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-[#C41230]">
              ৳ {Number(currentPlan.price_monthly).toLocaleString()}
            </p>
            <p className="text-xs text-slate-400">/ month</p>
          </div>
        </div>
      )}

      {/* Pending Warning */}
      {hasPending && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-amber-700 text-sm">
          <Clock size={16} className="shrink-0" />
          <span>You have a pending plan change request. Please wait for it to be reviewed before submitting a new one.</span>
        </div>
      )}

      {/* Plan Grid */}
      {!hasPending && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Available Plans</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {activePlans.map((plan) => {
                const type = getPlanType(plan);
                const isSelected = selectedPlanId === plan.id;
                const isCurrent = type === "same";

                return (
                  <button
                    key={plan.id}
                    disabled={isCurrent}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`relative flex flex-col gap-2 p-4 rounded-xl border-2 text-left transition-all ${
                      isCurrent
                        ? "border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed"
                        : isSelected
                        ? "border-[#C41230] bg-red-50 shadow-sm"
                        : "border-slate-200 hover:border-slate-400 hover:shadow-sm"
                    }`}
                  >
                    {isCurrent && (
                      <span className="absolute top-2 right-2 text-[10px] font-semibold text-slate-500 bg-slate-200 rounded px-1.5 py-0.5 uppercase">
                        Current
                      </span>
                    )}
                    {!isCurrent && (
                      <span
                        className={`absolute top-2 right-2 flex items-center gap-0.5 text-[10px] font-semibold rounded px-1.5 py-0.5 uppercase ${
                          type === "upgrade"
                            ? "bg-green-100 text-green-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {type === "upgrade" ? (
                          <ArrowUpCircle size={11} />
                        ) : (
                          <ArrowDownCircle size={11} />
                        )}
                        {type}
                      </span>
                    )}
                    <p className="font-bold text-slate-800 mt-1">{plan.name}</p>
                    <div className="flex items-center gap-1 text-sm text-slate-500">
                      <Wifi size={13} />
                      {plan.speed_mbps} Mbps
                    </div>
                    <p className="text-lg font-bold text-[#C41230]">
                      ৳ {Number(plan.price_monthly).toLocaleString()}
                      <span className="text-xs font-normal text-slate-400"> /mo</span>
                    </p>
                    {plan.description && (
                      <p className="text-xs text-slate-400 leading-tight">{plan.description}</p>
                    )}
                    {isSelected && (
                      <div className="mt-1 flex items-center gap-1 text-[#C41230] text-xs font-semibold">
                        <CheckCircle2 size={12} /> Selected
                      </div>
                    )}
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Note + Confirm */}
          {selectedPlanId && (
            <Card className="border-[#C41230]/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ChevronRight size={16} className="text-[#C41230]" />
                  Confirm Plan Change
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Diff */}
                <div className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3 text-sm">
                  <div className="text-center">
                    <p className="text-xs text-slate-400 mb-1">From</p>
                    <p className="font-semibold text-slate-700">{currentPlan?.name ?? "None"}</p>
                    <p className="text-slate-500">৳ {Number(currentPlan?.price_monthly ?? 0).toLocaleString()}</p>
                  </div>
                  <ChevronRight className="text-slate-300" />
                  <div className="text-center">
                    <p className="text-xs text-slate-400 mb-1">To</p>
                    <p className="font-semibold text-[#C41230]">
                      {activePlans.find((p) => p.id === selectedPlanId)?.name}
                    </p>
                    <p className="text-slate-500">
                      ৳ {Number(activePlans.find((p) => p.id === selectedPlanId)?.price_monthly ?? 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Note (optional)</Label>
                  <Textarea
                    placeholder="Any specific reason or time preference?"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                  />
                </div>

                <Button
                  className="w-full bg-[#C41230] hover:bg-[#a30f28] text-white h-11"
                  disabled={mutation.isPending}
                  onClick={() =>
                    mutation.mutate({ requested_plan_id: selectedPlanId, note: note || undefined })
                  }
                >
                  {mutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Submitting…
                    </span>
                  ) : (
                    "Submit Plan Change Request"
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Past Requests */}
      {(myRequests ?? []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Request History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {myRequests!.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between px-4 py-3 rounded-lg border border-slate-200 bg-slate-50"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                    <span>{req.current_plan?.name ?? "None"}</span>
                    <ChevronRight size={14} className="text-slate-400" />
                    <span className="text-[#C41230]">{req.requested_plan?.name ?? "—"}</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {new Date(req.created_at).toLocaleDateString()}
                    {req.staff_note && ` · "${req.staff_note}"`}
                  </p>
                </div>
                <Badge className={STATUS_BADGE[req.status]}>{req.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
