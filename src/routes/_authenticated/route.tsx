import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const navigate = useNavigate();
  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-card/40 backdrop-blur sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/today" className="font-display text-xl tracking-[0.3em] text-gold">
            ALIVE
          </Link>
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/today" className="hover:text-gold-light transition-colors">Today</Link>
            <Link to="/vault" className="hover:text-gold-light transition-colors">Vault</Link>
            <Link to="/timeline" className="hover:text-gold-light transition-colors">Timeline</Link>
            <Link to="/insights" className="hover:text-gold-light transition-colors">Insights</Link>
            <Link to="/life-book" className="hover:text-gold-light transition-colors">Life Book</Link>
            <Link to="/pricing" className="hover:text-gold-light transition-colors">Plans</Link>
            <button onClick={signOut} className="hover:text-gold-light transition-colors">
              Sign out
            </button>
          </nav>

        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
