import { describe, expect, it } from "vitest";
import { categorizeText } from "@/lib/transactions/categorize";

describe("categorizeText", () => {
  it("prioriza regra explícita e respeita limites de palavra", () => {
    const rules = [
      { keyword: "mercado", categoryId: "food", priority: 10 },
      { keyword: "uber", categoryId: "transport", priority: 20 },
    ];
    expect(categorizeText("Compra em UBER *TRIP", rules, "other")).toBe("transport");
    expect(categorizeText("Assinatura Suber", rules, "other")).toBe("other");
  });
});
