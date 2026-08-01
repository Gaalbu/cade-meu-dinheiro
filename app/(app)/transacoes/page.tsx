import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { createTransaction, importStatement } from "@/app/actions/finance";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/format";

export const metadata = { title: "Transações" };

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categoria?: string; mensagem?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const [categories, transactions] = await Promise.all([
    prisma.category.findMany({ where: { userId: user.id }, orderBy: { position: "asc" } }),
    prisma.transaction.findMany({
      where: {
        userId: user.id,
        ...(params.categoria ? { category: { slug: params.categoria } } : {}),
        ...(query
          ? { OR: [{ merchant: { contains: query, mode: "insensitive" } }, { description: { contains: query, mode: "insensitive" } }] }
          : {}),
      },
      include: { category: true },
      orderBy: { transactedAt: "desc" },
      take: 150,
    }),
  ]);
  const defaultCategory = categories.find((item) => item.slug === "outros") ?? categories[0];
  const expenses = transactions.filter((item) => item.type === "EXPENSE").reduce((sum, item) => sum + Number(item.amount), 0);

  return (
    <>
      <PageHeader
        eyebrow="Arquivo / entradas e saídas"
        title="Transações"
        action={<span className="stamp-note">{transactions.length} linhas · {formatCurrency(expenses)}</span>}
      />
      {params.mensagem && <p className="notice success">{params.mensagem}</p>}

      <section className="split-layout" id="novo">
        <details className="ledger-panel" open={transactions.length === 0}>
          <summary className="button">+ registrar manualmente</summary>
          <div className="section-rule"><h2>Novo lançamento</h2><span>campos obrigatórios *</span></div>
          <form action={createTransaction} className="form-grid">
            <div className="field">
              <label htmlFor="merchant">Estabelecimento *</label>
              <input id="merchant" maxLength={80} name="merchant" placeholder="Ex.: Mercado Modelo" required />
            </div>
            <div className="field">
              <label htmlFor="amount">Valor *</label>
              <input id="amount" inputMode="decimal" name="amount" placeholder="0,00" required />
            </div>
            <div className="field">
              <label htmlFor="date">Data *</label>
              <input defaultValue={new Date().toISOString().slice(0, 10)} id="date" name="date" required type="date" />
            </div>
            <div className="field">
              <label htmlFor="type">Movimento</label>
              <select defaultValue="EXPENSE" id="type" name="type"><option value="EXPENSE">Saída</option><option value="INCOME">Entrada</option></select>
            </div>
            <div className="field">
              <label htmlFor="categoryId">Categoria *</label>
              <select defaultValue={defaultCategory?.id} id="categoryId" name="categoryId" required>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="description">Observação</label>
              <input id="description" maxLength={240} name="description" placeholder="Opcional" />
            </div>
            <div className="form-actions"><button className="button" type="submit">Gravar no livro</button></div>
          </form>
        </details>

        <details className="ledger-panel">
          <summary className="button secondary">Importar extrato</summary>
          <div className="section-rule"><h2>CSV ou OFX</h2><span>até 5 MB</span></div>
          <form action={importStatement} className="stack">
            <div className="field">
              <label htmlFor="statement">Arquivo do banco</label>
              <input accept=".csv,.ofx,text/csv,application/x-ofx" id="statement" name="statement" required type="file" />
              <span className="field-help">CSV: colunas Data, Valor e Descrição/Estabelecimento. Duplicatas são ignoradas.</span>
            </div>
            <button className="button" type="submit">Ler e categorizar</button>
          </form>
        </details>
      </section>

      <div className="section-rule"><h2>Extrato consolidado</h2><span>máx. 150 linhas</span></div>
      <form className="form-grid" method="get">
        <div className="field">
          <label htmlFor="q">Buscar</label>
          <input defaultValue={query} id="q" name="q" placeholder="estabelecimento ou observação" />
        </div>
        <div className="field">
          <label htmlFor="categoria">Categoria</label>
          <select defaultValue={params.categoria ?? ""} id="categoria" name="categoria">
            <option value="">Todas</option>
            {categories.map((category) => <option key={category.id} value={category.slug}>{category.name}</option>)}
          </select>
        </div>
        <div className="form-actions"><button className="button secondary">Aplicar filtro</button></div>
      </form>

      {transactions.length ? (
        <div className="transaction-list">
          {transactions.map((item) => (
            <div className="transaction-row" key={item.id}>
              <span className="transaction-date">{formatDate(item.transactedAt)}<br />{item.source}</span>
              <span className="transaction-merchant">{item.merchant}<small>{item.description}</small></span>
              <span className="category-tag" style={{ "--category-color": item.category.color } as React.CSSProperties}>{item.category.name}</span>
              <span className={`money ${item.type === "INCOME" ? "income" : ""}`}>{item.type === "INCOME" ? "+" : "−"}{formatCurrency(Number(item.amount))}</span>
              <Link aria-label={`Editar ${item.merchant}`} className="row-action" href={`/transacoes/${item.id}`}>↗</Link>
            </div>
          ))}
        </div>
      ) : <div className="empty-state"><strong>Nenhuma linha encontrada.</strong>Ajuste o filtro ou registre o primeiro movimento.</div>}
    </>
  );
}
