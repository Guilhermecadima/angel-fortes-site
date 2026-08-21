import { useState } from 'react';
import logo from '../../assets/images/logo.png';

export default function Header({ cartCount, onBook, onOpenCart }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Angel Fortes - início">
          <img src={logo} alt="Angel Fortes Barbearia" />
        </a>

        <nav className="desktop-nav" aria-label="Navegação principal">
          <a href="#sobre">Sobre</a>
          <a href="#servicos">Serviços</a>
          <a href="#loja">Loja</a>
          <a href="#contactos">Contactos</a>
        </nav>

        <div className="header-actions">
          <button className="icon-btn" onClick={onOpenCart} aria-label="Abrir carrinho">
            Saco <span>{cartCount}</span>
          </button>
          <button className="btn btn-light header-book" onClick={() => onBook()}>
            Marcar agora
          </button>
          <button
            className="menu-toggle"
            onClick={() => setMobileOpen((value) => !value)}
            aria-label="Abrir menu"
            aria-expanded={mobileOpen}
          >
            ☰
          </button>
        </div>
      </header>

      <div className={`mobile-menu ${mobileOpen ? 'open' : ''}`}>
        <a href="#sobre" onClick={closeMobile}>Sobre</a>
        <a href="#servicos" onClick={closeMobile}>Serviços</a>
        <a href="#loja" onClick={closeMobile}>Loja</a>
        <a href="#contactos" onClick={closeMobile}>Contactos</a>
        <button className="btn btn-dark" onClick={() => { closeMobile(); onBook(); }}>
          Marcar agora
        </button>
      </div>
    </>
  );
}
