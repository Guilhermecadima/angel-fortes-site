import aboutImg1 from '../../assets/images/about-img-1.jpg';
import { site } from '../../data/site';

const INSTAGRAM_URL = 'https://www.instagram.com/barbearia_angelfortes/';
const WHATSAPP_URL = `https://wa.me/${site.phoneHref.replace(/\D/g, '')}?text=Ol%C3%A1%21%20Gostaria%20de%20falar%20com%20a%20Barbearia%20Angel%20Fortes.`;

export default function PriorityActions({ onBook }) {
  return (
    <section className="priority-actions" id="marcar">
      <div className="priority-booking-card">
        <div className="priority-booking-copy">
          <p className="eyebrow dark">Agendamento online</p>
          <h1>Marca primeiro.<br />O resto vem depois.</h1>
          <p>
            Escolhe o serviço, o dia e a hora em poucos passos. Sem chamadas e sem esperas.
          </p>

          <button className="btn btn-dark priority-book-btn" onClick={() => onBook()}>
            Escolher serviço e horário →
          </button>
        </div>

        <div className="priority-booking-meta" aria-label="Informações rápidas">
          <div>
            <span>Horário</span>
            <strong>{site.hoursShort}</strong>
          </div>
          <div>
            <span>Local</span>
            <strong>{site.location}</strong>
          </div>
        </div>
      </div>

      <aside className="priority-social-card" aria-label="Contactos e redes sociais">
        <div className="priority-social-image">
          <img src={aboutImg1} alt="Trabalho da Barbearia Angel Fortes" />
          <span>ANGEL FORTES</span>
        </div>

        <div className="priority-social-copy">
          <p className="eyebrow">Contacto rápido</p>
          <h2>Fala connosco.</h2>
          <p>
            Se preferires falar diretamente ou ver os últimos trabalhos, tens tudo aqui.
          </p>

          <div className="priority-social-links">
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="priority-social-link whatsapp">
              <span className="priority-social-icon">☏</span>
              <span>
                <small>WhatsApp</small>
                +351 {site.phoneDisplay}
              </span>
              <b>↗</b>
            </a>

            <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="priority-social-link instagram">
              <span className="priority-social-icon">◎</span>
              <span>
                <small>Instagram</small>
                @barbearia_angelfortes
              </span>
              <b>↗</b>
            </a>
          </div>
        </div>
      </aside>
    </section>
  );
}
