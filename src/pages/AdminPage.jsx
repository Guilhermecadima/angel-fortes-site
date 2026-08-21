import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { clearBookings, readBookings } from '../utils/storage';
import { formatCurrency } from '../utils/currency';

export default function AdminPage() {
  const [bookings, setBookings] = useState(() => readBookings());

  const today = new Date().toISOString().split('T')[0];
  const revenue = useMemo(() => bookings.reduce((sum, booking) => sum + Number(booking.price || 0), 0), [bookings]);

  const handleClear = () => {
    if (!window.confirm('Apagar todas as marcações da demo?')) return;
    clearBookings();
    setBookings([]);
  };

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1>Angel Fortes · Admin</h1>
        <Link to="/">← Voltar ao site</Link>
      </header>

      <main className="admin-wrap">
        <div className="admin-top">
          <div>
            <p className="admin-kicker">Painel de demonstração</p>
            <h2>Agendamentos</h2>
            <p className="admin-note">
              As marcações feitas na demo pública aparecem aqui porque são guardadas no navegador.
              Em produção, isto passa para autenticação e base de dados Supabase.
            </p>
          </div>
          <button className="btn btn-dark" onClick={handleClear}>Limpar demo</button>
        </div>

        <div className="kpis">
          <div className="kpi"><span>Total</span><strong>{bookings.length}</strong></div>
          <div className="kpi"><span>Hoje</span><strong>{bookings.filter((booking) => booking.date === today).length}</strong></div>
          <div className="kpi"><span>Receita agendada</span><strong>{formatCurrency(revenue)}</strong></div>
        </div>

        <div className="admin-table-wrap">
          {bookings.length === 0 ? (
            <div className="admin-empty">Ainda não existem marcações nesta demo.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Serviço</th>
                  <th>Data</th>
                  <th>Hora</th>
                  <th>Contacto</th>
                  <th>Valor</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td><strong>{booking.name}</strong><br /><small>{booking.email}</small></td>
                    <td>{booking.service}</td>
                    <td>{new Date(`${booking.date}T12:00:00`).toLocaleDateString('pt-PT')}</td>
                    <td>{booking.time}</td>
                    <td>{booking.phone}</td>
                    <td>{formatCurrency(booking.price)}</td>
                    <td><span className="pill">{booking.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
