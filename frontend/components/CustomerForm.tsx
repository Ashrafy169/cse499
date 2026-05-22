"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getPlans } from "@/lib/api";
import { Customer, Plan } from "@/types";

const schema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone is required"),
  address: z.string().optional(),
  plan_id: z.string().optional().nullable(),
  status: z.enum(["active", "inactive", "suspended"]),
});

type FormData = z.infer<typeof schema>;

interface CustomerFormProps {
  customer?: Customer;
  onSubmit: (data: FormData) => void;
  isLoading?: boolean;
}

export default function CustomerForm({
  customer,
  onSubmit,
  isLoading,
}: CustomerFormProps) {
  const { data: plans } = useQuery<Plan[]>({
    queryKey: ["plans"],
    queryFn: () => getPlans().then((r) => r.data),
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: customer
      ? {
          full_name: customer.full_name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address ?? "",
          plan_id: customer.plan_id ?? null,
          status: customer.status,
        }
      : {
          full_name: "",
          email: "",
          phone: "",
          address: "",
          plan_id: null,
          status: "active",
        },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="full_name">Full Name *</Label>
        <Input
          id="full_name"
          placeholder="e.g. Rahim Uddin"
          {...register("full_name")}
        />
        {errors.full_name && (
          <p className="text-xs text-red-500">{errors.full_name.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          placeholder="e.g. rahim@example.com"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-xs text-red-500">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone *</Label>
        <Input
          id="phone"
          placeholder="e.g. 01XXXXXXXXX"
          {...register("phone")}
        />
        {errors.phone && (
          <p className="text-xs text-red-500">{errors.phone.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="address">Address</Label>
        <Textarea
          id="address"
          placeholder="Street address, city..."
          rows={2}
          {...register("address")}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Plan</Label>
          <Controller
            name="plan_id"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ?? "none"}
                onValueChange={(val) =>
                  field.onChange(val === "none" ? null : val)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No plan</SelectItem>
                  {plans
                    ?.filter((p) => p.is_active)
                    .map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Status *</Label>
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.status && (
            <p className="text-xs text-red-500">{errors.status.message}</p>
          )}
        </div>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading
          ? "Saving..."
          : customer
          ? "Update Customer"
          : "Create Customer"}
      </Button>
    </form>
  );
}
