import Link from "next/link";
import { addMonths, startOfMonth, subMonths } from "date-fns";
import { PageHeader } from "@/components/page-header";
import { AnimatedMoney } from "@/components/animated-money";
import { ProgressBar } from "@/components/progress-bar";
import { CategoryChart, TrendChart } from "@/components/dashboard-charts";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, monthLabel } from "@/lib/format";
import { normalizeSearchText } from "@/lib/transactions/parse-notification";

export const metadata = { title: "Visão geral" };

export default async function DashboardPage() {
  const user = await requireUser();
  const now = new Date();
  const currentStart = startOfMonth(now);
  const nextStart = addMonths(currentStart, 1);
  const previousStart = subMonths(currentStart, 1);
  const trendStart = subMonths(currentStart, 5);
  const recurringStart = subMonths(now, 4);

  const [transactions, budgets, goals, recent, recurringCandidates] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: user.id, type: "EXPENSE", transactedAt: { gte: trendStart, lt: nextStart } },
      include: { category: true },
      orderBy: { transactedAt: "asc" },
    }),
    prisma.budget.findMany({
      where: { userId: user.id, month: { gte: currentStart, lt: nextStart } },
      include: { category: true },
      orderBy: { category: { position: "asc" } },
    }),
    prisma.goal.findMany({ where: { userId: user.id, status: { in: ["ACTIVE", "ACHIEVED"] } }, orderBy: { createdAt: "desc" }, take: 3 }),
    prisma.transaction.findMany({ where: { userId: user.id }, include: { category: true }, orderBy: { transactedAt: "desc" }, take: 5 }),
    prisma.transaction.findMany({ where: { userId: user.id, type: "EXPENSE", transactedAt: { gte: recurringStart } }, orderBy: { transactedAt: "desc" }, take: 500 }),
  ]);

  const currentTransactions = transactions.filter((item) => item.transactedAt >= currentStart);
  const previousTransactions = transactions.filter((item) => item.transactedAt >= previousStart && item.transactedAt < currentStart);
  const currentTotal = currentTransactions.reduce((sum, item) => sum + Number(item.amount), 0);
  const previousTotal = previousTransactions.reduce((sum, item) => sum + Number(item.amount), 0);
  const comparison = previousTotal ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;

  const trend = Array.from({ length: 6 }, (_, index) => {
    const start = addMonths(trendStart, index);
    const end = addMonths(start, 1);
    return {
      month: monthLabel(start),
      total: transactions
        .filter((item) => item.transactedAt >= start && item.transactedAt < end)
        .reduce((sum, item) => sum + Number(item.amount), 0),
    };
  });

  const categoryMap = new Map<string, { name: string; total: number; color: string }>();
  for (const item of currentTransactions) {
    const previous = categoryMap.get(item.categoryId);
    categoryMap.set(item.categoryId, {
      name: item.category.name,
      color: item.category.color,
      total: (previous?.total ?? 0) + Number(item.amount),
    });
  }
  const categories = Array.from(categoryMap.values()).sort((a, b) => b.total - a.total);

  const recurringGroups = new Map<string, typeof recurringCandidates>();
  for (const item of recurringCandidates) {
    const key = normalizeSearchText(item.merchant);
    if (!key || key === "estabelecimento nao identificado") continue;
    recurringGroups.set(key, [...(recurringGroups.get(key) ?? []), item]);
  }
  const recurring = Array.from(recurringGroups.values())
    .filter((items) => items.length >= 2 && new Set(items.map((item) => `${item.transactedAt.getFullYear()}-${item.transactedAt.getMonth()}`)).size >= 2)
    .map((items) => ({
      merchant: items[0].merchant,
      average: items.reduce((sum, item) => sum + Number(item.amount), 0) / items.length,
      count: items.length,
    }))
    .sort((a, b) => b.average - a.average)
    .slice(0, 3);

  const spentByCategory = new Map<string, number>();
  for (const item of currentTransactions) spentByCategory.set(item.categoryId, (spentByCategory.get(item.categoryId) ?? 0) + Number(item.amount));

  return (
    <>
      <PageHeader
        eyebrow={`Caderno / ${new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(now)}`}
        title="Visão geral"
        action={<Link className="button" href="/transacoes#novo">+ novo registro</Link>}
      />

      <section className="dashboard-grid">
        <div className="hero-balance">
          <span className="hero-label">Saídas neste mês</span>
          <AnimatedMoney className="hero-value" value={currentTotal} />
          <div className="hero-meta">
            <div>
              <span className="hero-label">Mês anterior</span>
              <strong>{formatCurrency(previousTotal)}</strong>
            </div>
            <div>
              <span className="hero-label">Variação</span>
              <strong>{comparison > 0 ? "+" : ""}{comparison.toFixed(1)}%</strong>
            </div>
          </div>
        </div>

        <div className="stack">
          <div>
            <div className="section-rule" style={{ marginTop: 0 }}><h2>Limites do mês</h2><span>{budgets.length}</span></div>
            {budgets.length ? (
              <div className="budget-tape">
                {budgets.map((budget) => {
                  const spent = spentByCategory.get(budget.categoryId) ?? 0;
                  const percentage = (spent / Number(budget.limit)) * 100;
                  return (
                    <div className="budget-line" key={budget.id}>
                      <header><strong>{budget.category.name}</strong><small>{Math.round(percentage)}%</small></header>
                      <ProgressBar threshold={budget.alertAt} value={percentage} />
                      <small>{formatCurrency(spent)} de {formatCurrency(Number(budget.limit))}</small>
                    </div>
                  );
                })}
              </div>
            ) : <div className="notice">Defina limites por categoria em Planos & limites.</div>}
          </div>
          {recurring.length > 0 && (
            <div>
              <div className="section-rule"><h2>Sinais recorrentes</h2><span>120 dias</span></div>
              <div className="stack">
                {recurring.map((item) => (
                  <div className="budget-line" key={item.merchant}>
                    <header><strong>{item.merchant}</strong><small>{item.count}×</small></header>
                    <span className="field-help">média {formatCurrency(item.average)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="section-rule"><h2>Leitura do período</h2><span>últimos 6 meses</span></div>
      <section className="chart-grid">
        <div className="ledger-panel chart-box">
          <div className="chart-heading"><h3>Ritmo das despesas</h3><span>R$ / mês</span></div>
          <TrendChart data={trend} />
        </div>
        <div className="ledger-panel chart-box">
          <div className="chart-heading"><h3>Onde pesou</h3><span>mês atual</span></div>
          {categories.length ? <CategoryChart data={categories} /> : <div className="empty-state">Sem despesas no mês.</div>}
        </div>
      </section>

      {goals.length > 0 && (
        <>
          <div className="section-rule"><h2>Metas em curso</h2><Link className="text-link" href="/planejamento">ver todas</Link></div>
          <section className="dashboard-grid">
            {goals.map((goal) => {
              const percentage = Math.min(100, (Number(goal.currentAmount) / Number(goal.targetAmount)) * 100);
              return (
                <div className="goal-line" key={goal.id}>
                  <header><strong>{goal.title}</strong><small>{goal.deadline ? formatDate(goal.deadline) : "sem prazo"}</small></header>
                  <p className="goal-value">{formatCurrency(Number(goal.currentAmount))} <small>/ {formatCurrency(Number(goal.targetAmount))}</small></p>
                  <ProgressBar value={percentage} />
                </div>
              );
            })}
          </section>
        </>
      )}

      <div className="section-rule"><h2>Últimos movimentos</h2><Link className="text-link" href="/transacoes">abrir extrato</Link></div>
      {recent.length ? (
        <div className="transaction-list">
          {recent.map((item) => (
            <div className="transaction-row" key={item.id}>
              <span className="transaction-date">{formatDate(item.transactedAt)}</span>
              <span className="transaction-merchant">{item.merchant}<small>{item.description}</small></span>
              <span className="category-tag" style={{ "--category-color": item.category.color } as React.CSSProperties}>{item.category.name}</span>
              <span className={`money ${item.type === "INCOME" ? "income" : ""}`}>{item.type === "INCOME" ? "+" : "−"}{formatCurrency(Number(item.amount))}</span>
            </div>
          ))}
        </div>
      ) : <div className="empty-state"><strong>O livro ainda está em branco.</strong>Registre uma despesa ou conecte o celular.</div>}
    </>
  );
}
