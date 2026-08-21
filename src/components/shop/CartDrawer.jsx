import { products } from '../../data/products';
import { formatCurrency } from '../../utils/currency';

export default function CartDrawer({ open, cart, onClose, onRemove }) {
  const total = cart.reduce((sum, item) => {
    const product = products.find((candidate) => candidate.id === item.id);
    return sum + (product?.price || 0) * item.qty;
  }, 0);

  return (
    <>
      <aside className={`cart-drawer ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="cart-head">
          <h3>O teu saco</h3>
          <button className="close-btn" onClick={onClose} aria-label="Fechar carrinho">×</button>
        </div>

        <div className="cart-items">
          {cart.length === 0 ? (
            <p className="empty-cart">O teu saco está vazio.</p>
          ) : (
            cart.map((item) => {
              const product = products.find((candidate) => candidate.id === item.id);
              if (!product) return null;
              return (
                <div className="cart-item" key={item.id}>
                  <div>
                    <strong>{product.name}</strong>
                    <p>{item.qty} × {formatCurrency(product.price)}</p>
                  </div>
                  <button onClick={() => onRemove(item.id)}>Remover</button>
                </div>
              );
            })
          )}
        </div>

        <div className="cart-footer">
          <div className="cart-total">
            <span>Total</span>
            <strong>{formatCurrency(total)}</strong>
          </div>
          <button
            className="btn btn-dark full"
            onClick={() => window.alert('Demo de checkout. Na produção, este botão abre um checkout seguro.')}
          >
            Finalizar compra
          </button>
          <small>Checkout demonstrativo. A integração de pagamentos entra na versão de produção.</small>
        </div>
      </aside>
      <div className={`drawer-backdrop ${open ? 'open' : ''}`} onClick={onClose} />
    </>
  );
}
