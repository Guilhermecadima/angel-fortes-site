import { formatCurrency } from '../../utils/currency';

export default function ProductCard({ product, onAdd }) {
  return (
    <article className="product-card">
      <div className="product-art" aria-hidden="true">
        <div className="product-bottle"><span>AF</span></div>
      </div>
      <div className="product-info">
        <span className="product-type">{product.type}</span>
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        <div className="product-line">
          <strong>{formatCurrency(product.price)}</strong>
          <button onClick={() => onAdd(product.id)}>Adicionar</button>
        </div>
      </div>
    </article>
  );
}
