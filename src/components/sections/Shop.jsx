import { Link } from 'react-router-dom';
import storeLogo from '../../assets/images/tudo-de-compras.png';
import { usePublicProducts } from '../../hooks/useProducts';
import ProductCard from '../shop/ProductCard';

export default function Shop({ onAddToCart }) {
  const { products, loading, error, demoMode } = usePublicProducts({
    featuredOnly: true,
    limit: 3,
  });

  return (
    <section className="shop section store-preview" id="loja">
      <div className="store-preview-heading">
        <div className="store-preview-brand">
          <img src={storeLogo} alt="Tudo de Compras" />
        </div>

        <div>
          <p className="eyebrow">Loja Angel Fortes</p>
          <h2>Tudo de Compras.</h2>
          <p className="section-note">
            Produtos escolhidos pela barbearia, agora numa loja própria e simples de gerir.
          </p>
        </div>

        <Link className="btn btn-light" to="/loja">
          Entrar na loja →
        </Link>
      </div>

      {demoMode && (
        <p className="store-demo-note">
          Modo demonstração: liga o Supabase para os produtos passarem a ser geridos pelo painel.
        </p>
      )}

      {loading && <div className="store-loading">A carregar produtos...</div>}
      {error && <div className="store-error">{error}</div>}

      {!loading && !error && (
        <div className="product-grid">
          {products.length > 0 ? (
            products.map((product) => (
              <ProductCard key={product.id} product={product} onAdd={onAddToCart} />
            ))
          ) : (
            <div className="store-empty">
              Ainda não existem produtos em destaque.
            </div>
          )}
        </div>
      )}
    </section>
  );
}
