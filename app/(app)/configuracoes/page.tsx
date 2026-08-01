import { PageHeader } from "@/components/page-header";
import { TokenManager } from "@/components/token-manager";
import { revokeToken } from "@/app/actions/finance";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const user = await requireUser();
  const tokens = await prisma.webhookToken.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const endpoint = `${baseUrl}/api/webhook/transacao`;

  return (
    <>
      <PageHeader eyebrow="Ponte / celular → livro" title="Configurações" note="O Android captura a notificação; o Fio recebe somente o texto enviado ao endpoint autenticado." />
      <section className="split-layout">
        <div>
          <div className="section-rule" style={{ marginTop: 0 }}><h2>Tokens de captura</h2><span>sigilo por dispositivo</span></div>
          <p className="notice">
            Um app web não tem permissão para ler notificações do sistema. Use Tasker, MacroDroid ou um app Android auxiliar para fazer o POST. Cada token pertence apenas à sua conta.
          </p>
          <div className="ledger-panel"><TokenManager /></div>
          <div className="section-rule"><h2>Dispositivos cadastrados</h2><span>{tokens.filter((item) => !item.revokedAt).length} ativo(s)</span></div>
          <div className="stack">
            {tokens.length ? tokens.map((token) => (
              <div className="budget-line" key={token.id}>
                <header><strong>{token.name}</strong><small>{token.revokedAt ? "REVOGADO" : "ATIVO"}</small></header>
                <code className="field-help">{token.tokenPrefix}</code><br />
                <span className="field-help">Criado em {formatDate(token.createdAt)} · último uso {token.lastUsedAt ? formatDate(token.lastUsedAt) : "nunca"}</span>
                {!token.revokedAt && <form action={revokeToken.bind(null, token.id)}><button className="link-button" style={{ color: "var(--stamp-dark)" }}>Revogar acesso</button></form>}
              </div>
            )) : <div className="empty-state"><strong>Nenhum token ainda.</strong>Gere um para conectar o primeiro aparelho.</div>}
          </div>
        </div>

        <aside>
          <div className="section-rule" style={{ marginTop: 0 }}><h2>Receita do webhook</h2><span>POST / TEXTO</span></div>
          <code className="code-line">{`URL: ${endpoint}\n\nAuthorization: Bearer SEU_TOKEN\nContent-Type: text/plain\nIdempotency-Key: identificador-unico\n\nCompra de R$ 42,90 em PADARIA SOL`}</code>
          <div className="section-rule"><h2>Tasker · resumo</h2><span>Android</span></div>
          <ol className="steps">
            <li>Crie um perfil de evento “Notification” e selecione os apps bancários.</li>
            <li>Na tarefa, adicione “HTTP Request”, método POST e use a URL acima.</li>
            <li>Adicione os cabeçalhos Authorization e Content-Type mostrados.</li>
            <li>Use Content-Type: text/plain e envie <code>%evtprm3</code> no corpo. Se o banco separa título e texto, use <code>%evtprm2 %evtprm3</code>.</li>
            <li>Faça uma compra pequena ou use “Play/Test” e confirme a entrada em Transações.</li>
          </ol>
          <div className="section-rule"><h2>MacroDroid · resumo</h2><span>Android</span></div>
          <ol className="steps">
            <li>Gatilho: “Notificação recebida”, filtrando o app do banco e ignorando notificações contínuas.</li>
            <li>Ação: “HTTP Request”, POST, URL acima; formato de conteúdo text/plain.</li>
            <li>Header Authorization: <code>Bearer SEU_TOKEN</code>.</li>
            <li>Corpo: <code>{`{not_title} {notification}`}</code>, inserindo os textos mágicos pelo botão “…” do MacroDroid.</li>
          </ol>
        </aside>
      </section>
    </>
  );
}
