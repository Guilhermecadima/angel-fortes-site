import {
  useEffect,
  useMemo,
  useState,
} from 'react';

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

  const [serviceId, setServiceId] =
    useState(null);

  const [date, setDate] =
    useState('');

  /*
   * Hora que o cliente gostaria
   * idealmente de marcar.
   */
  const [
    preferredTime,
    setPreferredTime,
  ] = useState('');


  /*
   * Hora efetivamente escolhida
   * entre as sugestões.
   */
  const [time, setTime] =
    useState('');


  /*
   * Agora já NÃO guardamos todos
   * os horários disponíveis.
   *
   * A API devolve apenas os melhores
   * horários próximos da hora pedida.
   */
  const [
    suggestedTimes,
    setSuggestedTimes,
  ] = useState([]);


  const [
    loadingTimes,
    setLoadingTimes,
  ] = useState(false);


  const [form, setForm] =
    useState({
      name: '',
      phone: '',
      email: '',
    });


  const [sending, setSending] =
    useState(false);

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState(false);


  /* =======================================================
     RESET QUANDO ABRE
  ======================================================= */

  useEffect(() => {

    if (!open) return;


    setServiceId(
      initialServiceId || null,
    );


    setDate('');

    setPreferredTime('');

    setTime('');

    setSuggestedTimes([]);

    setLoadingTimes(false);


    setForm({
      name: '',
      phone: '',
      email: '',
    });


    setSending(false);

    setError('');

    setSuccess(false);

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
            String(service.id) ===
            String(serviceId),
        ),
      [serviceId],
    );


  /* =======================================================
     CARREGAR SUGESTÕES
  ======================================================= */

  useEffect(() => {

    if (
      !open ||
      !serviceId ||
      !date ||
      !preferredTime
    ) {

      setSuggestedTimes([]);

      return;

    }


    const controller =
      new AbortController();


    const loadSuggestions =
      async () => {

        setLoadingTimes(true);

        setSuggestedTimes([]);

        setTime('');

        setError('');


        try {

          const params =
            new URLSearchParams({
              date,
              serviceId:
                String(serviceId),

              preferredTime,
            });


          const response =
            await fetch(
              `/api/availability?${params.toString()}`,
              {
                signal:
                  controller.signal,
              },
            );


          const data =
            await response
              .json()
              .catch(() => null);


          if (!response.ok) {

            throw new Error(
              data?.message ||
                'Erro ao verificar horários.',
            );

          }


          if (
            controller.signal.aborted
          ) {
            return;
          }


          setSuggestedTimes(
            Array.isArray(
              data?.suggestedTimes,
            )
              ? data.suggestedTimes
              : [],
          );


        } catch (err) {

          if (
            err.name ===
            'AbortError'
          ) {
            return;
          }


          console.error(
            'Erro disponibilidade:',
            err,
          );


          setSuggestedTimes([]);


          setError(
            err.message ||
              'Não foi possível verificar os horários.',
          );


        } finally {

          if (
            !controller.signal
              .aborted
          ) {

            setLoadingTimes(false);

          }

        }

      };


    loadSuggestions();


    return () => {

      controller.abort();

    };

  }, [
    open,
    serviceId,
    date,
    preferredTime,
  ]);


  /* =======================================================
     SERVIÇO
  ======================================================= */

  useEffect(() => {

    setTime('');

    setSuggestedTimes([]);

  }, [serviceId]);


  /* =======================================================
     DATA
  ======================================================= */

  const handleDateChange =
    (event) => {

      const nextDate =
        event.target.value;


      if (
        nextDate &&
        isSunday(nextDate)
      ) {

        setDate('');

        setTime('');

        setSuggestedTimes([]);


        window.alert(
          'A barbearia está fechada ao domingo.',
        );


        return;

      }


      setDate(nextDate);

      setTime('');

      setSuggestedTimes([]);

      setError('');

    };


  /* =======================================================
     HORA PRETENDIDA
  ======================================================= */

  const handlePreferredTimeChange =
    (event) => {

      setPreferredTime(
        event.target.value,
      );

      setTime('');

      setSuggestedTimes([]);

      setError('');

    };


  /* =======================================================
     ATUALIZAR SUGESTÕES
  ======================================================= */

  const refreshAvailability =
    async () => {

      if (
        !date ||
        !serviceId ||
        !preferredTime
      ) {
        return;
      }


      try {

        const params =
          new URLSearchParams({
            date,

            serviceId:
              String(serviceId),

            preferredTime,
          });


        const response =
          await fetch(
            `/api/availability?${params.toString()}`,
          );


        const data =
          await response
            .json()
            .catch(() => null);


        if (response.ok) {

          setSuggestedTimes(
            Array.isArray(
              data?.suggestedTimes,
            )
              ? data.suggestedTimes
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

  const submit =
    async (event) => {

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


      if (!preferredTime) {

        setError(
          'Indica a hora a que gostarias de marcar.',
        );

        return;

      }


      if (!time) {

        setError(
          'Escolhe um dos horários disponíveis.',
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

        id:
          Date.now(),

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

        preferredTime,

        name:
          form.name.trim(),

        phone:
          form.phone.trim(),

        email:
          form.email.trim(),

        status:
          'Confirmado',

        createdAt:
          new Date()
            .toISOString(),

      };


      try {

        const response =
          await fetch(
            '/api/booking',
            {

              method:
                'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body:
                JSON.stringify({

                  name:
                    booking.name,

                  phone:
                    booking.phone,

                  email:
                    booking.email,

                  serviceId:
                    booking.serviceId,

                  date:
                    booking.date,

                  time:
                    booking.time,

                }),

            },
          );


        const data =
          await response
            .json()
            .catch(() => null);


        if (!response.ok) {

          console.error(
            'ERRO /api/booking:',
            response.status,
            data,
          );


          if (
            response.status ===
            409
          ) {

            setTime('');


            await refreshAvailability();


            throw new Error(
              data?.message ||
                'Esse horário acabou de ficar ocupado. Vê as novas sugestões.',
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


        saveBooking(
          booking,
        );


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


  /* =========================================================
     CLOSED
  ========================================================= */

  if (!open) {
    return null;
  }


  /* =========================================================
     SUCESSO
  ========================================================= */

  if (success) {

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
              A tua marcação foi enviada
              com sucesso.
            </p>


            <div className="booking-summary">

              <strong>
                {selectedService?.name}
              </strong>


              <span>

                {date
                  ? new Date(
                      `${date}T12:00:00`,
                    ).toLocaleDateString(
                      'pt-PT',
                    )
                  : ''}

                {' · '}

                {time}

              </span>


              <span>
                {selectedService
                  ? formatCurrency(
                      selectedService.price,
                    )
                  : ''}
              </span>

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
     FORMULÁRIO
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
            Diz-nos quando gostarias de vir.
            Mostramos-te apenas os melhores
            horários disponíveis próximos.
          </p>

        </div>


        <form
          className="booking-single-form"
          onSubmit={submit}
        >

          {/* DATA + SERVIÇO */}

          <div className="booking-single-top">

            <div className="booking-field">

              <label htmlFor="booking-date">
                Data da marcação
              </label>


              {/* FIX IOS */}
              <div className="native-picker-wrap">

                <input
                  id="booking-date"
                  type="date"
                  min={
                    getTodayInBookingTimeZone()
                  }
                  value={date}
                  onChange={
                    handleDateChange
                  }
                  required
                />

              </div>

            </div>


            <div className="booking-field booking-service-field">

              <label htmlFor="booking-service">
                Escolha o corte
              </label>


              <select
                id="booking-service"
                value={
                  serviceId || ''
                }
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


                {services.map(
                  (service) => (

                    <option
                      key={
                        service.id
                      }
                      value={
                        service.id
                      }
                    >
                      {service.name}
                      {' — '}
                      {formatCurrency(
                        service.price,
                      )}
                    </option>

                  ),
                )}

              </select>

            </div>

          </div>


          {/* HORA PRETENDIDA */}

          <div className="preferred-time-block">

            <div className="booking-field preferred-time-field booking-preferred-card">

              <label htmlFor="preferred-time">
                A que horas gostarias de marcar?
              </label>


              {/* FIX IOS */}
              <div className="native-picker-wrap">

                <input
                  id="preferred-time"
                  type="time"
                  step="600"
                  value={
                    preferredTime
                  }
                  onChange={
                    handlePreferredTimeChange
                  }
                  required
                />

              </div>


              <small>
                Não precisa de ser exatamente
                essa hora. Vamos procurar os
                melhores horários próximos.
              </small>

            </div>

          </div>


          {/* SUGESTÕES */}

          <div className="booking-times-section">

            <div className="booking-times-header">

              <label>
                Horários disponíveis próximos
              </label>


              {selectedService && (

                <span>
                  {selectedService.duration}
                  {' min · '}

                  {formatCurrency(
                    selectedService.price,
                  )}
                </span>

              )}

            </div>


            {!date ||
            !selectedService ? (

              <div className="booking-times-placeholder">
                Escolhe primeiro a data
                e o corte.
              </div>

            ) : !preferredTime ? (

              <div className="booking-times-placeholder">
                Diz-nos a que horas
                gostarias de marcar.
              </div>

            ) : loadingTimes ? (

              <div className="booking-times-placeholder">
                A procurar os melhores
                horários...
              </div>

            ) : suggestedTimes.length ===
              0 ? (

              <div className="booking-times-placeholder">
                Não encontrámos horários
                disponíveis próximos desta
                hora. Experimenta outra hora.
              </div>

            ) : (

              <div className="time-grid time-grid-suggestions">

                {suggestedTimes.map(
                  (suggestion) => {

                    const isSelected =
                      time ===
                      suggestion.time;


                    let label =
                      'Disponível';


                    if (
                      suggestion.recommended &&
                      suggestion.requested
                    ) {

                      label =
                        'A tua hora · recomendada';

                    } else if (
                      suggestion.recommended
                    ) {

                      label =
                        'Melhor encaixe';

                    } else if (
                      suggestion.requested
                    ) {

                      label =
                        'A tua hora';

                    }


                    return (

                      <button
                        key={
                          suggestion.time
                        }
                        type="button"
                        className={[
                          'time-btn',
                          'suggestion-time-btn',

                          isSelected
                            ? 'selected'
                            : '',

                          suggestion.recommended
                            ? 'recommended'
                            : '',

                          suggestion.requested
                            ? 'requested'
                            : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() =>
                          setTime(
                            suggestion.time,
                          )
                        }
                      >

                        <strong>
                          {suggestion.time}
                        </strong>


                        <small>
                          {label}
                        </small>

                      </button>

                    );

                  },
                )}

              </div>

            )}

          </div>


          {/* CLIENTE */}

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

                    name:
                      event.target
                        .value,
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

                    phone:
                      event.target
                        .value,
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

                    email:
                      event.target
                        .value,
                  })
                }
                placeholder="nome@email.com"
                autoComplete="email"
                required
              />

            </div>

          </div>


          {/* RESUMO */}

          {selectedService &&
            date &&
            time && (

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


          {error && (

            <p className="booking-error">
              {error}
            </p>

          )}


          <button
            type="submit"
            className="btn btn-dark full booking-submit"
            disabled={
              sending ||
              loadingTimes ||
              !time
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