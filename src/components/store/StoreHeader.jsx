import { useState } from 'react';
import { Link } from 'react-router-dom';
import storeLogo from '../../assets/images/tudo-de-compras.png';

export default function StoreHeader({ cartCount, onOpenCart }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="store-header">
        <Link className="store-header-logo" to="/loja" aria-label="Tudo de Compras">
          <img src={storeLogo} alt="" />
          <span>
            <strong>Tudo de Compras</strong>
            <small>Loja Angel Fortes</small>
          </span>
        </Link>

        <nav className="store-nav" aria-label="Navegação da loja">
          <Link to="/loja">Produtos</Link>
          <Link to="/">Barbearia</Link>
          <a href="/#contactos">Contactos</a>
        </nav>

        <div className="store-header-actions">
          {onOpenCart && (
            <button type="button" className="store-cart-button" onClick={onOpenCart}>
              Saco <span>{cartCount}</span>
            </button>
          )}

          <button
            type="button"
            className="store-menu-button"
            aria-label="Abrir menu da loja"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            ☰
          </button>
        </div>
      </header>

      {open && (
        <div className="store-mobile-nav">
          <Link to="/loja" onClick={() => setOpen(false)}>Produtos</Link>
          <Link to="/" onClick={() => setOpen(false)}>Barbearia</Link>
          <a href="/#contactos" onClick={() => setOpen(false)}>Contactos</a>
        </div>
      )}
    </>
  );
}
