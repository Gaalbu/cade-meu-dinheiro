"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { categorizeText } from "@/lib/transactions/categorize";
import { normalizeSearchText, parseBrazilianAmount } from "@/lib/transactions/parse-notification";
import { parseCsv, parseOfx } from "@/lib/transactions/import";
import { generateWebhookToken, hashWebhookToken, tokenPreview } from "@/lib/webhook-token";

function required(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`O campo ${key} é obrigatório.`);
  return value;
}

async function ownedCategory(userId: string, categoryId: string) {
  const category = await prisma.category.findFirst({ where: { id: categoryId, userId } });
  if (!category) throw new Error("Categoria inválida para esta conta.");
  return category;
}

export async function createTransaction(formData: FormData) {
  const user = await requireUser();
  const merchant = required(formData, "merchant");
  const categoryId = required(formData, "categoryId");
  await ownedCategory(user.id, categoryId);
  const amount = parseBrazilianAmount(required(formData, "amount"));
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Valor inválido.");

  await prisma.transaction.create({
    data: {
      userId: user.id,
      categoryId,
      merchant: merchant.slice(0, 80),
      description: String(formData.get("description") ?? "").trim().slice(0, 240) || null,
      amount,
      type: formData.get("type") === "INCOME" ? "INCOME" : "EXPENSE",
      transactedAt: new Date(`${required(formData, "date")}T12:00:00`),
      source: "MANUAL",
    },
  });
  revalidatePath("/dashboard");
  revalidatePath("/transacoes");
  redirect("/transacoes?mensagem=Lançamento registrado.");
}

export async function updateTransaction(transactionId: string, formData: FormData) {
  const user = await requireUser();
  const categoryId = required(formData, "categoryId");
  await ownedCategory(user.id, categoryId);
  const transaction = await prisma.transaction.findFirst({
    where: { id: transactionId, userId: user.id },
  });
  if (!transaction) throw new Error("Transação não encontrada.");

  const merchant = required(formData, "merchant");
  const amount = parseBrazilianAmount(required(formData, "amount"));
  await prisma.transaction.update({
    where: { id: transaction.id },
    data: {
      categoryId,
      merchant: merchant.slice(0, 80),
      amount,
      type: formData.get("type") === "INCOME" ? "INCOME" : "EXPENSE",
      transactedAt: new Date(`${required(formData, "date")}T12:00:00`),
      description: String(formData.get("description") ?? "").trim().slice(0, 240) || null,
    },
  });

  if (formData.get("rememberRule") === "on") {
    const keyword = normalizeSearchText(merchant).slice(0, 80);
    if (keyword.length >= 3) {
      await prisma.categoryRule.upsert({
        where: { userId_keyword: { userId: user.id, keyword } },
        update: { categoryId, priority: 250 },
        create: { userId: user.id, categoryId, keyword, priority: 250 },
      });
    }
  }
  revalidatePath("/dashboard");
  revalidatePath("/transacoes");
  redirect("/transacoes?mensagem=Transação corrigida.");
}

export async function importStatement(formData: FormData) {
  const user = await requireUser();
  const file = formData.get("statement");
  if (!(file instanceof File) || file.size === 0) throw new Error("Escolha um arquivo CSV ou OFX.");
  if (file.size > 5 * 1024 * 1024) throw new Error("O arquivo deve ter no máximo 5 MB.");
  const text = await file.text();
  const imported = file.name.toLowerCase().endsWith(".ofx") ? parseOfx(text) : parseCsv(text);
  if (imported.length > 5000) throw new Error("O arquivo excede o limite de 5.000 lançamentos.");

  const [categories, rules] = await Promise.all([
    prisma.category.findMany({ where: { userId: user.id } }),
    prisma.categoryRule.findMany({ where: { userId: user.id } }),
  ]);
  const fallback = categories.find((category) => category.slug === "outros");
  if (!fallback) throw new Error("Categoria Outros não encontrada.");

  const data = imported.map((item) => {
    const categoryId = categorizeText(`${item.merchant} ${item.description ?? ""}`, rules, fallback.id);
    const seed = item.externalId || `${item.date.toISOString()}|${item.amount}|${item.merchant}`;
    return {
      userId: user.id,
      categoryId,
      amount: item.amount,
      merchant: item.merchant,
      description: item.description || null,
      transactedAt: item.date,
      type: item.type,
      source: file.name.toLowerCase().endsWith(".ofx") ? ("OFX" as const) : ("CSV" as const),
      importFingerprint: createHash("sha256").update(`import|${seed}`).digest("hex"),
    };
  });
  const result = await prisma.transaction.createMany({ data, skipDuplicates: true });
  revalidatePath("/dashboard");
  revalidatePath("/transacoes");
  redirect(`/transacoes?mensagem=${encodeURIComponent(`${result.count} lançamento(s) importado(s).`)}`);
}

