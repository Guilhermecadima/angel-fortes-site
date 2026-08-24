import { useMemo, useState } from 'react';
import StoreHeader from '../components/store/StoreHeader';
import StoreFooter from '../components/store/StoreFooter';
import ProductCard from '../components/shop/ProductCard';
import CartDrawer from '../components/shop/CartDrawer';
import storeLogo from '../assets/images/tudo-de-compras.png';
import { usePublicProducts } from '../hooks/useProducts';
import { useCart } from '../hooks/useCart';

export default function StorePage() {
  const { products, loading, error, demoMode } = usePublicProducts();
  const { cart, count, total, add, remove, setQuantity } = useCart();

  const [cartOpen, setCartOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todos');

  const categories = useMemo(
    () => ['Todos', ...new Set(products.map((product) => product.category || 'Outros'))],
    [products],
  );

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return products.filter((product) => {
      const categoryMatch = category === 'Todos' || product.category === category;
      const queryMatch = !normalizedQuery
        || product.name.toLowerCase().includes(normalizedQuery)
        || (product.description || '').toLowerCase().includes(normalizedQuery)
        || (product.category || '').toLowerCase().includes(normalizedQuery);

      return categoryMatch && queryMatch;
    });
  }, [products, query, category]);

  const addToCart = (product) => {
    add(product);
    setCartOpen(true);
  };

  return (
    <div className="store-page">
      <StoreHeader cartCount={count} onOpenCart={() => setCartOpen(true)} />

      <main>
        <section className="store-hero">
          <div className="store-hero-copy">
            <p className="store-kicker">Loja oficial · Angel Fortes</p>
            <h1>O detalhe continua <span>fora da cadeira.</span></h1>
            <p>
              Produtos para cabelo, barba e cuidado pessoal escolhidos pela Angel Fortes.
            </p>
          </div>

          <div className="store-hero-logo">
            <img src={storeLogo} alt="Tudo de Compras" />
          </div>
        </section>

        <section className="store-catalog">
          <div className="store-catalog-top">
            <div>
              <p className="store-kicker dark">Catálogo</p>
              <h2>Escolhe o teu produto.</h2>
            </div>

            <div className="store-filters">
              <label>
                <span>Pesquisar</span>
                <input
                  type="search"
                  placeholder="Pomada, barba, styling..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>

              <label>
                <span>Categoria</span>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  {categories.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {demoMode && (
            <div className="store-config-banner">
              Estás a ver produtos de demonstração. Assim que colocares as chaves do Supabase,
              esta página passa a usar os produtos criados no painel.
            </div>
          )}

          {loading && <div className="store-loading light">A carregar catálogo...</div>}
          {error && <div className="store-error light">{error}</div>}

          {!loading && !error && (
            <>
              <div className="store-result-count">
                {filteredProducts.length} {filteredProducts.length === 1 ? 'produto' : 'produtos'}
              </div>

              {filteredProducts.length > 0 ? (
                <div className="store-catalog-grid">
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} onAdd={addToCart} />
                  ))}
                </div>
              ) : (
                <div className="store-empty light">
                  Não encontramos produtos com esses filtros.
                </div>
              )}
            </>
          )}
        </section>
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
