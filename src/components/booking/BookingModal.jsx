import { useEffect, useMemo, useState } from 'react';

import { services } from '../../data/services';

import { formatCurrency } from '../../utils/currency';
import { saveBooking } from '../../utils/storage';


/* =========================================================
   HORÁRIO DA BARBEARIA
========================================================= */

const OPENING_PERIODS = [
  {
    start: '10:00',
    end: '13:00',
  },
  {
    start: '15:00',
    end: '16:40',
  },
];


/*
 * De quanto em quanto tempo podem começar marcações.
 *
 * 10 significa:
 *
 * 10:00
 * 10:10
 * 10:20
 * 10:30
 * ...
 * A duração do serviço é usada para verificar
 * se cabe completamente no horário.
 */

const SLOT_INTERVAL = 10;


/* =========================================================
   HELPERS
========================================================= */

function getTomorrow() {
  const date = new Date();

  date.setDate(date.getDate() + 1);

  return date.toISOString().split('T')[0];
}


function timeToMinutes(time) {
  const [hours, minutes] = time
    .split(':')
    .map(Number);

  return hours * 60 + minutes;
}


function minutesToTime(totalMinutes) {
  const hours = Math.floor(
    totalMinutes / 60,
  );

  const minutes =
    totalMinutes % 60;

  return `${String(hours).padStart(
    2,
    '0',
  )}:${String(minutes).padStart(
    2,
    '0',
  )}`;
}


/*
 * Gera os horários possíveis de acordo
 * com a duração do serviço.
 */

function generateBookingSlots(duration) {
  if (!duration || duration <= 0) {
    return [];
  }

  const slots = [];

  OPENING_PERIODS.forEach(
    ({ start, end }) => {
      const startMinutes =
        timeToMinutes(start);

      const endMinutes =
        timeToMinutes(end);

      for (
        let current = startMinutes;
        current + duration <= endMinutes;
        current += SLOT_INTERVAL
      ) {
        slots.push(
          minutesToTime(current),
        );
      }
    },
  );

  return slots;
}


function isSunday(dateString) {
  if (!dateString) {
    return false;
  }

  const selectedDate = new Date(
    `${dateString}T12:00:00`,
  );

  return selectedDate.getDay() === 0;
}


/* =========================================================
   BOOKING MODAL
========================================================= */

