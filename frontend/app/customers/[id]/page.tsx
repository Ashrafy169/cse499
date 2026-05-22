"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Wifi, Mail, Phone, MapPin } from "lucide-react";
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
import CustomerForm from "@/components/CustomerForm";
import { getCustomer, updateCustomer, updateCustomerStatus } from "@/lib/api";
import { Customer } from "@/types";

const statusStyles: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  suspended: "bg-yellow-100 text-yellow-700",
  inactive: "bg-gray-100 text-gray-500",
};

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const { data: customer, isLoading } = useQuery<Customer>({
    queryKey: ["customer", id],
    queryFn: () => getCustomer(id).then((r) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: (data: unknown) => updateCustomer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer updated");
      setEditOpen(false);
    },
    onError: () => toast.error("Failed to update customer"),
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => updateCustomerStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#C41230] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-20 text-slate-500">
        Customer not found.{" "}
        <Link href="/customers" className="text-[#C41230] hover:underline">
          Go back
        </Link>
      </div>
    );
  }

  const statuses = ["active", "inactive", "suspended"] as const;

  return (
    <div className="space-y-6 max-w-3xl">
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
              <CardTitle className="text-xl">{customer.full_name}</CardTitle>
              <Badge
                className={`mt-2 ${statusStyles[customer.status] ?? ""}`}
              >
                {customer.status}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
            >
              <Pencil size={14} className="mr-1" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-slate-600">
            <Mail size={15} className="text-slate-400 shrink-0" />
            <span>{customer.email}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Phone size={15} className="text-slate-400 shrink-0" />
            <span>{customer.phone}</span>
          </div>
          {customer.address && (
            <div className="flex items-start gap-2 text-slate-600">
              <MapPin size={15} className="text-slate-400 shrink-0 mt-0.5" />
              <span>{customer.address}</span>
            </div>
          )}
          <p className="text-xs text-slate-400 pt-1">
            Member since {new Date(customer.created_at).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>

      {customer.plan && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <Link
                href={`/plans/${customer.plan.id}`}
                className="font-semibold text-[#C41230] hover:underline"
              >
                {customer.plan.name}
              </Link>
              <span className="font-bold text-slate-700">
                ৳ {Number(customer.plan.price_monthly).toLocaleString()} / month
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Wifi size={15} className="text-[#C41230]" />
              <span>{customer.plan.speed_mbps} Mbps</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {statuses.map((s) => (
              <Button
                key={s}
                variant={customer.status === s ? "default" : "outline"}
                size="sm"
                disabled={
                  customer.status === s || statusMutation.isPending
                }
                onClick={() => statusMutation.mutate(s)}
                className="capitalize"
              >
                {s}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={(open) => setEditOpen(open)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <CustomerForm
            customer={customer}
            onSubmit={(data) => updateMutation.mutate(data)}
            isLoading={updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
