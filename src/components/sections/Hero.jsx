import heroImage from '../../assets/images/about-img-1.jpg';
import { site } from '../../data/site';

export default function Hero({ onBook }) {
  return (
    <section className="hero" id="top">
      <div className="hero-media" style={{ backgroundImage: `url(${heroImage})` }} />
      <div className="hero-overlay" />

      <div className="hero-content">
        <p className="eyebrow">{site.location} · {site.businessType}</p>
        <h1>
          O teu corte.<br />
          <span>A tua presença.</span>
        </h1>
        <p className="hero-copy">
          Técnica, detalhe e um serviço pensado para saíres da cadeira com um visual que encaixa contigo.
        </p>
        <div className="hero-actions">
          <button className="btn btn-light" onClick={() => onBook()}>Marcar um corte</button>
          <a className="btn btn-ghost" href="#servicos">Ver serviços</a>
        </div>
      </div>

      <div className="hero-meta">
        <div>
          <span>Horário</span>
          <strong>{site.hoursShort}</strong>
        </div>
        <div>
          <span>Telefone</span>
          <strong>{site.phoneDisplay}</strong>
        </div>
      </div>
    </section>
  );
}
