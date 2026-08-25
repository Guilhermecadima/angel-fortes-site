import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import StoreHeader from '../components/store/StoreHeader';
import StoreFooter from '../components/store/StoreFooter';
import { saveCart } from '../utils/storage';
import { formatCurrency } from '../utils/currency';

export default function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [state, setState] = useState({ loading: true, data: null, error: '' });

  useEffect(() => {
    if (!sessionId) {
      setState({ loading: false, data: null, error: 'Sessão de pagamento em falta.' });
      return;
    }

    let active = true;

    async function check() {
      try {
        const response = await fetch(`/api/checkout-status?session_id=${encodeURIComponent(sessionId)}`);
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.message || 'Não foi possível confirmar o pagamento.');
        }

        if (!active) return;

        if (data.paymentStatus === 'paid') {
          saveCart([]);
        }

        setState({ loading: false, data, error: '' });
      } catch (error) {
        if (active) {
          setState({ loading: false, data: null, error: error.message });
        }
      }
    }

    check();

    return () => {
      active = false;
    };
  }, [sessionId]);

  const paid = state.data?.paymentStatus === 'paid';
  const amount = state.data?.amountTotal != null
    ? formatCurrency(Number(state.data.amountTotal) / 100)
    : null;

  return (
    <div className="store-page">
      <StoreHeader cartCount={0} onOpenCart={null} />

      <main className="checkout-result-page">
        <section className={`checkout-result-card ${paid ? 'success' : ''}`}>
          <span className="checkout-result-mark">{paid ? '✓' : '…'}</span>
          <p className="store-kicker dark">Tudo de Compras</p>

          {state.loading && <h1>A confirmar o pagamento.</h1>}

          {!state.loading && state.error && (
            <>
              <h1>Pagamento recebido, confirmação pendente.</h1>
              <p>{state.error}</p>
            </>
          )}

          {!state.loading && !state.error && paid && (
            <>
              <h1>Pagamento confirmado.</h1>
              <p>
                Obrigado pela compra. A encomenda foi registada e o stock atualizado.
                {state.data.customerEmail ? ` A confirmação fica associada a ${state.data.customerEmail}.` : ''}
              </p>
              {amount && <strong className="checkout-result-total">{amount}</strong>}
            </>
          )}

          {!state.loading && !state.error && !paid && (
            <>
              <h1>Pagamento em processamento.</h1>
              <p>
                A Stripe ainda está a confirmar o pagamento. Não precisas de repetir a compra.
              </p>
            </>
          )}

          <div className="checkout-result-actions">
            <Link className="btn btn-dark" to="/loja">Voltar à loja</Link>
            <Link className="btn btn-outline" to="/">Ir para a barbearia</Link>
          </div>
        </section>
      </main>

      <StoreFooter />
    </div>
  );
}
