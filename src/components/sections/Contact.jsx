import { site } from '../../data/site';

export default function Contact() {
  return (
    <section className="contact section" id="contactos">
      <div className="contact-card">
        <p className="eyebrow">Visita-nos</p>
        <h2>{site.location}.</h2>
        <p>
          {site.address[0]}<br />
          {site.address[1]}
        </p>
        <p>
          <strong>Segunda a Sábado</strong><br />
          {site.hoursLong}
        </p>
        <div className="contact-actions">
          <a className="btn btn-light" href={`tel:${site.phoneHref}`}>Ligar agora</a>
          <a className="btn btn-ghost" href={`mailto:${site.email}`}>Email</a>
        </div>
      </div>

      <iframe title="Mapa Angel Fortes" src={site.mapEmbedUrl} loading="lazy" />
    </section>
  );
}
