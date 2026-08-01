import Link from "next/link";
import { Brand } from "@/components/brand";
import { getOptionalUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getOptionalUser();
  return (
    <main className="landing">
      <nav className="landing-nav">
        <Brand />
        <Link className="button secondary" href={user ? "/dashboard" : "/entrar"}>
          {user ? "Abrir meu livro" : "Entrar / criar conta"}
        </Link>
      </nav>
      <section className="landing-hero">
        <div className="landing-copy">
          <div>
            <p className="eyebrow">Finanças pessoais, sem ruído</p>
            <h1>Veja para onde o dinheiro <em>foi.</em></h1>
            <p>
              Um livro-caixa que transforma notificações do banco em contexto: categorias,
              tendências, limites e metas — cada pessoa no seu próprio espaço.
            </p>
            <Link className="button" href={user ? "/dashboard" : "/entrar"}>
              Começar meu registro <span aria-hidden>→</span>
            </Link>
          </div>
          <p className="page-note">
            Captura no Android via Tasker ou MacroDroid. A plataforma web nunca lê suas
            notificações diretamente.
          </p>
        </div>
        <aside className="landing-aside">
          <div className="receipt-demo" aria-label="Exemplo de despesa categorizada">
            <header><span>ENTRADA #0047</span><span>AUTOMÁTICA</span></header>
            <p className="eyebrow">Alimentação / hoje, 12:42</p>
            <h2>Mercado do bairro</h2>
            <p className="receipt-value">R$ 86,40</p>
            <footer>
              “Compra aprovada no cartão final 0291 em MERCADO DO BAIRRO...”<br />
              REGRA: mercado → alimentação
            </footer>
          </div>
        </aside>
      </section>
    </main>
  );
}
