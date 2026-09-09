import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Link,
} from 'react-router-dom';

import {
  isSupabaseConfigured,
} from '../lib/supabase';

import {
  getAdminSession,
  signInAdmin,
  signOutAdmin,
  subscribeToAuth,
} from '../services/auth';


const STATUS_LABELS = {
  pending: 'Pendente',
  confirmed: 'Confirmada',
  completed: 'Concluída',
  cancelled: 'Cancelada',
  no_show: 'Não apareceu',
};


function parseLocalDate(
  dateString,
) {
  return new Date(
    `${dateString}T12:00:00`,
  );
}


function formatDate(
  dateString,
) {
  const date =
    parseLocalDate(
      dateString,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return dateString;
  }

  return new Intl.DateTimeFormat(
    'pt-PT',
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    },
  ).format(date);
}


function formatShortDate(
  dateString,
) {
  const date =
    parseLocalDate(
      dateString,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return dateString;
  }

  return new Intl.DateTimeFormat(
    'pt-PT',
    {
      day: '2-digit',
      month: '2-digit',
    },
  ).format(date);
}


function formatTime(time) {
  return String(
    time || '',
  ).slice(0, 5);
}


function formatPrice(price) {
  const numericPrice =
    Number(price);

  if (
    !Number.isFinite(
      numericPrice,
    )
  ) {
    return '';
  }

  return new Intl.NumberFormat(
    'pt-PT',
    {
      style: 'currency',
      currency: 'EUR',
    },
  ).format(
    numericPrice,
  );
}


function getPortugalToday() {
  const parts =
    new Intl.DateTimeFormat(
      'en-GB',
      {
        timeZone:
          'Europe/Lisbon',

        year:
          'numeric',

        month:
          '2-digit',

        day:
          '2-digit',
      },
    ).formatToParts(
      new Date(),
    );

  const get =
    (type) =>
      parts.find(
        (part) =>
          part.type === type,
      )?.value;

  return (
    `${get('year')}-` +
    `${get('month')}-` +
    `${get('day')}`
  );
}


function groupByDate(
  appointments,
) {
  return appointments.reduce(
    (
      groups,
      appointment,
    ) => {
      const key =
        appointment
          .appointment_date;

      if (!groups[key]) {
        groups[key] = [];
      }

      groups[key].push(
        appointment,
      );

      return groups;
    },
    {},
  );
}


/* =========================================
   LOGIN MARCAÇÕES
========================================= */

