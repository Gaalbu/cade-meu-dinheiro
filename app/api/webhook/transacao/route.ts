import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashWebhookToken } from "@/lib/webhook-token";
import { parseNotification } from "@/lib/transactions/parse-notification";
import { categorizeText } from "@/lib/transactions/categorize";

export const runtime = "nodejs";

const payloadSchema = z.object({
  text: z.string().min(8).max(4000),
  occurredAt: z.iso.datetime({ offset: true }).optional(),
  packageName: z.string().max(160).optional(),
  idempotencyKey: z.string().max(200).optional(),
});

function bearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (authorization?.toLowerCase().startsWith("bearer ")) return authorization.slice(7).trim();
  return request.headers.get("x-webhook-token")?.trim() ?? "";
}

export async function POST(request: NextRequest) {
  try {
    const token = bearerToken(request);
    if (!token.startsWith("fio_wh_")) {
      return NextResponse.json({ error: "Token ausente ou inválido." }, { status: 401 });
    }

    const tokenRecord = await prisma.webhookToken.findFirst({
      where: {
        tokenHash: hashWebhookToken(token),
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
    if (!tokenRecord) return NextResponse.json({ error: "Token inválido ou revogado." }, { status: 401 });

    const contentType = request.headers.get("content-type") ?? "";
    const rawBody = contentType.includes("application/json")
      ? await request.json()
      : {
          text: await request.text(),
          occurredAt: request.headers.get("x-occurred-at") || undefined,
          packageName: request.headers.get("x-package-name") || undefined,
          idempotencyKey: request.headers.get("idempotency-key") || undefined,
        };
    const body = payloadSchema.parse(rawBody);
    const fallbackDate = body.occurredAt ? new Date(body.occurredAt) : new Date();
    const parsed = parseNotification(body.text, fallbackDate);

    const [categories, rules] = await Promise.all([
      prisma.category.findMany({ where: { userId: tokenRecord.userId } }),
      prisma.categoryRule.findMany({ where: { userId: tokenRecord.userId } }),
    ]);
    const fallback = categories.find((category) => category.slug === "outros");
    if (!fallback) throw new Error("A conta ainda não possui a categoria Outros.");
    const categoryId = categorizeText(`${parsed.merchant} ${body.text}`, rules, fallback.id);
    const idempotencySeed =
      body.idempotencyKey ??
      request.headers.get("idempotency-key") ??
      `${body.text}|${parsed.transactedAt.toISOString().slice(0, 16)}`;
    const fingerprint = createHash("sha256").update(`webhook|${idempotencySeed}`).digest("hex");

    const transaction = await prisma.transaction.upsert({
      where: {
        userId_importFingerprint: {
          userId: tokenRecord.userId,
          importFingerprint: fingerprint,
        },
      },
      update: {},
      create: {
        userId: tokenRecord.userId,
        categoryId,
        amount: parsed.amount,
        merchant: parsed.merchant,
        description: parsed.description,
        transactedAt: parsed.transactedAt,
        rawNotification: body.text,
        source: "WEBHOOK",
        importFingerprint: fingerprint,
      },
      include: { category: { select: { name: true } } },
    });

    await prisma.webhookToken.update({
      where: { id: tokenRecord.id },
      data: { lastUsedAt: new Date() },
    });

    return NextResponse.json(
      {
        ok: true,
        transaction: {
          id: transaction.id,
          amount: Number(transaction.amount),
          merchant: transaction.merchant,
          category: transaction.category.name,
          occurredAt: transaction.transactedAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload inválido.", details: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Erro interno.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
