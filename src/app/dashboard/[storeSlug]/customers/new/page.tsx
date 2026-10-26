import { redirect } from "next/navigation";
import { requireStoreAccess } from "@/lib/tenant";
import { CustomerForm } from "../customer-form";

export const instant = false;

export default async function NewCustomerPage({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}) {
  const { storeSlug } = await params;
  const { role } = await requireStoreAccess(storeSlug);
  if (role !== "OWNER") redirect(`/dashboard/${storeSlug}/customers`);

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">Tambah pelanggan</h1>
      <CustomerForm storeSlug={storeSlug} />
    </div>
  );
}
