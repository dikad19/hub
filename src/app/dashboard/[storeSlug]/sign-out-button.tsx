"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      className="text-muted-foreground"
      onClick={async () => {
        await authClient.signOut();
        router.push("/login");
      }}
    >
      Keluar
    </button>
  );
}
