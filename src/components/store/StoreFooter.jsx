import { Link } from 'react-router-dom';

export default function StoreFooter() {
  return (
    <footer className="store-footer">
      <div>
        <strong>TUDO DE COMPRAS</strong>
        <span>por Angel Fortes</span>
      </div>

      <div className="store-footer-links">
        <Link to="/loja">Loja</Link>
        <Link to="/">Barbearia</Link>
      </div>

      <small>© {new Date().getFullYear()} Angel Fortes.</small>
    </footer>
  );
}
