import { Suspense } from "react";
import { requireSession } from "@/lib/session";
import { NewStoreForm } from "./new-store-form";

export default function NewStorePage() {
  return (
    <Suspense fallback={<p className="p-6">Memuat...</p>}>
      <Guard />
    </Suspense>
  );
}

async function Guard() {
  await requireSession();
  return <NewStoreForm />;
}
