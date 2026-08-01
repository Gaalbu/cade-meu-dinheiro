import { Brand } from "@/components/brand";
import { Navigation } from "@/components/navigation";
import { signOut } from "@/app/actions/auth";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="shell">
      <aside className="sidebar">
        <Brand />
        <Navigation />
        <div className="sidebar-user">
          <span>SESSÃO ATIVA</span><br />
          {user.email}
          <form action={signOut}><button className="link-button">Encerrar sessão</button></form>
        </div>
      </aside>
      <header className="mobile-bar">
        <Brand compact />
        <Navigation mobile />
      </header>
      <main className="main-canvas">{children}</main>
    </div>
  );
}
