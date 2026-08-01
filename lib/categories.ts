export type DefaultCategory = {
  slug: string;
  name: string;
  color: string;
  glyph: string;
  keywords: string[];
};

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  {
    slug: "alimentacao",
    name: "Alimentação",
    color: "#D94E32",
    glyph: "A",
    keywords: [
      "ifood",
      "restaurante",
      "lanchonete",
      "padaria",
      "mercado",
      "supermercado",
      "atacadao",
      "carrefour",
      "assai",
      "delivery",
    ],
  },
  {
    slug: "transporte",
    name: "Transporte",
    color: "#16615B",
    glyph: "T",
    keywords: [
      "uber",
      "99app",
      "99 pop",
      "posto",
      "combustivel",
      "gasolina",
      "estacionamento",
      "metro",
      "onibus",
    ],
  },
  {
    slug: "moradia",
    name: "Moradia",
    color: "#365E9D",
    glyph: "M",
    keywords: [
      "aluguel",
      "condominio",
      "energia",
      "embasa",
      "internet",
      "claro",
      "vivo",
      "tim",
      "iptu",
    ],
  },
  {
    slug: "lazer",
    name: "Lazer",
    color: "#BD7A22",
    glyph: "L",
    keywords: [
      "netflix",
      "spotify",
      "cinema",
      "teatro",
      "steam",
      "playstation",
      "bar ",
      "show",
    ],
  },
  {
    slug: "saude",
    name: "Saúde",
    color: "#9D3C5B",
    glyph: "S",
    keywords: ["farmacia", "drogaria", "clinica", "hospital", "laboratorio", "medico"],
  },
  {
    slug: "outros",
    name: "Outros",
    color: "#6D6B62",
    glyph: "O",
    keywords: [],
  },
];
