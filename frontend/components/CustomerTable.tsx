"use client";

import Link from "next/link";
import { Pencil, Trash } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Customer } from "@/types";

const statusStyles: Record<string, string> = {
  active: "bg-green-100 text-green-700 hover:bg-green-100",
  suspended: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
  inactive: "bg-gray-100 text-gray-500 hover:bg-gray-100",
};

interface CustomerTableProps {
  customers: Customer[];
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
}

export default function CustomerTable({
  customers,
  onEdit,
  onDelete,
}: CustomerTableProps) {
  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-center text-slate-400 py-10"
              >
                No customers found
              </TableCell>
            </TableRow>
          ) : (
            customers.map((customer) => (
              <TableRow key={customer.id} className="hover:bg-slate-50">
                <TableCell className="font-medium">
                  <Link
                    href={`/customers/${customer.id}`}
                    className="text-[#C41230] hover:underline"
                  >
                    {customer.full_name}
                  </Link>
                </TableCell>
                <TableCell className="text-slate-600">
                  {customer.email}
                </TableCell>
                <TableCell className="text-slate-600">
                  {customer.phone}
                </TableCell>
                <TableCell>
                  {customer.plan ? (
                    <span className="text-sm text-slate-700">
                      {customer.plan.name}
                    </span>
                  ) : (
                    <span className="text-sm text-slate-400">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={statusStyles[customer.status] ?? ""}
                  >
                    {customer.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(customer)}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => onDelete(customer)}
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
  );
}
