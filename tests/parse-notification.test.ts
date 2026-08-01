import { describe, expect, it } from "vitest";
import { parseBrazilianAmount, parseNotification } from "@/lib/transactions/parse-notification";

describe("parseNotification", () => {
  it("extrai compra brasileira com milhares e estabelecimento", () => {
    const parsed = parseNotification(
      "Compra aprovada de R$ 1.234,56 em MERCADO MODELO no seu cartão em 28/07/2026 às 14:32",
      new Date("2026-08-01T10:00:00-03:00"),
    );
    expect(parsed.amount).toBe(1234.56);
    expect(parsed.merchant).toBe("MERCADO MODELO");
    expect(parsed.transactedAt.getDate()).toBe(28);
    expect(parsed.transactedAt.getHours()).toBe(14);
  });

  it("aceita formato de Pix", () => {
    const parsed = parseNotification(
      "Pix enviado no valor de R$ 48,90 para Padaria Primavera.",
      new Date("2026-08-01T10:00:00-03:00"),
    );
    expect(parsed.amount).toBe(48.9);
    expect(parsed.merchant).toBe("Padaria Primavera");
  });

  it("normaliza formatos monetários com separadores distintos", () => {
    expect(parseBrazilianAmount("R$ 1.234,56")).toBe(1234.56);
    expect(parseBrazilianAmount("1,234.56")).toBe(1234.56);
  });
});
