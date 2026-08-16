import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashWebhookToken, WEBHOOK_TOKEN_PREFIX } from "@/lib/webhook-token";
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

async function resolveWebhookToken(token: string) {
  return prisma.webhookToken.findFirst({
    where: {
      tokenHash: hashWebhookToken(token),
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });
}

async function readWebhookPayload(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return request.json();
  return {
    text: await request.text(),
    occurredAt: request.headers.get("x-occurred-at") || undefined,
    packageName: request.headers.get("x-package-name") || undefined,
    idempotencyKey: request.headers.get("idempotency-key") || undefined,
  };
}

function buildImportFingerprint(
  body: z.infer<typeof payloadSchema>,
  parsed: ReturnType<typeof parseNotification>,
  idempotencyHeader: string | null,
) {
  const idempotencySeed =
    body.idempotencyKey ?? idempotencyHeader ?? `${body.text}|${parsed.transactedAt.toISOString().slice(0, 16)}`;
  return createHash("sha256").update(`webhook|${idempotencySeed}`).digest("hex");
}

async function categorizeIncomingTransaction(userId: string, parsed: ReturnType<typeof parseNotification>, text: string) {
  const [categories, rules] = await Promise.all([
    prisma.category.findMany({ where: { userId } }),
    prisma.categoryRule.findMany({ where: { userId } }),
  ]);
  const fallback = categories.find((category) => category.slug === "outros");
  if (!fallback) throw new Error("A conta ainda não possui a categoria Outros.");
  return categorizeText(`${parsed.merchant} ${text}`, rules, fallback.id);
}

export async function POST(request: NextRequest) {
  try {
    const token = bearerToken(request);
    if (!token.startsWith(WEBHOOK_TOKEN_PREFIX)) {
      return NextResponse.json({ error: "Token ausente ou inválido." }, { status: 401 });
    }

    const tokenRecord = await resolveWebhookToken(token);
    if (!tokenRecord) return NextResponse.json({ error: "Token inválido ou revogado." }, { status: 401 });

    const rawBody = await readWebhookPayload(request);
    const body = payloadSchema.parse(rawBody);
    const fallbackDate = body.occurredAt ? new Date(body.occurredAt) : new Date();
    const parsed = parseNotification(body.text, fallbackDate);

    const categoryId = await categorizeIncomingTransaction(tokenRecord.userId, parsed, body.text);
    const fingerprint = buildImportFingerprint(body, parsed, request.headers.get("idempotency-key"));

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
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
    }
    // Do not expose database, parser or configuration details at this public boundary.
    console.error("Webhook transaction processing failed", {
      errorType: error instanceof Error ? error.name : "unknown",
    });
    return NextResponse.json({ error: "Não foi possível processar a notificação." }, { status: 422 });
  }
}
