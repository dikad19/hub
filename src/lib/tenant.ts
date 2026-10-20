import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Dashboard: wajib login + wajib anggota toko
export async function requireStoreAccess(slug: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const member = await prisma.storeMember.findFirst({
    where: { userId: session.user.id, store: { slug } },
    include: { store: true },
  });
  if (!member) notFound();

  return { user: session.user, store: member.store, role: member.role };
}

// Katalog publik
export async function getPublicStore(slug: string) {
  const store = await prisma.store.findUnique({ where: { slug } });
  if (!store) notFound();
  return store;
}
