import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import StoreHeader from '../components/store/StoreHeader';
import StoreFooter from '../components/store/StoreFooter';
import CartDrawer from '../components/shop/CartDrawer';
import storeLogo from '../assets/images/tudo-de-compras.png';
import { getPublicProductBySlug } from '../services/products';
import { useCart } from '../hooks/useCart';
import { formatCurrency } from '../utils/currency';

export default function ProductPage() {
  const { slug } = useParams();
  const { cart, count, total, add, remove, setQuantity } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantity, setQuantityLocal] = useState(1);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError('');

      try {
        const result = await getPublicProductBySlug(slug);
        if (active) setProduct(result.data);
      } catch (err) {
        console.error(err);
        if (active) setError('Não foi possível carregar este produto.');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [slug]);

  const handleAdd = () => {
    if (!product) return;

    add(product, quantity);
    setCartOpen(true);
  };

  return (
    <div className="store-page">
      <StoreHeader cartCount={count} onOpenCart={() => setCartOpen(true)} />

      <main className="product-page-main">
        <Link className="product-back" to="/loja">← Voltar à loja</Link>

        {loading && <div className="store-loading light">A carregar produto...</div>}
        {error && <div className="store-error light">{error}</div>}

        {!loading && !error && !product && (
          <div className="product-not-found">
            <h1>Produto não encontrado.</h1>
            <Link className="btn btn-dark" to="/loja">Ver catálogo</Link>
          </div>
        )}

        {!loading && product && (
          <section className="product-detail">
            <div className="product-detail-image">
              <img src={product.image_url || storeLogo} alt={product.name} />
              {product.featured && <span className="product-badge">Destaque</span>}
            </div>

            <div className="product-detail-copy">
              <p className="store-kicker dark">{product.category || 'Produto'}</p>
              <h1>{product.name}</h1>

              <div className="product-detail-price">
                {formatCurrency(product.price)}
              </div>

              <p className="product-detail-description">
                {product.description || 'Produto disponível na Tudo de Compras.'}
              </p>

              <div className={`product-availability ${product.stock <= 0 ? 'out' : ''}`}>
                {product.stock <= 0 ? 'Esgotado' : `${product.stock} unidades disponíveis`}
              </div>

              {product.stock > 0 && (
                <div className="product-buy-row">
                  <label>
                    <span>Quantidade</span>
                    <input
                      type="number"
                      min="1"
                      max={product.stock}
                      value={quantity}
                      onChange={(event) => {
                        const next = Math.max(
                          1,
                          Math.min(product.stock, Number(event.target.value || 1)),
                        );
                        setQuantityLocal(next);
                      }}
                    />
                  </label>

                  <button type="button" className="btn btn-dark" onClick={handleAdd}>
                    Adicionar ao saco
                  </button>
                </div>
              )}

              <div className="product-detail-note">
                Pagamento seguro disponível no checkout. O stock é confirmado antes de iniciares o pagamento.
              </div>
            </div>
          </section>
        )}
      </main>

      <StoreFooter />

      <CartDrawer
        open={cartOpen}
        cart={cart}
        total={total}
        onClose={() => setCartOpen(false)}
        onRemove={remove}
        onQuantityChange={setQuantity}
      />
    </div>
  );
}
