import { createHmac, randomBytes } from "node:crypto";

export const WEBHOOK_TOKEN_PREFIX = "cade_wh_";

function secret() {
  const value = process.env.WEBHOOK_SECRET;
  if (!value || value.length < 32) {
    throw new Error("WEBHOOK_SECRET deve ter ao menos 32 caracteres.");
  }
  return value;
}

export function generateWebhookToken() {
  return `${WEBHOOK_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
}

export function hashWebhookToken(token: string) {
  return createHmac("sha256", secret()).update(token).digest("hex");
}

export function tokenPreview(token: string) {
  return `${token.slice(0, 13)}…${token.slice(-4)}`;
}
