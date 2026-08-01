import { normalizeSearchText } from "@/lib/transactions/parse-notification";

export type CategorizationRule = {
  keyword: string;
  categoryId: string;
  priority: number;
};

export function categorizeText(
  value: string,
  rules: CategorizationRule[],
  fallbackCategoryId: string,
) {
  const normalized = ` ${normalizeSearchText(value)} `;
  const match = [...rules]
    .sort((a, b) => b.priority - a.priority || b.keyword.length - a.keyword.length)
    .find((rule) => normalized.includes(` ${normalizeSearchText(rule.keyword)} `));
  return match?.categoryId ?? fallbackCategoryId;
}
