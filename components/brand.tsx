import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="brand" href="/">
      <span className="brand-mark">C$</span>
      {!compact && (
        <span>
          cadê?
          <small>meu dinheiro · livro-caixa</small>
        </span>
      )}
    </Link>
  );
}
