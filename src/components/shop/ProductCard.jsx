import { Link } from 'react-router-dom';
import storeLogo from '../../assets/images/tudo-de-compras.png';
import { formatCurrency } from '../../utils/currency';

export default function ProductCard({ product, onAdd }) {
  const soldOut = product.stock <= 0;

  return (
    <article className="product-card store-product-card">
      <Link className="store-product-image" to={`/loja/${product.slug}`}>
        <img
          src={product.image_url || storeLogo}
          alt={product.image_url ? product.name : `Tudo de Compras - ${product.name}`}
          loading="lazy"
        />

        {product.featured && <span className="product-badge">Destaque</span>}
        {soldOut && <span className="product-badge sold-out">Esgotado</span>}
      </Link>

      <div className="product-info">
        <span className="product-type">{product.category || 'Produto'}</span>

        <Link to={`/loja/${product.slug}`}>
          <h3>{product.name}</h3>
        </Link>

        <p>{product.description}</p>

        <div className="product-stock">
          {soldOut ? 'Sem stock' : `${product.stock} em stock`}
        </div>

        <div className="product-line">
          <strong>{formatCurrency(product.price)}</strong>

          <button
            type="button"
            disabled={soldOut}
            onClick={() => onAdd(product)}
          >
            {soldOut ? 'Esgotado' : 'Adicionar'}
          </button>
        </div>
      </div>
    </article>
  );
}
