import { addMonths, startOfMonth } from "date-fns";
import { createGoal, addGoalProgress, saveBudget } from "@/app/actions/finance";
import { PageHeader } from "@/components/page-header";
import { ProgressBar } from "@/components/progress-bar";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/format";

export const metadata = { title: "Planos e limites" };

export default async function PlanningPage({ searchParams }: { searchParams: Promise<{ mensagem?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const month = startOfMonth(new Date());
  const nextMonth = addMonths(month, 1);
  const [categories, budgets, goals, expenses] = await Promise.all([
    prisma.category.findMany({ where: { userId: user.id }, orderBy: { position: "asc" } }),
    prisma.budget.findMany({ where: { userId: user.id, month: { gte: month, lt: nextMonth } }, include: { category: true }, orderBy: { category: { position: "asc" } } }),
    prisma.goal.findMany({ where: { userId: user.id }, orderBy: [{ status: "asc" }, { createdAt: "desc" }] }),
    prisma.transaction.findMany({ where: { userId: user.id, type: "EXPENSE", transactedAt: { gte: month, lt: nextMonth } }, select: { categoryId: true, amount: true } }),
  ]);
  const spent = new Map<string, number>();
  expenses.forEach((item) => spent.set(item.categoryId, (spent.get(item.categoryId) ?? 0) + Number(item.amount)));
  const monthInput = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;

  return (
    <>
      <PageHeader eyebrow="Intenção / antes da compra" title="Planos & limites" note="Orçamentos transformam categorias em sinais; metas transformam sobra em destino." />
      {params.mensagem && <p className="notice success">{params.mensagem}</p>}
      <section className="split-layout">
        <div>
          <div className="section-rule" style={{ marginTop: 0 }}><h2>Orçamento do mês</h2><span>{monthInput}</span></div>
          {budgets.length ? (
            <div className="budget-tape">
              {budgets.map((budget) => {
                const used = spent.get(budget.categoryId) ?? 0;
                const percentage = (used / Number(budget.limit)) * 100;
                return (
                  <div className="budget-line" key={budget.id}>
                    <header><strong>{budget.category.name}</strong><small>{Math.round(percentage)}% usado</small></header>
                    <ProgressBar threshold={budget.alertAt} value={percentage} />
                    <span className="field-help">{formatCurrency(used)} / {formatCurrency(Number(budget.limit))} · alerta em {budget.alertAt}%</span>
                    {percentage >= 100 && <p className="notice error" style={{ margin: "0.75rem 0 0" }}>Limite ultrapassado em {formatCurrency(used - Number(budget.limit))}.</p>}
                  </div>
                );
              })}
            </div>
          ) : <div className="empty-state"><strong>Sem limites definidos.</strong>Comece pela categoria que costuma escapar.</div>}
        </div>
        <form action={saveBudget} className="ledger-panel form-grid">
          <div className="field full"><label htmlFor="budget-category">Categoria</label><select id="budget-category" name="categoryId" required>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
          <div className="field"><label htmlFor="limit">Limite</label><input id="limit" inputMode="decimal" name="limit" placeholder="600,00" required /></div>
          <div className="field"><label htmlFor="alertAt">Alertar em</label><input defaultValue="80" id="alertAt" max="100" min="10" name="alertAt" type="number" /></div>
          <div className="field full"><label htmlFor="month">Mês</label><input defaultValue={monthInput} id="month" name="month" required type="month" /></div>
          <div className="form-actions"><button className="button">Salvar limite</button></div>
        </form>
      </section>

      <div className="section-rule"><h2>Metas de reserva</h2><span>{goals.length} destino(s)</span></div>
      <section className="split-layout">
        <div className="stack">
          {goals.length ? goals.map((goal) => {
            const percentage = Math.min(100, (Number(goal.currentAmount) / Number(goal.targetAmount)) * 100);
            return (
              <article className="goal-line" key={goal.id}>
                <header><strong>{goal.title}</strong><small>{goal.status === "ACHIEVED" ? "concluída" : goal.deadline ? `até ${formatDate(goal.deadline)}` : "sem prazo"}</small></header>
                <p className="goal-value">{formatCurrency(Number(goal.currentAmount))} <small>de {formatCurrency(Number(goal.targetAmount))}</small></p>
                <ProgressBar value={percentage} />
                {goal.status !== "ACHIEVED" && (
                  <form action={addGoalProgress.bind(null, goal.id)} style={{ display: "flex", gap: "0.5rem", marginTop: "0.8rem" }}>
                    <div className="field" style={{ flex: 1 }}><input aria-label="Valor a adicionar" inputMode="decimal" name="addition" placeholder="Adicionar valor" required /></div>
                    <button className="button secondary">+ guardar</button>
                  </form>
                )}
              </article>
            );
          }) : <div className="empty-state"><strong>Nenhum destino ainda.</strong>Dê um nome concreto à próxima reserva.</div>}
        </div>
        <form action={createGoal} className="ledger-panel form-grid">
          <div className="field full"><label htmlFor="title">Nome da meta</label><input id="title" maxLength={80} name="title" placeholder="Ex.: Reserva de emergência" required /></div>
          <div className="field"><label htmlFor="targetAmount">Valor alvo</label><input id="targetAmount" inputMode="decimal" name="targetAmount" placeholder="10.000,00" required /></div>
          <div className="field"><label htmlFor="currentAmount">Já reservado</label><input defaultValue="0" id="currentAmount" inputMode="decimal" name="currentAmount" /></div>
          <div className="field full"><label htmlFor="deadline">Prazo opcional</label><input id="deadline" name="deadline" type="date" /></div>
          <div className="form-actions"><button className="button">Criar meta</button></div>
        </form>
      </section>
    </>
  );
}
