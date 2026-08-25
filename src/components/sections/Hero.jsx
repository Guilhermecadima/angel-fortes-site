import heroImage from '../../assets/images/hero-angelfortes.png';
import { site } from '../../data/site';

const INSTAGRAM_URL =
  'https://www.instagram.com/barbearia_angelfortes/';

const WHATSAPP_URL =
  `https://wa.me/${site.phoneHref.replace(/\D/g, '')}?text=Ol%C3%A1%21%20Gostaria%20de%20falar%20com%20a%20Barbearia%20Angel%20Fortes.`;

export default function Hero({ onBook }) {
  return (
    <section className="hero" id="marcar">
      <div
        className="hero-media"
        style={{ backgroundImage: `url(${heroImage})` }}
      />

      <div className="hero-overlay" />

      <div className="hero-content">
        <p className="hero-eyebrow">BARBEARIA</p>

        <h1>ANGEL FORTES</h1>

        <button
          className="hero-book-button"
          type="button"
          onClick={() => onBook()}
        >
          AGENDAR MARCAÇÃO
        </button>

        <div className="hero-socials">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
          >
            <span>☏</span>
            WhatsApp
          </a>

          <span className="hero-social-divider" />

          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer"
          >
            <span>◎</span>
            Instagram
          </a>
        </div>
      </div>

      <a href="#sobre" className="hero-scroll" aria-label="Continuar para baixo">
        <span />
      </a>
    </section>
  );
}