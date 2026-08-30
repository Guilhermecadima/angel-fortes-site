import { useEffect, useMemo, useState } from 'react';

import { services } from '../../data/services';

import { formatCurrency } from '../../utils/currency';
import { saveBooking } from '../../utils/storage';
import {
  getTodayInBookingTimeZone,
  isSunday,
} from '../../utils/bookingRules';

/* =========================================================
   BOOKING MODAL
========================================================= */

export default function BookingModal({
  open,
  initialServiceId,
  onClose,
}) {
  const [step, setStep] = useState(1);

  const [serviceId, setServiceId] = useState(null);

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const [availableTimes, setAvailableTimes] = useState([]);
  const [loadingTimes, setLoadingTimes] = useState(false);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    followupOptOut: false,
  });

  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  /* =======================================================
     RESET QUANDO ABRE
  ======================================================= */

  useEffect(() => {
    if (!open) return;

    setStep(1);
    setServiceId(initialServiceId || null);

    setDate('');
    setTime('');

    setAvailableTimes([]);
    setLoadingTimes(false);

    setForm({
      name: '',
      phone: '',
      email: '',
      followupOptOut: false,
    });

    setSending(false);
    setError('');
  }, [open, initialServiceId]);

  /* =======================================================
     SERVIÇO SELECIONADO
  ======================================================= */

  const selectedService = useMemo(
    () =>
      services.find(
        (service) => service.id === serviceId,
      ),
    [serviceId],
  );

  /* =======================================================
     DISPONIBILIDADE REAL

     O backend trata de:
     - regra das 8 horas
     - horários ocupados
     - duração dos serviços
     - domingo fechado
  ======================================================= */

  useEffect(() => {
    if (!open || !serviceId || !date) {
      setAvailableTimes([]);
      return;
    }

    const controller = new AbortController();

    const loadAvailability = async () => {
      setLoadingTimes(true);
      setAvailableTimes([]);
      setError('');

      try {
        const response = await fetch(
          `/api/availability?date=${encodeURIComponent(
            date,
          )}&serviceId=${encodeURIComponent(serviceId)}`,
          {
            signal: controller.signal,
          },
        );

        const data = await response
          .json()
          .catch(() => null);

        if (!response.ok) {
          throw new Error(
            data?.message ||
              'Erro ao verificar horários.',
          );
        }

        if (controller.signal.aborted) return;

        setAvailableTimes(
          Array.isArray(data?.availableTimes)
            ? data.availableTimes
            : [],
        );
      } catch (err) {
        if (err.name === 'AbortError') return;

        console.error(
          'Erro disponibilidade:',
          err,
        );

        setAvailableTimes([]);
        setError(
          err.message ||
            'Não foi possível verificar os horários.',
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoadingTimes(false);
        }
      }
    };

    loadAvailability();

    return () => {
      controller.abort();
    };
  }, [open, serviceId, date]);

  /*
   * Se trocar de serviço,
   * limpa a hora anterior porque pode
   * já não ser válida para a nova duração.
   */

  useEffect(() => {
    setTime('');
  }, [serviceId]);

  /* =======================================================
     NAVEGAÇÃO
  ======================================================= */

  const next = () => {
    if (step === 1 && !selectedService) {
      window.alert(
        'Escolhe primeiro um serviço.',
      );

      return;
    }

    if (step === 2 && (!date || !time)) {
      window.alert(
        'Escolhe uma data e um horário.',
      );

      return;
    }

    setStep((value) => value + 1);
  };

  const previous = () => {
    setStep((value) => Math.max(1, value - 1));
  };

  /* =======================================================
     DATA
  ======================================================= */

  const handleDateChange = (event) => {
    const nextDate = event.target.value;

    if (nextDate && isSunday(nextDate)) {
      setDate('');
      setTime('');
      setAvailableTimes([]);

      window.alert(
        'A barbearia está fechada ao domingo.',
      );

      return;
    }

    setDate(nextDate);
    setTime('');
    setError('');
  };

  /* =======================================================
     SUBMIT
  ======================================================= */

  const submit = async (event) => {
    event.preventDefault();

    if (!selectedService) {
      return;
    }

    setSending(true);
    setError('');

    const booking = {
      id: Date.now(),

      serviceId: selectedService.id,
      service: selectedService.name,
      price: selectedService.price,
      duration: selectedService.duration,

      date,
      time,

      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),

      status: 'Confirmado',

      createdAt: new Date().toISOString(),
    };

    try {
      /* =====================================================
         GUARDA NO SUPABASE + ENVIA EMAIL
         Tudo é tratado pelo /api/booking
      ===================================================== */

      const response = await fetch('/api/booking', {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          name: booking.name,
          phone: booking.phone,
          email: booking.email,

          serviceId: booking.serviceId,
          service: booking.service,
          duration: booking.duration,

          date: booking.date,
          time: booking.time,

          price: booking.price,
        }),
      });

      const data = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        console.error(
          'ERRO /api/booking:',
          response.status,
          data,
        );

        /*
         * Se o horário tiver sido ocupado entre a escolha
         * e a confirmação, voltamos ao passo dos horários
         * e atualizamos a disponibilidade.
         */
        if (response.status === 409) {
          setTime('');
          setStep(2);

          try {
            const availabilityResponse = await fetch(
              `/api/availability?date=${encodeURIComponent(
                date,
              )}&serviceId=${encodeURIComponent(
                booking.serviceId,
              )}`,
            );

            const availabilityData =
              await availabilityResponse
                .json()
                .catch(() => null);

            if (availabilityResponse.ok) {
              setAvailableTimes(
                Array.isArray(
                  availabilityData?.availableTimes,
                )
                  ? availabilityData.availableTimes
                  : [],
              );
            }
          } catch (availabilityError) {
            console.error(
              'Erro ao atualizar disponibilidade:',
              availabilityError,
            );
          }
        }

        throw new Error(
          data?.message ||
            `Erro /api/booking: ${response.status}`,
        );
      }

      console.log('Marcação criada:', data);

      /* =====================================================
         LOCAL STORAGE / ADMIN ATUAL
      ===================================================== */

      saveBooking(booking);

      /* =====================================================
         SUCESSO
      ===================================================== */

      setStep(4);
    } catch (err) {
      console.error('Erro na marcação:', err);

      setError(
        err.message ||
          'Não foi possível concluir a marcação.',
      );
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div
      className="modal-backdrop open"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="booking-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Agendamento"
      >
        <button
          className="close-btn modal-close"
          onClick={onClose}
          aria-label="Fechar"
        >
          ×
        </button>

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="booking-head">
          <p className="eyebrow dark">
            Agendamento
          </p>

          <h2>
            Marca a tua próxima visita.
          </h2>

          <div className="steps">
            <span
              className={
                step === 1 ? 'active' : ''
              }
            >
              1 Serviço
            </span>

            <span
              className={
                step === 2 ? 'active' : ''
              }
            >
              2 Horário
            </span>

            <span
              className={
                step === 3 ? 'active' : ''
              }
            >
              3 Dados
            </span>
          </div>
        </div>

        {/* =================================================
            STEP 1 — SERVIÇO
        ================================================= */}

        {step === 1 && (
          <div className="booking-step active">
            <label>
              Escolhe o serviço
            </label>

            <div className="booking-services">
              {services.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  className={`booking-service ${
                    serviceId === service.id
                      ? 'selected'
                      : ''
                  }`}
                  onClick={() =>
                    setServiceId(service.id)
                  }
                >
                  <strong>
                    {service.name}
                  </strong>

                  <span>
                    {service.duration} min
                    {' · '}
                    {formatCurrency(
                      service.price,
                    )}
                  </span>
                </button>
              ))}
            </div>

            <button
              type="button"
              className="btn btn-dark full"
              onClick={next}
            >
              Continuar
            </button>
          </div>
        )}

        {/* =================================================
            STEP 2 — HORÁRIO
        ================================================= */}

        {step === 2 && (
          <div className="booking-step active">
            {selectedService && (
              <div
                style={{
                  marginBottom: '22px',
                  padding: '14px 16px',
                  background:
                    'rgba(212, 175, 55, 0.12)',
                  border:
                    '1px solid rgba(212, 175, 55, 0.30)',
                }}
              >
                <strong>
                  {selectedService.name}
                </strong>

                <div
                  style={{
                    marginTop: '4px',
                    fontSize: '13px',
                    opacity: 0.7,
                  }}
                >
                  {selectedService.duration} minutos
                  {' · '}
                  {formatCurrency(
                    selectedService.price,
                  )}
                </div>
              </div>
            )}

            <label htmlFor="booking-date">
              Escolhe a data
            </label>

            <input
              id="booking-date"
              type="date"
              min={getTodayInBookingTimeZone()}
              value={date}
              onChange={handleDateChange}
              required
            />

            <label>
              Escolhe o horário
            </label>

            {loadingTimes && (
              <p>
                A verificar horários...
              </p>
            )}

            {!loadingTimes &&
              date &&
              availableTimes.length === 0 && (
                <p>
                  Não existem horários disponíveis para esta data.
                </p>
              )}

            <div className="time-grid">
              {availableTimes.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  className={`time-btn ${
                    time === slot
                      ? 'selected'
                      : ''
                  }`}
                  onClick={() =>
                    setTime(slot)
                  }
                >
                  {slot}
                </button>
              ))}
            </div>

            {error && step === 2 && (
              <p
                style={{
                  color: '#b42318',
                  marginTop: '15px',
                  fontSize: '14px',
                }}
              >
                {error}
              </p>
            )}

            <div className="two-buttons">
              <button
                type="button"
                className="btn btn-outline"
                onClick={previous}
              >
                Voltar
              </button>

              <button
                type="button"
                className="btn btn-dark"
                onClick={next}
                disabled={loadingTimes}
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {/* =================================================
            STEP 3 — DADOS
        ================================================= */}

        {step === 3 && (
          <form
            className="booking-step active"
            onSubmit={submit}
          >
            <div className="field-grid">
              <div>
                <label htmlFor="customer-name">
                  Nome
                </label>

                <input
                  id="customer-name"
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      name: event.target.value,
                    })
                  }
                  placeholder="O teu nome"
                  required
                />
              </div>

              <div>
                <label htmlFor="customer-phone">
                  Telemóvel
                </label>

                <input
                  id="customer-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      phone: event.target.value,
                    })
                  }
                  placeholder="9xx xxx xxx"
                  required
                />
              </div>

              <div className="wide">
                <label htmlFor="customer-email">
                  Email
                </label>

                <input
                  id="customer-email"
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      email: event.target.value,
                    })
                  }
                  placeholder="nome@email.com"
                  required
                />
              </div>
            </div>

            {/* RESUMO */}

            <div className="booking-summary">
              <strong>
                Resumo
              </strong>

              <br />

              {selectedService?.name}
              {' · '}
              {selectedService?.duration} min
              {' · '}
              {formatCurrency(
                selectedService?.price || 0,
              )}

              <br />

              {date
                ? new Date(
                    `${date}T12:00:00`,
                  ).toLocaleDateString('pt-PT')
                : ''}

              {' às '}
              {time}
            </div>

            {error && (
              <p
                style={{
                  color: '#b42318',
                  marginTop: '15px',
                  fontSize: '14px',
                }}
              >
                {error}
              </p>
            )}

            <div className="two-buttons">
              <button
                type="button"
                className="btn btn-outline"
                onClick={previous}
                disabled={sending}
              >
                Voltar
              </button>

              <button
                type="submit"
                className="btn btn-dark"
                disabled={sending}
              >
                {sending
                  ? 'A enviar...'
                  : 'Confirmar marcação'}
              </button>
            </div>
          </form>
        )}

        {/* =================================================
            STEP 4 — SUCESSO
        ================================================= */}

        {step === 4 && (
          <div className="booking-step active success-step">
            <div className="success-icon">
              ✓
            </div>

            <h3>
              Marcação registada.
            </h3>

            <p>
              A marcação foi enviada com sucesso.
            </p>

            <button
              type="button"
              className="btn btn-dark full"
              onClick={onClose}
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
