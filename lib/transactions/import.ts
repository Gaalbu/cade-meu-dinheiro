import Papa from "papaparse";
import { parseBrazilianAmount } from "@/lib/transactions/parse-notification";

export type ImportedTransaction = {
  amount: number;
  merchant: string;
  description?: string;
  date: Date;
  type: "EXPENSE" | "INCOME";
  externalId?: string;
};

function parseLooseDate(raw: string) {
  const value = raw.trim();
  const br = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (br) {
    const year = Number(br[3].length === 2 ? `20${br[3]}` : br[3]);
    return new Date(year, Number(br[2]) - 1, Number(br[1]), 12);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(`Data inválida: ${value}`);
  return parsed;
}

function valueFrom(row: Record<string, string>, names: string[]) {
  const key = Object.keys(row).find((candidate) =>
    names.includes(
      candidate
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim(),
    ),
  );
  return key ? row[key] : "";
}

export function parseCsv(text: string): ImportedTransaction[] {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });
  if (result.errors.length && !result.data.length) throw new Error(result.errors[0].message);

  return result.data.map((row, index) => {
    const rawAmount = valueFrom(row, ["valor", "amount", "quantia", "montante"]);
    const rawDate = valueFrom(row, ["data", "date", "data da transacao", "data lancamento"]);
    const merchant = valueFrom(row, ["estabelecimento", "merchant", "descricao", "description", "historico"]);
    if (!rawAmount || !rawDate || !merchant) {
      throw new Error(`Linha ${index + 2}: são necessárias colunas de data, valor e descrição.`);
    }
    const amount = parseBrazilianAmount(rawAmount);
    const typeLabel = valueFrom(row, ["tipo", "type", "natureza"]);
    const isIncome = rawAmount.trim().startsWith("+") || /receita|cr[eé]dito|entrada|income/i.test(typeLabel);
    return {
      amount,
      merchant: merchant.trim().slice(0, 80),
      description: valueFrom(row, ["descricao", "description", "historico"]).slice(0, 240),
      date: parseLooseDate(rawDate),
      type: isIncome ? "INCOME" : "EXPENSE",
      externalId: valueFrom(row, ["id", "identificador", "transaction id"]),
    };
  });
}

function tag(block: string, name: string) {
  return block.match(new RegExp(`<${name}>([^<\\r\\n]+)`, "i"))?.[1]?.trim() ?? "";
}

export function parseOfx(text: string): ImportedTransaction[] {
  const blocks = text.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) ?? text.match(/<STMTTRN>[\s\S]*?(?=<STMTTRN>|<\/BANKTRANLIST>)/gi) ?? [];
  if (!blocks.length) throw new Error("Nenhum lançamento STMTTRN foi encontrado no OFX.");

  return blocks.map((block) => {
    const rawAmount = tag(block, "TRNAMT");
    const signedAmount = Number(rawAmount.replace(",", "."));
    const rawDate = tag(block, "DTPOSTED");
    const merchant = tag(block, "NAME") || tag(block, "MEMO") || "Lançamento importado";
    const year = Number(rawDate.slice(0, 4));
    const month = Number(rawDate.slice(4, 6));
    const day = Number(rawDate.slice(6, 8));
    return {
      amount: Math.abs(signedAmount),
      merchant: merchant.slice(0, 80),
      description: tag(block, "MEMO").slice(0, 240),
      date: new Date(year, month - 1, day, 12),
      type: signedAmount > 0 ? "INCOME" : "EXPENSE",
      externalId: tag(block, "FITID"),
    };
  });
}
