"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
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

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    if (error) return setError(error.message ?? "Gagal mendaftar");
    router.push("/dashboard/new");
  }

  return (
    <AuthShell
      title="Buat akun Hub"
      description="Daftar, lalu buat toko pertama Anda."
      footer={
        <>
          Sudah punya akun?{" "}
          <Link
            href="/login"
            className="font-semibold text-(--teal) underline underline-offset-4"
          >
            Masuk
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
            autoComplete="new-password"
            minLength={8}
            required
          />
          <p className="text-xs text-(--ink)/60">Minimal 8 karakter.</p>
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
