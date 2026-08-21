import { services } from '../../data/services';
import { formatCurrency } from '../../utils/currency';

export default function Services({ onBook }) {
  return (
    <section className="services section" id="servicos">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Serviços</p>
          <h2>Escolhe o teu.</h2>
        </div>
        <button className="text-link" onClick={() => onBook()}>
          Ver horários disponíveis →
        </button>
      </div>

      <div className="service-grid">
        {services.map((service, index) => (
          <article className="service-card" key={service.id}>
            <div>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <h3>{service.name}</h3>
            </div>
            <div className="service-bottom">
              <div>
                <strong>{formatCurrency(service.price)}</strong>
                <small>{service.duration} min</small>
              </div>
              <button onClick={() => onBook(service.id)} aria-label={`Marcar ${service.name}`}>
                →
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
