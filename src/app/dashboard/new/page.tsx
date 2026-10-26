import { Suspense } from "react";
import { requireSession } from "@/lib/session";
import { NewStoreForm } from "./new-store-form";
import { prisma } from "@/lib/prisma";

export default function NewStorePage() {
  return (
    <Suspense fallback={<p className="p-6">Memuat...</p>}>
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
