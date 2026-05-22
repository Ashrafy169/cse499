"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/context/AuthContext";
import { signup } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z
  .object({
    full_name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(1, "Phone is required"),
    address: z.string().optional(),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirm_password: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type SignupForm = z.infer<typeof schema>;

export default function SignupPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupForm>({ resolver: zodResolver(schema) });

  async function onSubmit(values: SignupForm) {
    setIsLoading(true);
    try {
      const { data } = await signup({
        full_name: values.full_name,
        email: values.email,
        phone: values.phone,
        address: values.address || null,
        password: values.password,
      });
      login(data);
      router.replace("/portal");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Signup failed. Please try again.";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex justify-center">
          <div className="bg-black rounded-xl px-8 py-5">
            <Image src="/logo.png" alt="AmberIT" width={140} height={44} priority />
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-center text-lg font-semibold">
              Create your account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  placeholder="Jane Smith"
                  {...register("full_name")}
                />
                {errors.full_name && (
                  <p className="text-xs text-red-500">{errors.full_name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="jane@example.com"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="+880 1700 000000"
                  {...register("phone")}
                />
                {errors.phone && (
                  <p className="text-xs text-red-500">{errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address">
                  Address{" "}
                  <span className="text-slate-400 text-xs">(optional)</span>
                </Label>
                <Input
                  id="address"
                  placeholder="123 Main Street, Dhaka"
                  {...register("address")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min 6 characters"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-xs text-red-500">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm_password">Confirm Password</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  placeholder="••••••••"
                  {...register("confirm_password")}
                />
                {errors.confirm_password && (
                  <p className="text-xs text-red-500">
                    {errors.confirm_password.message}
                  </p>
                )}
              </div>

              <Button type="submit" disabled={isLoading} className="w-full mt-2">
                {isLoading ? "Creating account…" : "Sign Up"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="text-[#C41230] font-medium hover:underline">
            Sign in
          </Link>
        </p>

        <p className="text-center text-xs text-slate-400">
          AmberIT Billing &amp; Subscription Management
        </p>
      </div>
    </div>
  );
}
