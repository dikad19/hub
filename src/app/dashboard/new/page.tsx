import { Suspense } from "react";
import { requireSession } from "@/lib/session";
import { NewStoreForm } from "./new-store-form";
import { prisma } from "@/lib/prisma";
import { Loader2 } from "lucide-react";

export default function NewStorePage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center">
          <Loader2 className="size-6 animate-spin text-[#0B6E5F]" />
        </div>
      }
    >
      <Guard />
    </Suspense>
  );
}

async function Guard() {
  const session = await requireSession();
  const count = await prisma.storeMember.count({
    where: { userId: session.user.id },
  });
  return <NewStoreForm canCancel={count > 0} />;
}
