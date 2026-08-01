import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { getOptionalUser } from "@/lib/auth";
import { signIn, signUp } from "@/app/actions/auth";

export const metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; mensagem?: string }>;
}) {
  const user = await getOptionalUser();
  if (user) redirect("/dashboard");
  const params = await searchParams;

  return (
    <main className="auth-layout">
      <aside className="auth-manifesto">
        <Brand />
        <blockquote>“O que se mede deixa de ser um susto e vira uma escolha.”</blockquote>
        <p className="page-note">Cada conta possui dados e tokens de captura isolados.</p>
      </aside>
      <section className="auth-form-wrap">
        <div className="auth-form">
          <p className="eyebrow">Acesso ao livro-caixa</p>
          <h1>Sua conta, seus números.</h1>
          <p>Entre ou crie uma conta. O mesmo formulário serve para os dois caminhos.</p>
          {params.erro && <p className="notice error">{params.erro}</p>}
          {params.mensagem && <p className="notice success">{params.mensagem}</p>}
          <form>
            <div className="field">
              <label htmlFor="email">E-mail</label>
              <input autoComplete="email" id="email" name="email" placeholder="voce@exemplo.com" required type="email" />
            </div>
            <div className="field">
              <label htmlFor="password">Senha</label>
              <input autoComplete="current-password" id="password" minLength={8} name="password" placeholder="mínimo de 8 caracteres" required type="password" />
            </div>
            <button className="button" formAction={signIn}>Entrar</button>
            <button className="button secondary" formAction={signUp}>Criar uma conta</button>
          </form>
        </div>
      </section>
    </main>
  );
}
