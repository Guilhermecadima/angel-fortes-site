import { useEffect, useMemo, useState } from 'react';
import { bookingTimes, services } from '../../data/services';
import { formatCurrency } from '../../utils/currency';
import { saveBooking } from '../../utils/storage';

function getTomorrow() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().split('T')[0];
}

export default function BookingModal({ open, initialServiceId, onClose }) {
  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', email: '' });

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setServiceId(initialServiceId || null);
    setDate('');
    setTime('');
    setForm({ name: '', phone: '', email: '' });
  }, [open, initialServiceId]);

  const selectedService = useMemo(
    () => services.find((service) => service.id === serviceId),
    [serviceId],
  );

  if (!open) return null;

  const next = () => {
    if (step === 1 && !selectedService) {
      window.alert('Escolhe primeiro um serviço.');
      return;
    }
    if (step === 2 && (!date || !time)) {
      window.alert('Escolhe uma data e um horário.');
      return;
    }
    setStep((value) => value + 1);
  };

  const previous = () => setStep((value) => Math.max(1, value - 1));

  const submit = (event) => {
    event.preventDefault();
    if (!selectedService) return;

    saveBooking({
      id: Date.now(),
      serviceId: selectedService.id,
      service: selectedService.name,
      price: selectedService.price,
      date,
      time,
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      status: 'Confirmado',
      createdAt: new Date().toISOString(),
    });

    setStep(4);
  };

  return (
    <div className="modal-backdrop open" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="booking-modal" role="dialog" aria-modal="true" aria-label="Agendamento">
        <button className="close-btn modal-close" onClick={onClose} aria-label="Fechar">×</button>

        <div className="booking-head">
          <p className="eyebrow dark">Agendamento</p>
          <h2>Marca a tua próxima visita.</h2>
          <div className="steps">
            <span className={step === 1 ? 'active' : ''}>1 Serviço</span>
            <span className={step === 2 ? 'active' : ''}>2 Horário</span>
            <span className={step === 3 ? 'active' : ''}>3 Dados</span>
          </div>
        </div>

        {step === 1 && (
          <div className="booking-step active">
            <label>Escolhe o serviço</label>
            <div className="booking-services">
              {services.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  className={`booking-service ${serviceId === service.id ? 'selected' : ''}`}
                  onClick={() => setServiceId(service.id)}
                >
                  <strong>{service.name}</strong>
                  <span>{service.duration} min · {formatCurrency(service.price)}</span>
                </button>
              ))}
            </div>
            <button type="button" className="btn btn-dark full" onClick={next}>Continuar</button>
          </div>
        )}

        {step === 2 && (
          <div className="booking-step active">
            <label htmlFor="booking-date">Escolhe a data</label>
            <input
              id="booking-date"
              type="date"
              min={getTomorrow()}
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />

            <label>Escolhe o horário</label>
            <div className="time-grid">
              {bookingTimes.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  className={`time-btn ${time === slot ? 'selected' : ''}`}
                  onClick={() => setTime(slot)}
                >
                  {slot}
                </button>
              ))}
            </div>

            <div className="two-buttons">
              <button type="button" className="btn btn-outline" onClick={previous}>Voltar</button>
              <button type="button" className="btn btn-dark" onClick={next}>Continuar</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <form className="booking-step active" onSubmit={submit}>
            <div className="field-grid">
              <div>
                <label htmlFor="customer-name">Nome</label>
                <input id="customer-name" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="O teu nome" required />
              </div>
              <div>
                <label htmlFor="customer-phone">Telemóvel</label>
                <input id="customer-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="9xx xxx xxx" required />
              </div>
              <div className="wide">
                <label htmlFor="customer-email">Email</label>
                <input id="customer-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="nome@email.com" required />
              </div>
            </div>

            <div className="booking-summary">
              <strong>Resumo</strong><br />
              {selectedService?.name} · {formatCurrency(selectedService?.price || 0)}<br />
              {date ? new Date(`${date}T12:00:00`).toLocaleDateString('pt-PT') : ''} às {time}
            </div>

            <div className="two-buttons">
              <button type="button" className="btn btn-outline" onClick={previous}>Voltar</button>
              <button type="submit" className="btn btn-dark">Confirmar marcação</button>
            </div>
          </form>
        )}

        {step === 4 && (
          <div className="booking-step active success-step">
            <div className="success-icon">✓</div>
            <h3>Marcação registada.</h3>
            <p>
              Nesta demo fica guardada no navegador. Em produção, liga este fluxo ao Supabase e às notificações.
            </p>
            <button type="button" className="btn btn-dark full" onClick={onClose}>Fechar</button>
          </div>
        )}
      </div>
    </div>
  );
}
