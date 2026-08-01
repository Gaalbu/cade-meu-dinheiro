import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="brand" href="/">
      <span className="brand-mark">F.</span>
      {!compact && (
        <span>
          fio
          <small>livro-caixa pessoal</small>
        </span>
      )}
    </Link>
  );
}
