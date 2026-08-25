import { Link } from 'react-router-dom';
import StoreHeader from '../components/store/StoreHeader';
import StoreFooter from '../components/store/StoreFooter';
import { readCart } from '../utils/storage';

export default function CheckoutCancelPage() {
  const count = readCart().reduce((sum, item) => sum + Number(item.qty || 0), 0);

  return (
    <div className="store-page">
      <StoreHeader cartCount={count} onOpenCart={null} />

      <main className="checkout-result-page">
        <section className="checkout-result-card cancel">
          <span className="checkout-result-mark">←</span>
          <p className="store-kicker dark">Pagamento cancelado</p>
          <h1>O teu carrinho continua guardado.</h1>
          <p>
            Não foi efetuada qualquer cobrança. Podes voltar à loja e tentar novamente quando quiseres.
          </p>

          <div className="checkout-result-actions">
            <Link className="btn btn-dark" to="/loja">Voltar ao carrinho</Link>
            <Link className="btn btn-outline" to="/">Ir para a barbearia</Link>
          </div>
        </section>
      </main>

      <StoreFooter />
    </div>
  );
}
