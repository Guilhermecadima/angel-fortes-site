import { products } from '../../data/products';
import ProductCard from '../shop/ProductCard';

export default function Shop({ onAddToCart }) {
  return (
    <section className="shop section" id="loja">
      <div className="section-heading light">
        <div>
          <p className="eyebrow">Loja</p>
          <h2>Leva o acabamento contigo.</h2>
        </div>
        <p className="section-note">
          Produtos demonstrativos — substitui pelos artigos reais vendidos na barbearia antes do lançamento.
        </p>
      </div>

      <div className="product-grid">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} onAdd={onAddToCart} />
        ))}
      </div>
    </section>
  );
}
