"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PlanCard from "@/components/PlanCard";
import PlanForm from "@/components/PlanForm";
import { getPlans, createPlan, updatePlan, deletePlan } from "@/lib/api";
import { Plan } from "@/types";

export default function PlansPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  const { data: plans, isLoading } = useQuery<Plan[]>({
    queryKey: ["plans"],
    queryFn: () => getPlans().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: createPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      toast.success("Plan created successfully");
      setDialogOpen(false);
    },
    onError: () => toast.error("Failed to create plan"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) =>
      updatePlan(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      toast.success("Plan updated successfully");
      setDialogOpen(false);
    },
    onError: () => toast.error("Failed to update plan"),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      toast.success("Plan deleted");
    },
    onError: () => toast.error("Failed to delete plan"),
  });

  function handleOpenAdd() {
    setEditingPlan(null);
    setDialogOpen(true);
  }

  function handleEdit(plan: Plan) {
    setEditingPlan(plan);
    setDialogOpen(true);
  }

  function handleDelete(plan: Plan) {
    if (confirm(`Delete plan "${plan.name}"?`)) {
      deleteMutation.mutate(plan.id);
    }
  }

  function handleSubmit(data: unknown) {
    if (editingPlan) {
      updateMutation.mutate({ id: editingPlan.id, data });
    } else {
      createMutation.mutate(data);
    }
  }

  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">
            Subscription Plans
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {plans?.length ?? 0} plans available
          </p>
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus size={16} className="mr-1" />
          Add Plan
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#C41230] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans?.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
          {plans?.length === 0 && (
            <div className="col-span-3 text-center py-16 text-slate-400">
              No plans yet. Create your first plan!
            </div>
          )}
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => setDialogOpen(open)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? "Edit Plan" : "Add New Plan"}
            </DialogTitle>
          </DialogHeader>
          <PlanForm
            plan={editingPlan ?? undefined}
            onSubmit={handleSubmit}
            isLoading={isMutating}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
