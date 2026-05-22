"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plan } from "@/types";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  speed_mbps: z.number().int().min(1, "Speed must be at least 1 Mbps"),
  price_monthly: z.number().min(0, "Price cannot be negative"),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface PlanFormProps {
  plan?: Plan;
  onSubmit: (data: FormData) => void;
  isLoading?: boolean;
}

export default function PlanForm({ plan, onSubmit, isLoading }: PlanFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: plan
      ? {
          name: plan.name,
          description: plan.description ?? "",
          speed_mbps: plan.speed_mbps,
          price_monthly: plan.price_monthly,
          is_active: plan.is_active,
        }
      : {
          name: "",
          description: "",
          speed_mbps: 10,
          price_monthly: 0,
          is_active: true,
        },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Plan Name *</Label>
        <Input id="name" placeholder="e.g. Home 50" {...register("name")} />
        {errors.name && (
          <p className="text-xs text-red-500">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe the plan..."
          rows={3}
          {...register("description")}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="speed_mbps">Speed (Mbps) *</Label>
          <Input
            id="speed_mbps"
            type="number"
            placeholder="e.g. 50"
            {...register("speed_mbps", { valueAsNumber: true })}
          />
          {errors.speed_mbps && (
            <p className="text-xs text-red-500">{errors.speed_mbps.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="price_monthly">Monthly Price (৳) *</Label>
          <Input
            id="price_monthly"
            type="number"
            step="0.01"
            placeholder="e.g. 800"
            {...register("price_monthly", { valueAsNumber: true })}
          />
          {errors.price_monthly && (
            <p className="text-xs text-red-500">
              {errors.price_monthly.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Controller
          name="is_active"
          control={control}
          render={({ field }) => (
            <Switch
              id="is_active"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <Label htmlFor="is_active">Active</Label>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? "Saving..." : plan ? "Update Plan" : "Create Plan"}
      </Button>
    </form>
  );
}
