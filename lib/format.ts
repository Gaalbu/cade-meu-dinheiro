export const formatCurrency = (value: number | string, currency = "BRL") =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number(value));

export const formatDate = (value: Date | string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

export const monthLabel = (value: Date) =>
  new Intl.DateTimeFormat("pt-BR", { month: "short" })
    .format(value)
    .replace(".", "")
    .toUpperCase();
