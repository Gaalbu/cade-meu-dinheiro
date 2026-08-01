import Link from "next/link";

export default function ConfirmedPage() {
  return (
    <main className="auth-form-wrap" style={{ minHeight: "100vh" }}>
      <div className="auth-form">
        <p className="eyebrow">Conta confirmada</p>
        <h1>Seu livro está pronto.</h1>
        <p className="notice success">E-mail confirmado. Agora você já pode entrar.</p>
        <Link className="button" href="/entrar">Ir para o acesso</Link>
      </div>
    </main>
  );
}
