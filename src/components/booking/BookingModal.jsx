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

  const [serviceId, setServiceId] = useState(null);

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const [availableTimes, setAvailableTimes] = useState([]);
  const [loadingTimes, setLoadingTimes] = useState(false);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
  });

  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const [success, setSuccess] = useState(false);


  /* =======================================================
     RESET QUANDO ABRE
  ======================================================= */

  useEffect(() => {

    if (!open) return;

    setServiceId(initialServiceId || null);

    setDate('');
    setTime('');

    setAvailableTimes([]);
    setLoadingTimes(false);

    setForm({
      name: '',
      phone: '',
      email: '',
    });

    setSending(false);
    setError('');
    setSuccess(false);

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
     DISPONIBILIDADE

     Backend trata de:
     - regra das 8 horas
     - horários ocupados
     - duração do serviço
     - domingo
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
          )}&serviceId=${encodeURIComponent(
            serviceId,
          )}`,
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
   * Ao mudar de serviço,
   * limpar hora selecionada.
   */

  useEffect(() => {
    setTime('');
  }, [serviceId]);


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
     ATUALIZAR DISPONIBILIDADE
  ======================================================= */

  const refreshAvailability = async () => {

    if (!date || !serviceId) return;


    try {

      const response = await fetch(
        `/api/availability?date=${encodeURIComponent(
          date,
        )}&serviceId=${encodeURIComponent(
          serviceId,
        )}`,
      );


      const data = await response
        .json()
        .catch(() => null);


      if (response.ok) {

        setAvailableTimes(
          Array.isArray(data?.availableTimes)
            ? data.availableTimes
            : [],
        );

      }

    } catch (err) {

      console.error(
        'Erro ao atualizar disponibilidade:',
        err,
      );

    }

  };


  /* =======================================================
     SUBMIT
  ======================================================= */

  const submit = async (event) => {

    event.preventDefault();


    if (!selectedService) {

      setError(
        'Escolhe primeiro um serviço.',
      );

      return;

    }


    if (!date) {

      setError(
        'Escolhe uma data.',
      );

      return;

    }


    if (!time) {

      setError(
        'Escolhe um horário disponível.',
      );

      return;

    }


    if (
      !form.name.trim() ||
      !form.phone.trim() ||
      !form.email.trim()
    ) {

      setError(
        'Preenche todos os teus dados.',
      );

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
         SUPABASE + EMAIL
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


      /* =====================================================
         HORÁRIO OCUPADO ENTRETANTO
      ===================================================== */

      if (!response.ok) {

        console.error(
          'ERRO /api/booking:',
          response.status,
          data,
        );


        if (response.status === 409) {

          setTime('');

          await refreshAvailability();


          throw new Error(
            data?.message ||
              'Esse horário acabou de ficar ocupado. Escolhe outro horário.',
          );

        }


        throw new Error(
          data?.message ||
            `Erro /api/booking: ${response.status}`,
        );

      }


      console.log(
        'Marcação criada:',
        data,
      );


      /* =====================================================
         LOCAL STORAGE / ADMIN
      ===================================================== */

      saveBooking(booking);


      /* =====================================================
         SUCESSO
      ===================================================== */

      setSuccess(true);


    } catch (err) {

      console.error(
        'Erro na marcação:',
        err,
      );


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
     SUCESSO
  ========================================================= */

  if (success) {

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
          aria-label="Marcação confirmada"
        >

          <button
            type="button"
            className="close-btn modal-close"
            onClick={onClose}
            aria-label="Fechar"
          >
            ×
          </button>


          <div className="success-step">

            <div className="success-icon">
              ✓
            </div>

            <h3>
              Marcação registada.
            </h3>

            <p>
              A tua marcação foi enviada com sucesso.
            </p>


            <div className="booking-summary">

              <strong>
                {selectedService?.name}
              </strong>

              <br />

              {date
                ? new Date(
                    `${date}T12:00:00`,
                  ).toLocaleDateString(
                    'pt-PT',
                  )
                : ''}

              {' às '}

              {time}

            </div>


            <button
              type="button"
              className="btn btn-dark full"
              onClick={onClose}
            >
              Fechar
            </button>

          </div>

        </div>

      </div>

    );

  }


  /* =========================================================
     FORMULÁRIO ÚNICO
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
        className="booking-modal booking-modal-single"
        role="dialog"
        aria-modal="true"
        aria-label="Agendamento"
      >

        <button
          type="button"
          className="close-btn modal-close"
          onClick={onClose}
          aria-label="Fechar"
        >
          ×
        </button>


        {/* HEADER */}

        <div className="booking-head">

          <p className="eyebrow dark">
            Agendamento
          </p>

          <h2>
            Marca a tua próxima visita.
          </h2>

          <p className="booking-head-description">
            Escolhe o serviço, a data e o horário
            que preferes.
          </p>

        </div>


        {/* FORM */}

        <form
          className="booking-single-form"
          onSubmit={submit}
        >

          {/* ===============================================
              DATA + SERVIÇO
          =============================================== */}

          <div className="booking-single-top">

            <div className="booking-field">

              <label htmlFor="booking-date">
                Data da marcação
              </label>

              <input
                id="booking-date"
                type="date"
                min={getTodayInBookingTimeZone()}
                value={date}
                onChange={handleDateChange}
                required
              />

            </div>


            <div className="booking-field">

              <label htmlFor="booking-service">
                Serviço
              </label>

              <select
                id="booking-service"
                value={serviceId || ''}
                onChange={(event) =>
                  setServiceId(
                    event.target.value,
                  )
                }
                required
              >

                <option value="">
                  Escolhe um serviço
                </option>

                {services.map((service) => (

                  <option
                    key={service.id}
                    value={service.id}
                  >
                    {service.name}
                    {' — '}
                    {service.duration} min
                    {' — '}
                    {formatCurrency(
                      service.price,
                    )}
                  </option>

                ))}

              </select>

            </div>

          </div>


          {/* ===============================================
              HORÁRIOS
          =============================================== */}

          <div className="booking-times-section">

            <div className="booking-times-header">

              <label>
                Horário
              </label>

              {selectedService && (

                <span>
                  {selectedService.duration} min
                  {' · '}
                  {formatCurrency(
                    selectedService.price,
                  )}
                </span>

              )}

            </div>


            {!date || !selectedService ? (

              <div className="booking-times-placeholder">
                Escolhe primeiro a data e o serviço
                para veres os horários disponíveis.
              </div>

            ) : loadingTimes ? (

              <div className="booking-times-placeholder">
                A verificar horários...
              </div>

            ) : availableTimes.length === 0 ? (

              <div className="booking-times-placeholder">
                Não existem horários disponíveis
                para esta data.
              </div>

            ) : (

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

            )}

          </div>


          {/* ===============================================
              CLIENTE
          =============================================== */}

          <div className="booking-client-grid">

            <div className="booking-field">

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
                autoComplete="name"
                required
              />

            </div>


            <div className="booking-field">

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
                autoComplete="tel"
                required
              />

            </div>


            <div className="booking-field booking-field-full">

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
                autoComplete="email"
                required
              />

            </div>

          </div>


          {/* ===============================================
              RESUMO
          =============================================== */}

          {selectedService && date && time && (

            <div className="booking-summary">

              <strong>
                Resumo da marcação
              </strong>

              <span>
                {selectedService.name}
              </span>

              <span>
                {new Date(
                  `${date}T12:00:00`,
                ).toLocaleDateString(
                  'pt-PT',
                )}

                {' · '}

                {time}
              </span>

              <span>
                {formatCurrency(
                  selectedService.price,
                )}
              </span>

            </div>

          )}


          {/* ERROR */}

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


          {/* SUBMIT */}

          <button
            type="submit"
            className="btn btn-dark full booking-submit"
            disabled={
              sending ||
              loadingTimes
            }
          >

            {sending
              ? 'A agendar...'
              : 'Agendar'}

          </button>

        </form>

      </div>

    </div>

  );

}