import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_CATEGORIES } from "@/lib/categories";

async function ensureLocalUser(id: string, email: string) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { id },
      update: { email },
      create: { id, email },
    });

    const categoryCount = await tx.category.count({ where: { userId: id } });
    if (categoryCount === 0) {
      for (const [position, item] of DEFAULT_CATEGORIES.entries()) {
        const category = await tx.category.create({
          data: {
            userId: id,
            name: item.name,
            slug: item.slug,
            color: item.color,
            glyph: item.glyph,
            position,
          },
        });
        if (item.keywords.length) {
          await tx.categoryRule.createMany({
            data: item.keywords.map((keyword, priority) => ({
              userId: id,
              categoryId: category.id,
              keyword,
              priority: 100 - priority,
            })),
          });
        }
      }
    }
    return user;
  });
}

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) redirect("/entrar");
  return ensureLocalUser(user.id, user.email);
}

export async function getOptionalUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