function AppointmentsLogin({
  onSuccess,
}) {
  const [
    form,
    setForm,
  ] = useState({
    email: '',
    password: '',
  });

  const [
    sending,
    setSending,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState('');


  const submit =
    async (event) => {
      event.preventDefault();

      setSending(true);
      setError('');

      try {
        const session =
          await signInAdmin(
            form.email,
            form.password,
          );

        onSuccess(session);
      } catch (err) {
        console.error(err);

        setError(
          'Email ou password incorretos.',
        );
      } finally {
        setSending(false);
      }
    };


  return (
    <div className="appointments-login-page">

      <form
        className="appointments-login-card"
        onSubmit={submit}
      >

        <div className="appointments-login-mark">
          AF
        </div>


        <div>

          <p className="appointments-kicker">
            Área privada
          </p>

          <h1>
            Marcações
          </h1>

          <p>
            Entra para veres as
            próximas marcações da
            barbearia.
          </p>

        </div>


        <label>

          <span>
            Email
          </span>

          <input
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={(event) =>
              setForm({
                ...form,
                email:
                  event.target.value,
              })
            }
          />

        </label>


        <label>

          <span>
            Password
          </span>

          <input
            type="password"
            required
            autoComplete="current-password"
            value={form.password}
            onChange={(event) =>
              setForm({
                ...form,
                password:
                  event.target.value,
              })
            }
          />

        </label>


        {error && (
          <p className="appointments-form-error">
            {error}
          </p>
        )}


        <button
          className="btn btn-dark full"
          type="submit"
          disabled={sending}
        >
          {sending
            ? 'A entrar...'
            : 'Entrar'}
        </button>


        <Link
          className="appointments-login-back"
          to="/"
        >
          Voltar ao site
        </Link>

      </form>

    </div>
  );
}


/* =========================================
   PÁGINA
========================================= */

export default function AppointmentsPage() {
  const [
    session,
    setSession,
  ] = useState(null);

  const [
    authLoading,
    setAuthLoading,
  ] = useState(true);

  const [
    appointments,
    setAppointments,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState('');

  const [
    query,
    setQuery,
  ] = useState('');

  const [
    view,
    setView,
  ] = useState(
    'upcoming',
  );

  const [
    lastUpdated,
    setLastUpdated,
  ] = useState(null);


  const today =
    getPortugalToday();


  /* =====================================
     AUTH
  ===================================== */

  useEffect(() => {
    if (
      !isSupabaseConfigured
    ) {
      setAuthLoading(false);

      return undefined;
    }

    let mounted =
      true;


    getAdminSession()
      .then(
        (
          currentSession,
        ) => {
          if (mounted) {
            setSession(
              currentSession,
            );
          }
        },
      )
      .catch(
        (err) => {
          console.error(err);
        },
      )
      .finally(() => {
        if (mounted) {
          setAuthLoading(
            false,
          );
        }
      });


    const unsubscribe =
      subscribeToAuth(
        (
          nextSession,
        ) => {
          setSession(
            nextSession,
          );
        },
      );


    return () => {
      mounted =
        false;

      unsubscribe();
    };
  }, []);


  /* =====================================
     CARREGAR MARCAÇÕES
  ===================================== */

  const loadAppointments =
    async (
      activeSession =
        session,
    ) => {
      if (
        !activeSession
          ?.access_token
      ) {
        return;
      }

      setLoading(true);
      setError('');

      try {
        const response =
          await fetch(
            '/api/admin/appointments',
            {
              method:
                'GET',

              headers: {
                Authorization:
                  `Bearer ${activeSession.access_token}`,
              },
            },
          );


        const data =
          await response
            .json()
            .catch(
              () => ({}),
            );


        if (
          response.status ===
            401 ||
          response.status ===
            403
        ) {
          await signOutAdmin()
            .catch(
              () => {},
            );

          setSession(null);

          throw new Error(
            'A sessão expirou. Entra novamente.',
          );
        }


        if (!response.ok) {
          throw new Error(
            data.message ||
              'Não foi possível carregar as marcações.',
          );
        }


        setAppointments(
          Array.isArray(
            data.appointments,
          )
            ? data.appointments
            : [],
        );

        setLastUpdated(
          new Date(),
        );
      } catch (err) {
        console.error(err);

        setError(
          err.message ||
            'Não foi possível carregar as marcações.',
        );
      } finally {
        setLoading(false);
      }
    };


  useEffect(() => {
    if (
      session?.access_token
    ) {
      loadAppointments(
        session,
      );
    }
  }, [
    session?.access_token,
  ]);


  /* =====================================
     FILTROS
  ===================================== */

  const filteredAppointments =
    useMemo(() => {
      const normalizedQuery =
        query
          .trim()
          .toLowerCase();

      return appointments.filter(
        (
          appointment,
        ) => {
          if (
            view ===
              'today' &&
            appointment
              .appointment_date !==
              today
          ) {
            return false;
          }


          if (
            !normalizedQuery
          ) {
            return true;
          }


          const searchable =
            [
              appointment.name,

              appointment.phone,

              appointment.email,

              appointment.service,
            ]
              .filter(Boolean)
              .join(' ')
              .toLowerCase();


          return searchable.includes(
            normalizedQuery,
          );
        },
      );
    }, [
      appointments,
      query,
      today,
      view,
    ]);


  const groupedAppointments =
    useMemo(
      () =>
        groupByDate(
          filteredAppointments,
        ),

      [
        filteredAppointments,
      ],
    );


  const groupDates =
    Object.keys(
      groupedAppointments,
    ).sort();


  const todayCount =
    appointments.filter(
      (
        appointment,
      ) =>
        appointment
          .appointment_date ===
          today &&
        appointment.status !==
          'cancelled',
    ).length;


  const activeCount =
    appointments.filter(
      (
        appointment,
      ) =>
        appointment.status !==
        'cancelled',
    ).length;


  const logout =
    async () => {
      await signOutAdmin();

      setSession(null);
    };


  /* =====================================
     ESTADOS
  ===================================== */

  if (
    !isSupabaseConfigured
  ) {
    return (
      <div className="appointments-state-page">

        <div className="appointments-state-card">

          <p className="appointments-kicker">
            Configuração necessária
          </p>

          <h1>
            Supabase não está
            configurado.
          </h1>

          <p>
            Confirma as variáveis
            VITE_SUPABASE_URL e
            VITE_SUPABASE_ANON_KEY.
          </p>

          <Link
            className="btn btn-dark"
            to="/"
          >
            Voltar ao site
          </Link>

        </div>

      </div>
    );
  }


  if (authLoading) {
    return (
      <div className="appointments-loading-page">
        A abrir marcações...
      </div>
    );
  }


  if (!session) {
    return (
      <AppointmentsLogin
        onSuccess={
          setSession
        }
      />
    );
  }


  /* =====================================
     UI
  ===================================== */

  return (
    <div className="appointments-page">

      <header className="appointments-header">

        <div>

          <p>
            Angel Fortes
          </p>

          <strong>
            Marcações
          </strong>

        </div>


        <div className="appointments-header-actions">

          <Link to="/">
            Ver site
          </Link>

          <button
            type="button"
            onClick={logout}
          >
            Sair
          </button>

        </div>

      </header>


      <main className="appointments-wrap">

        <section className="appointments-intro">

          <div>

            <p className="appointments-kicker">
              Área privada
            </p>

            <h1>
              Próximas marcações
            </h1>

            <p className="appointments-subtitle">
              Consulta rapidamente
              quem tens marcado, a que
              horas e qual o serviço.
            </p>

          </div>


          <button
            className="appointments-refresh"
            type="button"
            onClick={() =>
              loadAppointments()
            }
            disabled={loading}
          >
            {loading
              ? 'A atualizar...'
              : 'Atualizar'}
          </button>

        </section>


        <section
          className="appointments-kpis"
          aria-label="Resumo das marcações"
        >

          <div>

            <span>
              Hoje
            </span>

            <strong>
              {todayCount}
            </strong>

          </div>


          <div>

            <span>
              Próximas
            </span>

            <strong>
              {activeCount}
            </strong>

          </div>


          <div>

            <span>
              Atualizado
            </span>

            <strong className="appointments-updated-time">

              {lastUpdated
                ? new Intl.DateTimeFormat(
                    'pt-PT',
                    {
                      hour:
                        '2-digit',

                      minute:
                        '2-digit',
                    },
                  ).format(
                    lastUpdated,
                  )
                : '—'}

            </strong>

          </div>

        </section>


        <section className="appointments-toolbar">

          <div className="appointments-tabs">

            <button
              type="button"
              className={
                view ===
                'upcoming'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setView(
                  'upcoming',
                )
              }
            >
              Próximas
            </button>


            <button
              type="button"
              className={
                view ===
                'today'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setView(
                  'today',
                )
              }
            >
              Hoje
            </button>

          </div>


          <label className="appointments-search">

            <span>
              Pesquisar
            </span>

            <input
              type="search"
              placeholder="Nome, telefone ou serviço"
              value={query}
              onChange={(event) =>
                setQuery(
                  event.target.value,
                )
              }
            />

          </label>

        </section>


        {error && (
          <div className="appointments-alert">
            {error}
          </div>
        )}


        {loading &&
        appointments.length ===
          0 ? (

          <div className="appointments-empty">
            A carregar marcações...
          </div>

        ) : groupDates.length ===
          0 ? (

          <div className="appointments-empty">

            {view === 'today'
              ? 'Não tens marcações para hoje.'
              : 'Não existem marcações futuras para mostrar.'}

          </div>

        ) : (

          <div className="appointments-days">

            {groupDates.map(
              (date) => (

                <section
                  className="appointments-day"
                  key={date}
                >

                  <div className="appointments-day-heading">

                    <div>

                      <span>

                        {date ===
                        today
                          ? 'Hoje'
                          : formatShortDate(
                              date,
                            )}

                      </span>


                      <h2>
                        {formatDate(
                          date,
                        )}
                      </h2>

                    </div>


                    <strong>

                      {
                        groupedAppointments[
                          date
                        ].length
                      }{' '}

                      {groupedAppointments[
                        date
                      ].length ===
                      1
                        ? 'marcação'
                        : 'marcações'}

                    </strong>

                  </div>


                  <div className="appointments-list">

                    {groupedAppointments[
                      date
                    ].map(
                      (
                        appointment,
                      ) => (

                        <article
                          className={
                            `appointment-card status-${
                              appointment.status ||
                              'confirmed'
                            }`
                          }
                          key={
                            appointment.id
                          }
                        >

                          <div className="appointment-time">

                            <strong>
                              {formatTime(
                                appointment
                                  .appointment_time,
                              )}
                            </strong>


                            {appointment.duration ? (
                              <span>
                                {
                                  appointment.duration
                                }{' '}
                                min
                              </span>
                            ) : null}

                          </div>


                          <div className="appointment-main">

                            <div className="appointment-name-row">

                              <h3>

                                {appointment.name ||
                                  'Cliente sem nome'}

                              </h3>


                              <span
                                className={
                                  `appointment-status ${
                                    appointment.status ||
                                    'confirmed'
                                  }`
                                }
                              >

                                {STATUS_LABELS[
                                  appointment.status
                                ] ||
                                  appointment.status ||
                                  'Confirmada'}

                              </span>

                            </div>


                            <p className="appointment-service">

                              {appointment.service ||
                                'Serviço'}

                              {appointment.price !==
                                null &&
                              appointment.price !==
                                undefined
                                ? ` · ${formatPrice(
                                    appointment.price,
                                  )}`
                                : ''}

                            </p>


                            <div className="appointment-contacts">

                              {appointment.phone ? (

                                <a
                                  href={
                                    `tel:${appointment.phone}`
                                  }
                                >
                                  {
                                    appointment.phone
                                  }
                                </a>

                              ) : null}


                              {appointment.email ? (

                                <a
                                  href={
                                    `mailto:${appointment.email}`
                                  }
                                >
                                  {
                                    appointment.email
                                  }
                                </a>

                              ) : null}

                            </div>

                          </div>

                        </article>

                      ),
                    )}

                  </div>

                </section>

              ),
            )}

          </div>

        )}

      </main>

    </div>
  );
}