export default function BookingModal({
  open,
  initialServiceId,
  onClose,
}) {
  const [step, setStep] =
    useState(1);

  const [serviceId, setServiceId] =
    useState(null);

  const [date, setDate] =
    useState('');

  const [time, setTime] =
    useState('');

  const [form, setForm] =
    useState({
      name: '',
      phone: '',
      email: '',
      followupOptOut: false,
    });

  const [sending, setSending] =
    useState(false);

  const [error, setError] =
    useState('');


  /* =======================================================
     RESET QUANDO ABRE
  ======================================================= */

  useEffect(() => {
    if (!open) return;

    setStep(1);

    setServiceId(
      initialServiceId || null,
    );

    setDate('');
    setTime('');

    setForm({
      name: '',
      phone: '',
      email: '',
      followupOptOut: false,
    });

    setSending(false);
    setError('');
  }, [
    open,
    initialServiceId,
  ]);


  /* =======================================================
     SERVIÇO SELECIONADO
  ======================================================= */

  const selectedService =
    useMemo(
      () =>
        services.find(
          (service) =>
            service.id === serviceId,
        ),
      [serviceId],
    );


  /* =======================================================
     HORÁRIOS DINÂMICOS
  ======================================================= */

  const availableTimes =
    useMemo(() => {
      if (!selectedService) {
        return [];
      }

      return generateBookingSlots(
        selectedService.duration,
      );
    }, [selectedService]);


  /*
   * Se trocar de serviço,
   * limpa a hora anterior porque pode
   * já não ser válida para a nova duração.
   */

  useEffect(() => {
    setTime('');
  }, [serviceId]);


  if (!open) return null;


  /* =======================================================
     NAVEGAÇÃO
  ======================================================= */

  const next = () => {
    if (
      step === 1 &&
      !selectedService
    ) {
      window.alert(
        'Escolhe primeiro um serviço.',
      );

      return;
    }


    if (
      step === 2 &&
      (!date || !time)
    ) {
      window.alert(
        'Escolhe uma data e um horário.',
      );

      return;
    }


    setStep(
      (value) => value + 1,
    );
  };


  const previous = () => {
    setStep((value) =>
      Math.max(
        1,
        value - 1,
      ),
    );
  };


  /* =======================================================
     DATA
  ======================================================= */

  const handleDateChange = (
    event,
  ) => {
    const nextDate =
      event.target.value;

    /*
     * Domingo fechado
     */

    if (
      nextDate &&
      isSunday(nextDate)
    ) {
      setDate('');
      setTime('');

      window.alert(
        'A barbearia está fechada ao domingo.',
      );

      return;
    }

    setDate(nextDate);

    /*
     * Ao trocar de dia,
     * limpa a hora selecionada.
     */

    setTime('');
  };


  /* =======================================================
     SUBMIT
  ======================================================= */

  const submit = async (
    event,
  ) => {
    event.preventDefault();

    if (!selectedService) {
      return;
    }

    setSending(true);
    setError('');


    const booking = {
      id: Date.now(),

      serviceId:
        selectedService.id,

      service:
        selectedService.name,

      price:
        selectedService.price,

      duration:
        selectedService.duration,

      date,
      time,

      name:
        form.name.trim(),

      phone:
        form.phone.trim(),

      email:
        form.email.trim(),

      marketingConsent: true,

      status: 'Confirmado',

      createdAt:
        new Date().toISOString(),
    };


    try {
      /* ===============================================
         EMAIL VIA VERCEL FUNCTION
      =============================================== */

      const response =
        await fetch(
          '/api/booking',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              name:
                booking.name,

              phone:
                booking.phone,

              email:
                booking.email,

              marketingConsent:
                booking.marketingConsent,

              service:
                booking.service,

              duration:
                booking.duration,

              date:
                booking.date,

              time:
                booking.time,

              price:
                booking.price,
            }),
          },
        );


      if (!response.ok) {
        const data =
          await response
            .json()
            .catch(
              () => null,
            );

        throw new Error(
          data?.message ||
            'Erro ao enviar a marcação.',
        );
      }


      /* ===============================================
         LOCAL STORAGE / ADMIN ATUAL
      =============================================== */

      saveBooking(
        booking,
      );


      /* ===============================================
         SUCESSO
      =============================================== */

      setStep(4);

    } catch (err) {
      console.error(
        'Erro na marcação:',
        err,
      );

      setError(
        'Não foi possível enviar a marcação. Tenta novamente.',
      );

    } finally {
      setSending(false);
    }
  };


  /* =========================================================
     UI
  ========================================================= */

  return (
    <div
      className="modal-backdrop open"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
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
                step === 1
                  ? 'active'
                  : ''
              }
            >
              1 Serviço
            </span>

            <span
              className={
                step === 2
                  ? 'active'
                  : ''
              }
            >
              2 Horário
            </span>

            <span
              className={
                step === 3
                  ? 'active'
                  : ''
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

              {services.map(
                (service) => (

                  <button
                    key={
                      service.id
                    }

                    type="button"

                    className={`booking-service ${
                      serviceId ===
                      service.id
                        ? 'selected'
                        : ''
                    }`}

                    onClick={() =>
                      setServiceId(
                        service.id,
                      )
                    }
                  >

                    <strong>
                      {service.name}
                    </strong>

                    <span>
                      {
                        service.duration
                      } min

                      {' · '}

                      {formatCurrency(
                        service.price,
                      )}
                    </span>

                  </button>

                ),
              )}

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
                  marginBottom:
                    '22px',

                  padding:
                    '14px 16px',

                  background:
                    'rgba(212, 175, 55, 0.12)',

                  border:
                    '1px solid rgba(212, 175, 55, 0.30)',
                }}
              >

                <strong>
                  {
                    selectedService.name
                  }
                </strong>

                <div
                  style={{
                    marginTop:
                      '4px',

                    fontSize:
                      '13px',

                    opacity:
                      0.7,
                  }}
                >
                  {
                    selectedService.duration
                  } minutos

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

              min={getTomorrow()}

              value={date}

              onChange={
                handleDateChange
              }

              required
            />


            <label>
              Escolhe o horário
            </label>


            <div className="time-grid">

              {availableTimes.map(
                (slot) => (

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

                ),
              )}

            </div>


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

                  value={
                    form.name
                  }

                  onChange={(
                    event,
                  ) =>
                    setForm({
                      ...form,

                      name:
                        event
                          .target
                          .value,
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

                  value={
                    form.phone
                  }

                  onChange={(
                    event,
                  ) =>
                    setForm({
                      ...form,

                      phone:
                        event
                          .target
                          .value,
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

                  value={
                    form.email
                  }

                  onChange={(
                    event,
                  ) =>
                    setForm({
                      ...form,

                      email:
                        event
                          .target
                          .value,
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

              {
                selectedService?.duration
              } min

              {' · '}

              {formatCurrency(
                selectedService?.price ||
                  0,
              )}

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


            {error && (
              <p
                style={{
                  color:
                    '#b42318',

                  marginTop:
                    '15px',

                  fontSize:
                    '14px',
                }}
              >
                {error}
              </p>
            )}


            <div className="two-buttons">

              <button
                type="button"
                className="btn btn-outline"

                onClick={
                  previous
                }

                disabled={
                  sending
                }
              >
                Voltar
              </button>


              <button
                type="submit"
                className="btn btn-dark"

                disabled={
                  sending
                }
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