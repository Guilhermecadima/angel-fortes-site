import { useState } from 'react';
import { Link } from 'react-router-dom';
import storeLogo from '../../assets/images/tudo-de-compras.png';
import { formatCurrency } from '../../utils/currency';

export default function CartDrawer({
  open,
  cart,
  total,
  onClose,
  onRemove,
  onQuantityChange,
}) {
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  const checkout = async () => {
    if (!cart.length || checkoutLoading) return;

    setCheckoutLoading(true);
    setCheckoutError('');

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cart: cart.map((item) => ({
            id: item.id,
            qty: item.qty,
          })),
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.url) {
        throw new Error(data?.message || 'Não foi possível iniciar o pagamento.');
      }

      window.location.assign(data.url);
    } catch (error) {
      console.error('Checkout error:', error);
      setCheckoutError(error.message || 'Não foi possível iniciar o pagamento.');
      setCheckoutLoading(false);
    }
  };

  return (
    <>
      <aside className={`cart-drawer ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="cart-head">
          <div>
            <span className="cart-kicker">Tudo de Compras</span>
            <h3>O teu saco</h3>
          </div>

          <button className="close-btn" onClick={onClose} aria-label="Fechar carrinho">
            ×
          </button>
        </div>

        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="empty-cart">
              <p>O teu saco está vazio.</p>
              <Link to="/loja" onClick={onClose}>Ver produtos →</Link>
            </div>
          ) : (
            cart.map((item) => (
              <div className="cart-item store-cart-item" key={item.id}>
                <img src={item.image_url || storeLogo} alt={item.name} />

                <div>
                  <strong>{item.name}</strong>
                  <p>{formatCurrency(item.price)}</p>

                  <div className="cart-qty">
                    <button type="button" onClick={() => onQuantityChange(item.id, item.qty - 1)}>−</button>
                    <span>{item.qty}</span>
                    <button type="button" onClick={() => onQuantityChange(item.id, item.qty + 1)}>+</button>
                  </div>
                </div>

                <button
                  className="cart-remove"
                  type="button"
                  onClick={() => onRemove(item.id)}
                >
                  Remover
                </button>
              </div>
            ))
          )}
        </div>

        <div className="cart-footer">
          <div className="cart-total">
            <span>Total</span>
            <strong>{formatCurrency(total)}</strong>
          </div>

          {checkoutError && (
            <div className="checkout-error" role="alert">
              {checkoutError}
            </div>
          )}

          <button
            className="btn btn-dark full"
            disabled={cart.length === 0 || checkoutLoading}
            onClick={checkout}
          >
            {checkoutLoading ? 'A abrir pagamento...' : 'Pagar em segurança →'}
          </button>

          <small>
            Pagamento processado em ambiente seguro pela Stripe. O preço e o stock são
            confirmados novamente antes de abrir o checkout.
          </small>
        </div>
      </aside>

      <div className={`drawer-backdrop ${open ? 'open' : ''}`} onClick={onClose} />
    </>
  );
}
