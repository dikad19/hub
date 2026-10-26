"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { requireSession } from "@/lib/session";
import { RESERVED_SLUGS, normalizeWa, slugify } from "@/lib/slug";
import { PRESETS, isBusinessType } from "@/lib/features";

export type CreateStoreState = { error?: string };

export async function createStore(
  _prev: CreateStoreState,
  formData: FormData,
): Promise<CreateStoreState> {
  const session = await requireSession();

  const name = String(formData.get("name") ?? "").trim();
  const slug = slugify(String(formData.get("slug") ?? ""));
  const waNumber = normalizeWa(String(formData.get("waNumber") ?? ""));
  const businessType = String(formData.get("businessType") ?? "");

  if (name.length < 2) return { error: "Nama toko minimal 2 karakter" };
  if (!isBusinessType(businessType)) return { error: "Pilih jenis usaha" };
  if (slug.length < 3) return { error: "Alamat toko minimal 3 karakter" };
  if (RESERVED_SLUGS.includes(slug))
    return { error: "Alamat toko ini tidak bisa dipakai" };
  if (waNumber.length < 10 || waNumber.length > 15)
    return { error: "Nomor WhatsApp tidak valid" };

  try {
    await prisma.store.create({
      data: {
        name,
        slug,
        waNumber,
        businessType,
        features: [...PRESETS[businessType]],
        members: { create: { userId: session.user.id, role: "OWNER" } },
      },
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return { error: "Alamat toko sudah dipakai, coba yang lain" };
    }
    throw e;
  }

  redirect(`/dashboard/${slug}`);
}
