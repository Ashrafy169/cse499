"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { getUsers, createUser, updateUser, deleteUser, getCustomers } from "@/lib/api";
import { User, UserRole, CustomerListResponse } from "@/types";
import { useAuth } from "@/context/AuthContext";

const roleLabels: Record<UserRole, string> = {
  super_admin: "Super Admin",
  billing_staff: "Billing Staff",
  support_staff: "Support Staff",
  customer: "Customer",
};

const roleBadgeClass: Record<UserRole, string> = {
  super_admin: "bg-red-100 text-[#C41230]",
  billing_staff: "bg-blue-100 text-blue-700",
  support_staff: "bg-purple-100 text-purple-700",
  customer: "bg-green-100 text-green-700",
};

const createSchema = z.object({
  email: z.string().email("Invalid email"),
  full_name: z.string().min(1, "Name is required"),
  password: z.string().min(6, "Min 6 characters"),
  role: z.enum(["super_admin", "billing_staff", "support_staff", "customer"]),
  customer_id: z.string().nullable().optional(),
});

const editSchema = z.object({
  full_name: z.string().min(1, "Name is required"),
  role: z.enum(["super_admin", "billing_staff", "support_staff", "customer"]),
  is_active: z.boolean(),
  password: z.string().min(6, "Min 6 characters").or(z.literal("")).optional(),
});

type CreateForm = z.infer<typeof createSchema>;
type EditForm = z.infer<typeof editSchema>;

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => getUsers().then((r) => r.data),
  });

  const { data: customersData } = useQuery<CustomerListResponse>({
    queryKey: ["customers-for-users", { limit: 100 }],
    queryFn: () => getCustomers({ limit: 100 }).then((r) => r.data),
  });
  const customers = customersData?.items ?? [];

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User created");
      setDialogOpen(false);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Failed to create user";
      toast.error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User updated");
      setDialogOpen(false);
    },
    onError: () => toast.error("Failed to update user"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User deleted");
    },
    onError: () => toast.error("Failed to delete user"),
  });

  function handleOpenAdd() {
    setEditingUser(null);
    setDialogOpen(true);
  }

  function handleEdit(u: User) {
    setEditingUser(u);
    setDialogOpen(true);
  }

  function handleDelete(u: User) {
    if (u.id === currentUser?.user_id) {
      toast.error("You cannot delete your own account");
      return;
    }
    if (confirm(`Delete user "${u.full_name}"?`)) {
      deleteMutation.mutate(u.id);
    }
  }

  if (currentUser?.role !== "super_admin") {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
        <Shield size={40} className="text-slate-300" />
        <p>Only Super Admins can manage users.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Users</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {users?.length ?? 0} total users
          </p>
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus size={16} className="mr-1" />
          Add User
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#C41230] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-400 py-10">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users?.map((u) => (
                  <TableRow key={u.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium text-slate-800">
                      {u.full_name}
                      {u.id === currentUser?.user_id && (
                        <span className="ml-2 text-xs text-slate-400">(you)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-600">{u.email}</TableCell>
                    <TableCell>
                      <Badge className={roleBadgeClass[u.role] ?? ""}>
                        {roleLabels[u.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          u.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }
                      >
                        {u.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(u)}>
                          <Pencil size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(u)}
                        >
                          <Trash size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Add User"}</DialogTitle>
          </DialogHeader>
          {editingUser ? (
            <EditUserForm
              user={editingUser}
              onSubmit={(data) => {
                const payload: Record<string, unknown> = {
                  full_name: data.full_name,
                  role: data.role,
                  is_active: data.is_active,
                };
                if (data.password) payload.password = data.password;
                updateMutation.mutate({ id: editingUser.id, data: payload });
              }}
              isLoading={updateMutation.isPending}
            />
          ) : (
            <CreateUserForm
              customers={customers}
              onSubmit={(data) => createMutation.mutate(data)}
              isLoading={createMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateUserForm({
  customers,
  onSubmit,
  isLoading,
}: {
  customers: { id: string; full_name: string; email: string }[];
  onSubmit: (data: CreateForm) => void;
  isLoading: boolean;
}) {
  const { register, handleSubmit, control, watch, formState: { errors } } =
    useForm<CreateForm>({
      resolver: zodResolver(createSchema),
      defaultValues: { role: "billing_staff", customer_id: null },
    });

  const role = watch("role");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Full Name *</Label>
        <Input placeholder="Jane Smith" {...register("full_name")} />
        {errors.full_name && <p className="text-xs text-red-500">{errors.full_name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>Email *</Label>
        <Input type="email" placeholder="jane@amberit.com" {...register("email")} />
        {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>Password *</Label>
        <Input type="password" placeholder="Min 6 characters" {...register("password")} />
        {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>Role *</Label>
        <Controller
          name="role"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="billing_staff">Billing Staff</SelectItem>
                <SelectItem value="support_staff">Support Staff</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>
      {role === "customer" && customers.length > 0 && (
        <div className="space-y-1.5">
          <Label>Link to Customer Record</Label>
          <Controller
            name="customer_id"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ?? "none"}
                onValueChange={(v) => field.onChange(v === "none" ? null : v)}
              >
                <SelectTrigger className="w-full"><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name} ({c.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      )}
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? "Creating…" : "Create User"}
      </Button>
    </form>
  );
}

function EditUserForm({
  user,
  onSubmit,
  isLoading,
}: {
  user: User;
  onSubmit: (data: EditForm) => void;
  isLoading: boolean;
}) {
  const { register, handleSubmit, control, formState: { errors } } =
    useForm<EditForm>({
      resolver: zodResolver(editSchema),
      defaultValues: {
        full_name: user.full_name,
        role: user.role,
        is_active: user.is_active,
        password: "",
      },
    });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Full Name *</Label>
        <Input {...register("full_name")} />
        {errors.full_name && <p className="text-xs text-red-500">{errors.full_name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>Role *</Label>
        <Controller
          name="role"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="billing_staff">Billing Staff</SelectItem>
                <SelectItem value="support_staff">Support Staff</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>
      <div className="space-y-1.5">
        <Label>New Password <span className="text-slate-400 text-xs">(leave blank to keep)</span></Label>
        <Input type="password" placeholder="••••••••" {...register("password")} />
        {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
      </div>
      <div className="flex items-center gap-3">
        <Controller
          name="is_active"
          control={control}
          render={({ field }) => (
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          )}
        />
        <Label>Active</Label>
      </div>
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? "Saving…" : "Save Changes"}
      </Button>
    </form>
  );
}
