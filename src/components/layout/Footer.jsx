export default function Footer() {
  return (
    <footer>
      <div className="footer-brand">
        ANGEL FORTES <span>BARBEARIA</span>
      </div>
      <div className="footer-links">
        <a href="#servicos">Serviços</a>
        <a href="#loja">Loja</a>
        <a href="#contactos">Contactos</a>
      </div>
      <div className="footer-copy">© {new Date().getFullYear()} Angel Fortes. Todos os direitos reservados.</div>
    </footer>
  );
}
