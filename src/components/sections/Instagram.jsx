import aboutImg1 from '../../assets/images/about-img-1.jpg';
import aboutImg2 from '../../assets/images/about-img-2.jpg';

const INSTAGRAM_URL =
  'https://www.instagram.com/barbearia_angelfortes/';

export default function Instagram() {
  return (
    <section className="instagram-section">

      <div className="instagram-bg-word">
        INSTAGRAM
      </div>

      <div className="instagram-inner">

        <div className="instagram-copy">

          <p className="eyebrow">
            Segue o trabalho
          </p>

          <h2>
            O CORTE NÃO ACABA
            <span> QUANDO SAIS DA CADEIRA.</span>
          </h2>

          <p className="instagram-description">
            Cortes, degradês, transformações e o dia a dia
            da Angel Fortes.
          </p>

          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer"
            className="instagram-button"
          >
            <span className="instagram-icon">
              ↗
            </span>

            <span>
              <small>Segue no Instagram</small>
              @barbearia_angelfortes
            </span>
          </a>

        </div>


        <div className="instagram-gallery">

          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer"
            className="instagram-photo instagram-photo-main"
          >
            <img
              src={aboutImg1}
              alt="Trabalho da Barbearia Angel Fortes"
            />

            <div className="instagram-photo-overlay">
              <span>Ver Instagram</span>
              <strong>↗</strong>
            </div>
          </a>


          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer"
            className="instagram-photo instagram-photo-secondary"
          >
            <img
              src={aboutImg2}
              alt="Barbearia Angel Fortes"
            />

            <div className="instagram-photo-overlay">
              <span>@barbearia_angelfortes</span>
              <strong>↗</strong>
            </div>
          </a>


          <div className="instagram-floating-card">

            <div className="instagram-mark">
              AF
            </div>

            <div>
              <span>Instagram</span>
              <strong>
                @barbearia_angelfortes
              </strong>
            </div>

          </div>

        </div>

      </div>


<div className="instagram-marquee">
  <div className="instagram-marquee-track">

    <div className="instagram-marquee-group">
      <span>CORTES</span>
      <b>✦</b>
      <span>DEGRADÊ</span>
      <b>✦</b>
      <span>BARBA</span>
      <b>✦</b>
      <span>ESTILO</span>
      <b>✦</b>
      <span>ANGEL FORTES</span>
      <b>✦</b>
      <span>CORTES</span>
      <b>✦</b>
      <span>DEGRADÊ</span>
      <b>✦</b>
      <span>BARBA</span>
      <b>✦</b>
      <span>ESTILO</span>
      <b>✦</b>
      <span>ANGEL FORTES</span>
      <b>✦</b>
    </div>

    <div
      className="instagram-marquee-group"
      aria-hidden="true"
    >
      <span>CORTES</span>
      <b>✦</b>
      <span>DEGRADÊ</span>
      <b>✦</b>
      <span>BARBA</span>
      <b>✦</b>
      <span>ESTILO</span>
      <b>✦</b>
      <span>ANGEL FORTES</span>
      <b>✦</b>
      <span>CORTES</span>
      <b>✦</b>
      <span>DEGRADÊ</span>
      <b>✦</b>
      <span>BARBA</span>
      <b>✦</b>
      <span>ESTILO</span>
      <b>✦</b>
      <span>ANGEL FORTES</span>
      <b>✦</b>
    </div>

  </div>
</div>

    </section>
  );
}