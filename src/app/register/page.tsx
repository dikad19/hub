"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AuthShell,
  FormError,
  PasswordInput,
  inputClass,
  submitClass,
} from "@/components/auth-shell";
import { Metadata } from "next";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const longEnough = password.length >= 8;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);

    const { error } = await authClient.signUp.email({
      name: String(fd.get("name")),
      email: String(fd.get("email")),
      password: String(fd.get("password")),
    });

    setLoading(false);
    if (error)
      return setError(
        error.message ?? "Couldn't create your account. Please try again.",
      );
    router.push("/dashboard/new");
  }

  return (
    <AuthShell
      title="Create your Hub account"
      description="Sign up, then set up your first shop."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-(--teal) underline underline-offset-4"
          >
            Login
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">Nama</Label>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            required
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
          <p
            className={`flex items-center gap-1.5 text-xs transition-colors ${
              longEnough ? "text-(--teal)" : "text-(--ink)/60"
            }`}
          >
            <Check
              className={`size-3.5 transition-opacity ${longEnough ? "opacity-100" : "opacity-30"}`}
              strokeWidth={3}
            />
            At least 8 characters
          </p>
        </div>
        <FormError message={error} />
        <Button type="submit" className={submitClass} disabled={loading}>
          {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
          {loading ? "Memproses..." : "Daftar"}
        </Button>
      </form>
    </AuthShell>
  );
}
