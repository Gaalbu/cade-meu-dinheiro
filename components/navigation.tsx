"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  ["01", "Visão geral", "/dashboard"],
  ["02", "Transações", "/transacoes"],
  ["03", "Planos & limites", "/planejamento"],
  ["04", "Ajustes", "/configuracoes"],
] as const;

export function Navigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  if (mobile) {
    return (
      <nav className="mobile-nav" aria-label="Navegação principal">
        {items.map(([, label, href]) => (
          <Link className={pathname.startsWith(href) ? "active" : ""} href={href} key={href}>
            {label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav aria-label="Navegação principal">
      <ul className="nav-list">
        {items.map(([index, label, href]) => (
          <li key={href}>
            <Link className={`nav-link ${pathname.startsWith(href) ? "active" : ""}`} href={href}>
              <span className="nav-index">{index}</span>
              <span>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
