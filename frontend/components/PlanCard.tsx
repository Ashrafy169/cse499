"use client";

import { Pencil, Trash } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plan } from "@/types";

interface PlanCardProps {
  plan: Plan;
  onEdit: (plan: Plan) => void;
  onDelete: (plan: Plan) => void;
}

export default function PlanCard({ plan, onEdit, onDelete }: PlanCardProps) {
  return (
    <Card className="relative">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-slate-800 text-base">
              {plan.name}
            </h3>
            <p className="text-2xl font-bold text-[#C41230] mt-1">
              ৳ {Number(plan.price_monthly).toLocaleString()}
              <span className="text-sm font-normal text-slate-500"> / month</span>
            </p>
          </div>
          <Badge
            variant={plan.is_active ? "default" : "secondary"}
            className={
              plan.is_active
                ? "bg-green-100 text-green-700 hover:bg-green-100"
                : "bg-gray-100 text-gray-500 hover:bg-gray-100"
            }
          >
            {plan.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span className="font-medium text-slate-700">
            {plan.speed_mbps} Mbps
          </span>
          <span className="text-slate-400">speed</span>
        </div>

        {plan.description && (
          <p className="text-sm text-slate-500 line-clamp-2">
            {plan.description}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onEdit(plan)}
          >
            <Pencil size={14} className="mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-600"
            onClick={() => onDelete(plan)}
          >
            <Trash size={14} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
