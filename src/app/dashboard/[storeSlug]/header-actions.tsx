"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

function Clock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Placeholder menjaga lebar tetap sama sebelum mount, supaya tidak ada layout shift.
  if (!now) return <div className="hidden h-8 w-28 md:block" />;

  const date = now.toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const time = now.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="hidden text-right leading-tight md:block">
      <p className="text-sm font-medium tabular-nums">{time}</p>
      <p className="text-xs text-muted-foreground">{date}</p>
    </div>
  );
}

export function HeaderActions({ base }: { base: string }) {
  const pathname = usePathname();
  const onPos = pathname.startsWith(`${base}/pos`);

  return (
    <div className="ml-auto flex items-center gap-4">
      <Clock />
      {!onPos && (
        <Link
          href={`${base}/pos`}
          style={{ fontSize: "12px" }}
          className={buttonVariants({ size: "sm" })}
        >
          <Plus />
          <span className="hidden sm:inline">Transaksi Baru</span>
        </Link>
      )}
    </div>
  );
}
