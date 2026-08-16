export type ParsedNotification = {
  amount: number;
  merchant: string;
  transactedAt: Date;
  description: string;
};

export function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function parseBrazilianAmount(raw: string) {
  const clean = raw.replace(/[^\d,.-]/g, "");
  if (!clean) return Number.NaN;
  const lastComma = clean.lastIndexOf(",");
  const lastDot = clean.lastIndexOf(".");
  let normalized = clean;
  if (lastComma >= 0 && lastDot >= 0) {
    normalized = lastComma > lastDot
      ? clean.replace(/\./g, "").replace(",", ".")
      : clean.replace(/,/g, "");
  } else if (lastComma >= 0) {
    normalized = clean.replace(/\./g, "").replace(",", ".");
  } else if ((clean.match(/\./g) ?? []).length > 1) {
    normalized = clean.replace(/\./g, "");
  }
  return Math.abs(Number(normalized));
}

function extractAmount(text: string) {
  const patterns = [
    /R\$\s*(-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d+[,.]\d{2})/i,
    /(?:valor|compra|pagamento|pix)\D{0,15}(-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d+[,.]\d{2})/i,
    /(-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d+[,.]\d{2})/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const amount = parseBrazilianAmount(match[1]);
      if (Number.isFinite(amount) && amount > 0) return amount;
    }
  }
  throw new Error("Não foi possível identificar o valor da transação.");
}

function cleanMerchant(value: string) {
  return value
    .replace(/\s+(?:no|na|do|da)\s+(?:seu\s+)?(?:cart[aã]o|cr[eé]dito|d[eé]bito).*$/i, "")
    .replace(/\s+(?:valor|R\$|dia|[àa]s)\s.*$/i, "")
    .replace(/[;,.!]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 80);
}

function extractMerchant(text: string) {
  const explicit = text.match(/(?:estabelecimento|lojista|favorecido|recebedor)\s*[:-]\s*([^;\n,.]{2,80})/i);
  if (explicit) return cleanMerchant(explicit[1]);

  const candidates = Array.from(
    text.matchAll(/\b(?:em|no|na|para)\s+([^,;.\n]{2,90})/gi),
  )
    .map((match) => cleanMerchant(match[1]))
    .filter((value) => {
      const normalized = normalizeSearchText(value);
      return (
        value.length >= 2 &&
        !/^(seu|minha|cartao|credito|debito|conta|valor|r\$|\d)/.test(normalized)
      );
    });

  return candidates.at(-1) || "Estabelecimento não identificado";
}

function extractDate(text: string, fallback: Date) {
  const dateMatch = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  const timeMatch = text.match(/\b(\d{1,2}):(\d{2})\b/);
  const result = new Date(fallback);

  if (dateMatch) {
    const yearRaw = dateMatch[3];
    const year = yearRaw
      ? Number(yearRaw.length === 2 ? `20${yearRaw}` : yearRaw)
      : fallback.getFullYear();
    result.setFullYear(year, Number(dateMatch[2]) - 1, Number(dateMatch[1]));
  }
  if (timeMatch) result.setHours(Number(timeMatch[1]), Number(timeMatch[2]), 0, 0);
  return result;
}

export function parseNotification(text: string, fallbackDate = new Date()): ParsedNotification {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length < 8) throw new Error("A notificação está vazia ou curta demais.");

  return {
    amount: extractAmount(trimmed),
    merchant: extractMerchant(trimmed),
    transactedAt: extractDate(trimmed, fallbackDate),
    description: trimmed.slice(0, 240),
  };
}
