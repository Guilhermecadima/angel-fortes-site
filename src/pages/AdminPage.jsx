import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLogin from '../components/admin/AdminLogin';
import ProductAdminPanel from '../components/admin/ProductAdminPanel';
import storeLogo from '../assets/images/tudo-de-compras.png';
import { isSupabaseConfigured } from '../lib/supabase';
import { getAdminSession, signOutAdmin, subscribeToAuth } from '../services/auth';

export default function AdminPage() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return undefined;
    }

    let mounted = true;

    getAdminSession()
      .then((currentSession) => {
        if (mounted) setSession(currentSession);
      })
      .catch(console.error)
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const unsubscribe = subscribeToAuth((nextSession) => {
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  if (!isSupabaseConfigured) {
    return (
      <div className="admin-setup-page">
        <div className="admin-setup-card">
          <img src={storeLogo} alt="Tudo de Compras" />
          <p className="admin-kicker">Configuração necessária</p>
          <h1>O painel já está preparado.</h1>
          <p>
            Falta apenas criar/configurar o Supabase e preencher as duas variáveis no ficheiro
            <code>.env</code>.
          </p>

          <pre>{`VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...`}</pre>

          <p>
            O SQL necessário está em <strong>supabase/store_setup.sql</strong>.
          </p>

          <Link className="btn btn-dark" to="/">Voltar ao site</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="admin-loading-page">A abrir o painel...</div>;
  }

  if (!session) {
    return <AdminLogin onSuccess={setSession} />;
  }

  const logout = async () => {
    await signOutAdmin();
    setSession(null);
  };

  return (
    <div className="admin-page">
      <header className="admin-header admin-store-header">
        <Link className="admin-brand" to="/loja">
          <img src={storeLogo} alt="Tudo de Compras" />

          <div>
            <strong>Gestão da loja</strong>
            <span>{session.user.email}</span>
          </div>
        </Link>

        <div className="admin-header-actions">
          <Link to="/loja">Ver loja</Link>
          <button type="button" onClick={logout}>Terminar sessão</button>
        </div>
      </header>

      <main className="admin-wrap">
        <ProductAdminPanel />
      </main>
    </div>
  );
}
