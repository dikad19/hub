"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
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

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);

    const { error } = await authClient.signIn.email({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
    });

    setLoading(false);
    if (error)
      return setError(error.message ?? "Couldn't sign in. Please try again.");
    router.push("/dashboard");
  }

  return (
    <AuthShell
      title="Welcome back"
      description="Log in to keep running your shop."
      footer={
        <>
          New to Hub?{" "}
          <Link
            href="/register"
            className="font-semibold text-(--teal) underline underline-offset-4"
          >
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
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
            autoComplete="current-password"
            required
          />
        </div>
        <FormError message={error} />
        <Button type="submit" className={submitClass} disabled={loading}>
          {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
          {loading ? "Memproses..." : "Masuk"}
        </Button>
      </form>
    </AuthShell>
  );
}
