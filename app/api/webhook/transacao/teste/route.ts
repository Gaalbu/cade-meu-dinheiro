import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { parseNotification } from "@/lib/transactions/parse-notification";

export async function POST(request: Request) {
  await requireUser();
  const body = (await request.json()) as { text?: string };
  try {
    return NextResponse.json(parseNotification(body.text ?? ""));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Texto inválido." },
      { status: 400 },
    );
  }
}
