import { useState } from 'react';
import storeLogo from '../../assets/images/tudo-de-compras.png';
import { signInAdmin } from '../../services/auth';

export default function AdminLogin({ onSuccess }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setSending(true);
    setError('');

    try {
      const session = await signInAdmin(form.email, form.password);
      onSuccess(session);
    } catch (err) {
      console.error(err);
      setError('Email ou password incorretos.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="admin-login-page">
      <form className="admin-login-card" onSubmit={submit}>
        <img src={storeLogo} alt="Tudo de Compras" />

        <div>
          <p className="admin-kicker">Área privada</p>
          <h1>Gestão da loja</h1>
          <p>Entra com a conta criada no Supabase Auth.</p>
        </div>

        <label>
          <span>Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
        </label>

        <label>
          <span>Password</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
        </label>

        {error && <p className="admin-form-error">{error}</p>}

        <button className="btn btn-dark full" type="submit" disabled={sending}>
          {sending ? 'A entrar...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
