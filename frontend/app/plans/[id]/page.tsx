"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Wifi } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PlanForm from "@/components/PlanForm";
import { getPlan, updatePlan, getCustomers } from "@/lib/api";
import { Plan, CustomerListResponse } from "@/types";

export default function PlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const { data: plan, isLoading } = useQuery<Plan>({
    queryKey: ["plan", id],
    queryFn: () => getPlan(id).then((r) => r.data),
  });

  const { data: customersData } = useQuery<CustomerListResponse>({
    queryKey: ["customers", { page: 1, limit: 100 }],
    queryFn: () => getCustomers({ page: 1, limit: 100 }).then((r) => r.data),
    enabled: !!plan,
  });

  const planCustomers =
    customersData?.items.filter((c) => c.plan_id === id) ?? [];

  const updateMutation = useMutation({
    mutationFn: (data: unknown) => updatePlan(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan", id] });
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      toast.success("Plan updated");
      setEditOpen(false);
    },
    onError: () => toast.error("Failed to update plan"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#C41230] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="text-center py-20 text-slate-500">
        Plan not found.{" "}
        <Link href="/plans" className="text-[#C41230] hover:underline">
          Go back
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="gap-1"
        >
          <ArrowLeft size={16} />
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <p className="text-3xl font-bold text-[#C41230] mt-2">
                ৳ {Number(plan.price_monthly).toLocaleString()}
                <span className="text-base font-normal text-slate-500">
                  {" "}
                  / month
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                className={
                  plan.is_active
                    ? "bg-green-100 text-green-700 hover:bg-green-100"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-100"
                }
              >
                {plan.is_active ? "Active" : "Inactive"}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditOpen(true)}
              >
                <Pencil size={14} className="mr-1" />
                Edit
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-slate-700">
            <Wifi size={18} className="text-[#C41230]" />
            <span className="font-medium">{plan.speed_mbps} Mbps</span>
            <span className="text-slate-400">download speed</span>
          </div>
          {plan.description && (
            <p className="text-slate-600">{plan.description}</p>
          )}
          <p className="text-xs text-slate-400">
            Created {new Date(plan.created_at).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-base font-semibold text-slate-800 mb-3">
          Customers on this plan ({planCustomers.length})
        </h3>
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {planCustomers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-slate-400 py-8"
                  >
                    No customers on this plan
                  </TableCell>
                </TableRow>
              ) : (
                planCustomers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/customers/${c.id}`}
                        className="text-[#C41230] hover:underline"
                      >
                        {c.full_name}
                      </Link>
                    </TableCell>
                    <TableCell>{c.email}</TableCell>
                    <TableCell>{c.phone}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {c.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={(open) => setEditOpen(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Plan</DialogTitle>
          </DialogHeader>
          <PlanForm
            plan={plan}
            onSubmit={(data) => updateMutation.mutate(data)}
            isLoading={updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