export async function saveBudget(formData: FormData) {
  const user = await requireUser();
  const categoryId = required(formData, "categoryId");
  await ownedCategory(user.id, categoryId);
  const limit = parseBrazilianAmount(required(formData, "limit"));
  const alertAt = Math.min(100, Math.max(10, Number(formData.get("alertAt") ?? 80)));
  const month = new Date(`${required(formData, "month")}-01T12:00:00.000Z`);

  await prisma.budget.upsert({
    where: { userId_categoryId_month: { userId: user.id, categoryId, month } },
    update: { limit, alertAt },
    create: { userId: user.id, categoryId, month, limit, alertAt },
  });
  revalidatePath("/dashboard");
  revalidatePath("/planejamento");
  redirect("/planejamento?mensagem=Limite salvo.");
}

export async function createGoal(formData: FormData) {
  const user = await requireUser();
  const targetAmount = parseBrazilianAmount(required(formData, "targetAmount"));
  const currentAmount = parseBrazilianAmount(String(formData.get("currentAmount") ?? "0")) || 0;
  const deadline = String(formData.get("deadline") ?? "").trim();
  await prisma.goal.create({
    data: {
      userId: user.id,
      title: required(formData, "title").slice(0, 80),
      targetAmount,
      currentAmount,
      deadline: deadline ? new Date(`${deadline}T12:00:00.000Z`) : null,
      status: currentAmount >= targetAmount ? "ACHIEVED" : "ACTIVE",
    },
  });
  revalidatePath("/dashboard");
  revalidatePath("/planejamento");
  redirect("/planejamento?mensagem=Meta criada.");
}

export async function addGoalProgress(goalId: string, formData: FormData) {
  const user = await requireUser();
  const goal = await prisma.goal.findFirst({ where: { id: goalId, userId: user.id } });
  if (!goal) throw new Error("Meta não encontrada.");
  const addition = parseBrazilianAmount(required(formData, "addition"));
  const currentAmount = Math.min(Number(goal.targetAmount), Number(goal.currentAmount) + addition);
  await prisma.goal.update({
    where: { id: goal.id },
    data: { currentAmount, status: currentAmount >= Number(goal.targetAmount) ? "ACHIEVED" : "ACTIVE" },
  });
  revalidatePath("/dashboard");
  revalidatePath("/planejamento");
}

export type TokenActionState = { token?: string; error?: string };

export async function generateTokenAction(
  _previousState: TokenActionState,
  formData: FormData,
): Promise<TokenActionState> {
  try {
    const user = await requireUser();
    const token = generateWebhookToken();
    await prisma.webhookToken.create({
      data: {
        userId: user.id,
        name: String(formData.get("name") ?? "Celular principal").trim().slice(0, 60),
        tokenHash: hashWebhookToken(token),
        tokenPrefix: tokenPreview(token),
      },
    });
    revalidatePath("/configuracoes");
    return { token };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Não foi possível gerar o token." };
  }
}

export async function revokeToken(tokenId: string) {
  const user = await requireUser();
  await prisma.webhookToken.updateMany({
    where: { id: tokenId, userId: user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  revalidatePath("/configuracoes");
}
