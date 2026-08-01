import { notFound } from "next/navigation";
import Link from "next/link";
import { updateTransaction } from "@/app/actions/finance";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function EditTransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const [transaction, categories] = await Promise.all([
    prisma.transaction.findFirst({ where: { id, userId: user.id } }),
    prisma.category.findMany({ where: { userId: user.id }, orderBy: { position: "asc" } }),
  ]);
  if (!transaction) notFound();

  return (
    <>
      <PageHeader eyebrow="Correção / lançamento" title="Ajustar linha" action={<Link className="button secondary" href="/transacoes">← voltar</Link>} />
      <form action={updateTransaction.bind(null, transaction.id)} className="ledger-panel form-grid">
        <div className="field">
          <label htmlFor="merchant">Estabelecimento</label>
          <input defaultValue={transaction.merchant} id="merchant" maxLength={80} name="merchant" required />
        </div>
        <div className="field">
          <label htmlFor="amount">Valor</label>
          <input defaultValue={Number(transaction.amount).toFixed(2).replace(".", ",")} id="amount" inputMode="decimal" name="amount" required />
        </div>
        <div className="field">
          <label htmlFor="date">Data</label>
          <input defaultValue={transaction.transactedAt.toISOString().slice(0, 10)} id="date" name="date" required type="date" />
        </div>
        <div className="field">
          <label htmlFor="type">Movimento</label>
          <select defaultValue={transaction.type} id="type" name="type"><option value="EXPENSE">Saída</option><option value="INCOME">Entrada</option></select>
        </div>
        <div className="field">
          <label htmlFor="categoryId">Categoria</label>
          <select defaultValue={transaction.categoryId} id="categoryId" name="categoryId">
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="description">Observação</label>
          <input defaultValue={transaction.description ?? ""} id="description" maxLength={240} name="description" />
        </div>
        <label className="notice full" style={{ gridColumn: "1 / -1" }}>
          <input name="rememberRule" type="checkbox" /> Aprender esta correção para lançamentos futuros com o mesmo estabelecimento.
        </label>
        {transaction.rawNotification && (
          <div className="field full">
            <label>Notificação original</label>
            <code className="code-line">{transaction.rawNotification}</code>
          </div>
        )}
        <div className="form-actions"><button className="button" type="submit">Salvar correção</button></div>
      </form>
    </>
  );
}
