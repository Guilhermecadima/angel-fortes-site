import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  isSupabaseConfigured,
} from '../lib/supabase';

import {
  getAdminSession,
  signInAdmin,
  signOutAdmin,
  subscribeToAuth,
} from '../services/auth';

import {
  services,
} from '../data/services';

import '../styles/appointments-admin.css';


const HOUR_START = 9;
const HOUR_END = 19;

const DESKTOP_HOUR_HEIGHT = 72;


/* =========================================================
   RESPONSIVE CALENDAR SIZE
========================================================= */

function getHourHeight() {
  if (
    typeof window ===
    'undefined'
  ) {
    return DESKTOP_HOUR_HEIGHT;
  }

  if (
    window.innerWidth >
    760
  ) {
    return DESKTOP_HOUR_HEIGHT;
  }

  /*
   * No telemóvel calculamos a altura
   * das horas com base no espaço real
   * disponível no ecrã.
   *
   * Assim tentamos mostrar a grelha
   * inteira sem scroll vertical enorme.
   */

  const reservedSpace = 235;

  const available =
    window.innerHeight -
    reservedSpace;

  const hours =
    HOUR_END -
    HOUR_START;

  const calculated =
    available /
    hours;

  return Math.max(
    34,
    Math.min(
      48,
      calculated,
    ),
  );
}


/* =========================================================
   DATE HELPERS
========================================================= */

function cloneDate(date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    12,
    0,
    0,
    0,
  );
}


function addDays(
  date,
  amount,
) {
  const next =
    cloneDate(date);

  next.setDate(
    next.getDate() +
      amount,
  );

  return next;
}


function addMonths(
  date,
  amount,
) {
  const next =
    cloneDate(date);

  next.setDate(1);

  next.setMonth(
    next.getMonth() +
      amount,
  );

  return next;
}


function startOfWeek(date) {
  const result =
    cloneDate(date);

  const weekday =
    result.getDay();

  const distance =
    weekday === 0
      ? -6
      : 1 - weekday;

  result.setDate(
    result.getDate() +
      distance,
  );

  return result;
}


function dateKey(date) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(
      2,
      '0',
    );

  const day =
    String(
      date.getDate(),
    ).padStart(
      2,
      '0',
    );

  return (
    `${year}-${month}-${day}`
  );
}


function timeToMinutes(value) {
  const [
    hours,
    minutes,
  ] =
    String(
      value || '00:00',
    )
      .slice(0, 5)
      .split(':')
      .map(Number);

  return (
    (hours || 0) *
      60 +
    (minutes || 0)
  );
}


function shortTime(value) {
  return String(
    value || '',
  ).slice(
    0,
    5,
  );
}


function capitalize(value) {
  if (!value) {
    return '';
  }

  return (
    value
      .charAt(0)
      .toUpperCase() +
    value.slice(1)
  );
}


/* =========================================================
   LABELS
========================================================= */

function dayName(date) {
  return new Intl
    .DateTimeFormat(
      'pt-PT',
      {
        weekday:
          'short',
      },
    )
    .format(date)
    .replace(
      '.',
      '',
    );
}


function dayNumber(date) {
  return new Intl
    .DateTimeFormat(
      'pt-PT',
      {
        day:
          '2-digit',

        month:
          '2-digit',
      },
    )
    .format(date);
}


function monthLabel(date) {
  return capitalize(
    new Intl
      .DateTimeFormat(
        'pt-PT',
        {
          month:
            'long',

          year:
            'numeric',
        },
      )
      .format(date),
  );
}


function dayLabel(date) {
  return capitalize(
    new Intl
      .DateTimeFormat(
        'pt-PT',
        {
          weekday:
            'long',

          day:
            '2-digit',

          month:
            'long',

          year:
            'numeric',
        },
      )
      .format(date),
  );
}


function weekLabel(date) {
  const start =
    startOfWeek(date);

  const end =
    addDays(
      start,
      6,
    );

  const startText =
    new Intl
      .DateTimeFormat(
        'pt-PT',
        {
          day:
            '2-digit',

          month:
            'short',
        },
      )
      .format(start);

  const endText =
    new Intl
      .DateTimeFormat(
        'pt-PT',
        {
          day:
            '2-digit',

          month:
            'short',

          year:
            'numeric',
        },
      )
      .format(end);

  return (
    `${startText} – ${endText}`
  );
}


/* =========================================================
   LOGIN
========================================================= */

function Login({
  email,
  setEmail,
  password,
  setPassword,
  loading,
  error,
  onSubmit,
}) {
  return (
    <main className="appointments-login-page">

      <form
        className="appointments-login-card"
        onSubmit={
          onSubmit
        }
      >

        <div className="appointments-login-brand">
          ANGEL FORTES
        </div>

        <h1>
          Marcações
        </h1>

        <p>
          Área privada da barbearia.
        </p>


        <label>
          Email

          <input
            type="email"
            value={email}
            onChange={
              (event) =>
                setEmail(
                  event.target
                    .value,
                )
            }
            autoComplete="email"
            required
          />
        </label>


        <label>
          Palavra-passe

          <input
            type="password"
            value={password}
            onChange={
              (event) =>
                setPassword(
                  event.target
                    .value,
                )
            }
            autoComplete="current-password"
            required
          />
        </label>


        {error && (
          <div
            className="appointments-error"
            role="alert"
          >
            {error}
          </div>
        )}


        <button
          type="submit"
          disabled={
            loading
          }
        >
          {loading
            ? 'A entrar...'
            : 'Entrar'}
        </button>

      </form>

    </main>
  );
}


/* =========================================================
   APPOINTMENT EVENT
========================================================= */

function AppointmentEvent({
  appointment,
  onClick,
  hourHeight,
}) {
  const startMinutes =
    timeToMinutes(
      appointment
        .appointment_time,
    );

  const calendarStart =
    HOUR_START * 60;

  const top =
    Math.max(
      0,

      (
        (
          startMinutes -
          calendarStart
        ) /
        60
      ) *
        hourHeight,
    );

  const duration =
    Number(
      appointment.duration,
    ) || 20;

  const height =
    Math.max(
      18,

      (
        duration /
        60
      ) *
        hourHeight,
    );


  return (
    <button
      type="button"
      className="calendar-appointment"
      style={{
        top:
          `${top}px`,

        height:
          `${height}px`,
      }}
      onClick={() =>
        onClick(
          appointment,
        )
      }
      title={
        `${appointment.name} — ${appointment.service}`
      }
    >
      <strong>
        {shortTime(
          appointment
            .appointment_time,
        )}
      </strong>

      <span>
        {
          appointment.name
        }
      </span>

      <small>
        {
          appointment.service
        }
      </small>

    </button>
  );
}


/* =========================================================
   WEEK
========================================================= */

function WeekView({
  cursor,
  appointmentsByDate,
  onSelect,
  hourHeight,
}) {
  const start =
    startOfWeek(
      cursor,
    );

  const days =
    Array.from(
      {
        length: 7,
      },

      (
        _,
        index,
      ) =>
        addDays(
          start,
          index,
        ),
    );

  const hours =
    Array.from(
      {
        length:
          HOUR_END -
          HOUR_START +
          1,
      },

      (
        _,
        index,
      ) =>
        HOUR_START +
        index,
    );

  const today =
    dateKey(
      new Date(),
    );

  const bodyHeight =
    (
      HOUR_END -
      HOUR_START
    ) *
    hourHeight;


  return (
    <div className="calendar-scroll">

      <div className="week-calendar">

        <div className="week-header">

          <div className="week-header-spacer" />


          {days.map(
            (day) => {
              const key =
                dateKey(
                  day,
                );

              return (
                <div
                  key={key}
                  className={`week-day-title ${
                    key ===
                    today
                      ? 'today'
                      : ''
                  }`}
                >
                  <strong>
                    {
                      dayName(
                        day,
                      )
                    }
                  </strong>

                  <span>
                    {
                      dayNumber(
                        day,
                      )
                    }
                  </span>
                </div>
              );
            },
          )}

        </div>


        <div className="week-body">

          <div
            className="week-time-axis"
            style={{
              height:
                `${bodyHeight}px`,
            }}
          >

            {hours.map(
              (hour) => (
                <div
                  key={
                    hour
                  }
                  className="week-time-label"
                  style={{
                    top:
                      (
                        hour -
                        HOUR_START
                      ) *
                      hourHeight,
                  }}
                >
                  {String(
                    hour,
                  ).padStart(
                    2,
                    '0',
                  )}
                </div>
              ),
            )}

          </div>


          {days.map(
            (day) => {
              const key =
                dateKey(
                  day,
                );

              const appointments =
                appointmentsByDate[
                  key
                ] || [];


              return (
                <div
                  key={key}
                  className={`week-day-column ${
                    key ===
                    today
                      ? 'today'
                      : ''
                  }`}
                  style={{
                    height:
                      `${bodyHeight}px`,

                    '--calendar-hour-height':
                      `${hourHeight}px`,
                  }}
                >

                  {appointments.map(
                    (
                      appointment,
                    ) => (
                      <AppointmentEvent
                        key={
                          appointment.id
                        }
                        appointment={
                          appointment
                        }
                        onClick={
                          onSelect
                        }
                        hourHeight={
                          hourHeight
                        }
                      />
                    ),
                  )}

                </div>
              );
            },
          )}

        </div>

      </div>

    </div>
  );
}


/* =========================================================
   MONTH
========================================================= */

function MonthView({
  cursor,
  appointmentsByDate,
  onSelect,
}) {
  const firstDay =
    new Date(
      cursor
        .getFullYear(),

      cursor
        .getMonth(),

      1,
      12,
    );

  const firstVisible =
    startOfWeek(
      firstDay,
    );

  const days =
    Array.from(
      {
        length: 42,
      },

      (
        _,
        index,
      ) =>
        addDays(
          firstVisible,
          index,
        ),
    );

  const today =
    dateKey(
      new Date(),
    );


  return (
    <div className="calendar-scroll">

      <div className="month-calendar">

        <div className="month-weekdays">

          {[
            'seg',
            'ter',
            'qua',
            'qui',
            'sex',
            'sáb',
            'dom',
          ].map(
            (day) => (
              <div
                key={
                  day
                }
              >
                {day}
              </div>
            ),
          )}

        </div>


        <div className="month-grid">

          {days.map(
            (day) => {
              const key =
                dateKey(
                  day,
                );

              const events =
                appointmentsByDate[
                  key
                ] || [];

              const outside =
                day
                  .getMonth() !==
                cursor
                  .getMonth();


              return (
                <div
                  key={key}
                  className={`month-day ${
                    outside
                      ? 'outside'
                      : ''
                  } ${
                    key ===
                    today
                      ? 'today'
                      : ''
                  }`}
                >

                  <div className="month-day-top">

                    <span className="month-day-number">
                      {
                        day
                          .getDate()
                      }
                    </span>

                  </div>


                  <div className="month-events">

                    {events
                      .slice(
                        0,
                        4,
                      )
                      .map(
                        (
                          appointment,
                        ) => (
                          <button
                            key={
                              appointment.id
                            }
                            type="button"
                            onClick={() =>
                              onSelect(
                                appointment,
                              )
                            }
                          >
                            <strong>
                              {shortTime(
                                appointment
                                  .appointment_time,
                              )}
                            </strong>

                            <span>
                              {
                                appointment.name
                              }
                            </span>
                          </button>
                        ),
                      )}


                    {events.length >
                      4 && (
                      <small className="month-more">
                        +
                        {
                          events.length -
                          4
                        }
                      </small>
                    )}

                  </div>

                </div>
              );
            },
          )}

        </div>

      </div>

    </div>
  );
}


/* =========================================================
   DAY
========================================================= */

function DayView({
  cursor,
  appointmentsByDate,
  onSelect,
  hourHeight,
}) {
  const key =
    dateKey(
      cursor,
    );

  const appointments =
    appointmentsByDate[
      key
    ] || [];

  const hours =
    Array.from(
      {
        length:
          HOUR_END -
          HOUR_START +
          1,
      },

      (
        _,
        index,
      ) =>
        HOUR_START +
        index,
    );

  const bodyHeight =
    (
      HOUR_END -
      HOUR_START
    ) *
    hourHeight;


  return (
    <div className="day-calendar">

      <div className="day-calendar-label">
        {
          dayLabel(
            cursor,
          )
        }
      </div>


      <div className="day-calendar-body">

        <div
          className="day-time-axis"
          style={{
            height:
              `${bodyHeight}px`,
          }}
        >

          {hours.map(
            (hour) => (
              <div
                key={
                  hour
                }
                className="day-time-label"
                style={{
                  top:
                    (
                      hour -
                      HOUR_START
                    ) *
                    hourHeight,
                }}
              >
                {String(
                  hour,
                ).padStart(
                  2,
                  '0',
                )}
              </div>
            ),
          )}

        </div>


        <div
          className="day-events-column"
          style={{
            height:
              `${bodyHeight}px`,

            '--calendar-hour-height':
              `${hourHeight}px`,
          }}
        >

          {appointments.map(
            (
              appointment,
            ) => (
              <AppointmentEvent
                key={
                  appointment.id
                }
                appointment={
                  appointment
                }
                onClick={
                  onSelect
                }
                hourHeight={
                  hourHeight
                }
              />
            ),
          )}

        </div>

      </div>

    </div>
  );
}


/* =========================================================
   MAIN PAGE
========================================================= */

export default function AppointmentsPage() {

  const [
    session,
    setSession,
  ] =
    useState(null);

  const [
    checkingSession,
    setCheckingSession,
  ] =
    useState(true);

  const [
    loginLoading,
    setLoginLoading,
  ] =
    useState(false);

  const [
    email,
    setEmail,
  ] =
    useState('');

  const [
    password,
    setPassword,
  ] =
    useState('');

  const [
    appointments,
    setAppointments,
  ] =
    useState([]);

  const [
    loadingAppointments,
    setLoadingAppointments,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState('');

  const [
    view,
    setView,
  ] =
    useState(
      'week',
    );

  const [
    cursor,
    setCursor,
  ] =
    useState(
      cloneDate(
        new Date(),
      ),
    );

  const [
    selectedAppointment,
    setSelectedAppointment,
  ] =
    useState(null);

  const [
    editForm,
    setEditForm,
  ] =
    useState(null);

  const [
    savingAppointment,
    setSavingAppointment,
  ] =
    useState(false);

  const [
    hourHeight,
    setHourHeight,
  ] =
    useState(
      getHourHeight,
    );


  /* =======================================================
     RESPONSIVE HEIGHT
  ======================================================= */

  useEffect(() => {
    function resizeCalendar() {
      setHourHeight(
        getHourHeight(),
      );
    }

    resizeCalendar();

    window.addEventListener(
      'resize',
      resizeCalendar,
    );

    window.addEventListener(
      'orientationchange',
      resizeCalendar,
    );


    return () => {
      window.removeEventListener(
        'resize',
        resizeCalendar,
      );

      window.removeEventListener(
        'orientationchange',
        resizeCalendar,
      );
    };
  }, []);


  /* =======================================================
     SESSION
  ======================================================= */

  useEffect(() => {
    let active =
      true;


    async function loadSession() {
      try {
        const currentSession =
          await getAdminSession();

        if (active) {
          setSession(
            currentSession,
          );
        }

      } catch (err) {
        console.error(
          err,
        );

        if (active) {
          setSession(
            null,
          );
        }

      } finally {
        if (active) {
          setCheckingSession(
            false,
          );
        }
      }
    }


    loadSession();


    const unsubscribe =
      subscribeToAuth(
        (
          nextSession,
        ) => {
          if (!active) {
            return;
          }

          setSession(
            nextSession,
          );
        },
      );


    return () => {
      active =
        false;

      unsubscribe();
    };

  }, []);


  /* =======================================================
     LOAD APPOINTMENTS
  ======================================================= */

  async function loadAppointments(
    currentSession =
      session,
  ) {
    if (
      !currentSession
        ?.access_token
    ) {
      return;
    }

    setLoadingAppointments(
      true,
    );

    setError('');


    try {
      const response =
        await fetch(
          '/api/admin/appointments',
          {
            headers: {
              Authorization:
                `Bearer ${currentSession.access_token}`,
            },
          },
        );

      const data =
        await response
          .json()
          .catch(
            () => null,
          );


      if (
        response.status ===
          401 ||
        response.status ===
          403
      ) {
        await signOutAdmin();

        setSession(
          null,
        );

        throw new Error(
          'A sessão expirou. Entra novamente.',
        );
      }


      if (
        !response.ok
      ) {
        throw new Error(
          data?.message ||
            'Não foi possível carregar as marcações.',
        );
      }


      const rows =
        Array.isArray(
          data
            ?.appointments,
        )
          ? data.appointments

          : Array.isArray(
              data,
            )
            ? data

            : [];


      setAppointments(
        rows,
      );

    } catch (err) {
      console.error(
        err,
      );

      setError(
        err.message ||
          'Erro ao carregar marcações.',
      );

    } finally {
      setLoadingAppointments(
        false,
      );
    }
  }


  useEffect(() => {
    if (!session) {
      setAppointments(
        [],
      );

      return;
    }

    loadAppointments(
      session,
    );

  }, [session]);


  /* =======================================================
     LOGIN
  ======================================================= */

  async function handleLogin(
    event,
  ) {
    event.preventDefault();

    setLoginLoading(
      true,
    );

    setError('');


    try {
      const nextSession =
        await signInAdmin(
          email,
          password,
        );

      setSession(
        nextSession,
      );

      setPassword('');

    } catch (err) {
      console.error(
        err,
      );

      setError(
        err.message ||
          'Não foi possível iniciar sessão.',
      );

    } finally {
      setLoginLoading(
        false,
      );
    }
  }


  /* =======================================================
     LOGOUT
  ======================================================= */

  async function handleLogout() {
    try {
      await signOutAdmin();

    } finally {
      setSession(
        null,
      );

      setAppointments(
        [],
      );
    }
  }


  /* =======================================================
     GROUP APPOINTMENTS
  ======================================================= */

  const appointmentsByDate =
    useMemo(
      () => {
        const grouped =
          {};

        appointments
          .filter(
            (
              appointment,
            ) =>
              String(
                appointment.status ||
                  '',
              )
                .toLowerCase() !==
              'cancelled',
          )
          .forEach(
            (
              appointment,
            ) => {
              const key =
                appointment
                  .appointment_date;

              if (
                !grouped[
                  key
                ]
              ) {
                grouped[
                  key
                ] = [];
              }

              grouped[
                key
              ].push(
                appointment,
              );
            },
          );


        Object
          .values(
            grouped,
          )
          .forEach(
            (
              items,
            ) => {
              items.sort(
                (
                  a,
                  b,
                ) =>
                  timeToMinutes(
                    a
                      .appointment_time,
                  ) -
                  timeToMinutes(
                    b
                      .appointment_time,
                  ),
              );
            },
          );


        return grouped;
      },

      [
        appointments,
      ],
    );


  /* =======================================================
     NAVIGATION
  ======================================================= */

  function goPrevious() {
    if (
      view ===
      'month'
    ) {
      setCursor(
        (
          current,
        ) =>
          addMonths(
            current,
            -1,
          ),
      );

      return;
    }


    if (
      view ===
      'week'
    ) {
      setCursor(
        (
          current,
        ) =>
          addDays(
            current,
            -7,
          ),
      );

      return;
    }


    setCursor(
      (
        current,
      ) =>
        addDays(
          current,
          -1,
        ),
    );
  }


  function goNext() {
    if (
      view ===
      'month'
    ) {
      setCursor(
        (
          current,
        ) =>
          addMonths(
            current,
            1,
          ),
      );

      return;
    }


    if (
      view ===
      'week'
    ) {
      setCursor(
        (
          current,
        ) =>
          addDays(
            current,
            7,
          ),
      );

      return;
    }


    setCursor(
      (
        current,
      ) =>
        addDays(
          current,
          1,
        ),
    );
  }


  const rangeLabel =
    view ===
    'month'
      ? monthLabel(
          cursor,
        )

      : view ===
        'week'
        ? weekLabel(
            cursor,
          )

        : dayLabel(
            cursor,
          );


  /* =======================================================
     OPEN APPOINTMENT
  ======================================================= */

  function openAppointment(
    appointment,
  ) {
    const service =
      services.find(
        (
          item,
        ) =>
          item.name ===
          appointment
            .service,
      );

    setError('');

    setSelectedAppointment(
      appointment,
    );

    setEditForm({
      name:
        appointment.name ||
        '',

      phone:
        appointment.phone ||
        '',

      email:
        appointment.email ||
        '',

      serviceId:
        service?.id ||
        '',

      date:
        appointment
          .appointment_date ||
        '',

      time:
        shortTime(
          appointment
            .appointment_time,
        ),
    });
  }


  function closeAppointment() {
    if (
      savingAppointment
    ) {
      return;
    }

    setSelectedAppointment(
      null,
    );

    setEditForm(
      null,
    );

    setError('');
  }


  function changeEditForm(
    field,
    value,
  ) {
    setEditForm(
      (
        current,
      ) => ({
        ...current,

        [field]:
          value,
      }),
    );
  }


  /* =======================================================
     SAVE
  ======================================================= */

  async function saveAppointmentChanges() {
    if (
      !selectedAppointment ||
      !editForm ||
      !session
        ?.access_token
    ) {
      return;
    }


    setSavingAppointment(
      true,
    );

    setError('');


    try {
      const response =
        await fetch(
          '/api/admin/appointments',
          {
            method:
              'PATCH',

            headers: {
              'Content-Type':
                'application/json',

              Authorization:
                `Bearer ${session.access_token}`,
            },

            body:
              JSON.stringify({
                id:
                  selectedAppointment.id,

                name:
                  editForm.name,

                phone:
                  editForm.phone,

                email:
                  editForm.email,

                serviceId:
                  editForm.serviceId,

                date:
                  editForm.date,

                time:
                  editForm.time,
              }),
          },
        );


      const data =
        await response
          .json()
          .catch(
            () => null,
          );


      if (
        !response.ok
      ) {
        throw new Error(
          data?.message ||
            'Não foi possível alterar a marcação.',
        );
      }


      await loadAppointments();

      setSelectedAppointment(
        null,
      );

      setEditForm(
        null,
      );

    } catch (err) {
      console.error(
        err,
      );

      setError(
        err.message ||
          'Erro ao alterar marcação.',
      );

    } finally {
      setSavingAppointment(
        false,
      );
    }
  }


  /* =======================================================
     DELETE
  ======================================================= */

  async function deleteAppointment() {
    if (
      !selectedAppointment ||
      !session
        ?.access_token
    ) {
      return;
    }


    const confirmed =
      window.confirm(
        `Eliminar a marcação de ${selectedAppointment.name}?\n\nEsta ação não pode ser anulada.`,
      );


    if (!confirmed) {
      return;
    }


    setSavingAppointment(
      true,
    );

    setError('');


    try {
      const response =
        await fetch(
          '/api/admin/appointments',
          {
            method:
              'DELETE',

            headers: {
              'Content-Type':
                'application/json',

              Authorization:
                `Bearer ${session.access_token}`,
            },

            body:
              JSON.stringify({
                id:
                  selectedAppointment.id,
              }),
          },
        );


      const data =
        await response
          .json()
          .catch(
            () => null,
          );


      if (
        !response.ok
      ) {
        throw new Error(
          data?.message ||
            'Não foi possível eliminar a marcação.',
        );
      }


      await loadAppointments();

      setSelectedAppointment(
        null,
      );

      setEditForm(
        null,
      );

    } catch (err) {
      console.error(
        err,
      );

      setError(
        err.message ||
          'Erro ao eliminar marcação.',
      );

    } finally {
      setSavingAppointment(
        false,
      );
    }
  }


  /* =======================================================
     STATES
  ======================================================= */

  if (
    !isSupabaseConfigured
  ) {
    return (
      <main className="appointments-state-page">
        <h1>
          Supabase não configurado
        </h1>
      </main>
    );
  }


  if (
    checkingSession
  ) {
    return (
      <main className="appointments-state-page">
        A carregar...
      </main>
    );
  }


  if (!session) {
    return (
      <Login
        email={
          email
        }
        setEmail={
          setEmail
        }
        password={
          password
        }
        setPassword={
          setPassword
        }
        loading={
          loginLoading
        }
        error={
          error
        }
        onSubmit={
          handleLogin
        }
      />
    );
  }


  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <main className="appointments-page">

      <header className="appointments-topbar">

        <div className="appointments-brand">

          <span>
            ANGEL FORTES
          </span>

          <h1>
            Marcações
          </h1>

        </div>


        <div className="appointments-topbar-actions">

          <button
            type="button"
            onClick={() =>
              loadAppointments()
            }
            disabled={
              loadingAppointments
            }
          >
            {loadingAppointments
              ? 'A atualizar'
              : 'Atualizar'}
          </button>


          <button
            type="button"
            onClick={
              handleLogout
            }
          >
            Sair
          </button>

        </div>

      </header>


      <section className="calendar-panel">

        <div className="calendar-toolbar">

          <h2>
            {rangeLabel}
          </h2>


          <div className="calendar-navigation">

            <button
              type="button"
              onClick={
                goPrevious
              }
              aria-label="Anterior"
            >
              ‹
            </button>


            <button
              type="button"
              className="calendar-today-button"
              onClick={() =>
                setCursor(
                  cloneDate(
                    new Date(),
                  ),
                )
              }
            >
              Hoje
            </button>


            <button
              type="button"
              onClick={
                goNext
              }
              aria-label="Seguinte"
            >
              ›
            </button>

          </div>


          <div className="calendar-view-buttons">

            <button
              type="button"
              className={
                view ===
                'month'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setView(
                  'month',
                )
              }
            >
              Mês
            </button>


            <button
              type="button"
              className={
                view ===
                'week'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setView(
                  'week',
                )
              }
            >
              Semana
            </button>


            <button
              type="button"
              className={
                view ===
                'day'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setView(
                  'day',
                )
              }
            >
              Dia
            </button>

          </div>

        </div>


        {error &&
          !selectedAppointment && (
          <div
            className="appointments-error dashboard-error"
            role="alert"
          >
            {error}
          </div>
        )}


        {view ===
          'month' && (
          <MonthView
            cursor={
              cursor
            }
            appointmentsByDate={
              appointmentsByDate
            }
            onSelect={
              openAppointment
            }
          />
        )}


        {view ===
          'week' && (
          <WeekView
            cursor={
              cursor
            }
            appointmentsByDate={
              appointmentsByDate
            }
            onSelect={
              openAppointment
            }
            hourHeight={
              hourHeight
            }
          />
        )}


        {view ===
          'day' && (
          <DayView
            cursor={
              cursor
            }
            appointmentsByDate={
              appointmentsByDate
            }
            onSelect={
              openAppointment
            }
            hourHeight={
              hourHeight
            }
          />
        )}

      </section>


      {/* =====================================================
          EDIT MODAL
      ===================================================== */}

      {selectedAppointment &&
        editForm && (
        <div
          className="appointment-details-backdrop"
          onMouseDown={
            (
              event,
            ) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                closeAppointment();
              }
            }
          }
        >

          <section className="appointment-details appointment-editor">

            <button
              type="button"
              className="appointment-details-close"
              onClick={
                closeAppointment
              }
              disabled={
                savingAppointment
              }
              aria-label="Fechar"
            >
              ×
            </button>


            <span className="appointment-details-eyebrow">
              Gerir marcação
            </span>


            <h3>
              {
                selectedAppointment.name
              }
            </h3>


            <div className="appointment-current-summary">

              <span>
                {
                  selectedAppointment
                    .appointment_date
                }
              </span>

              <strong>
                {shortTime(
                  selectedAppointment
                    .appointment_time,
                )}
              </strong>

              <span>
                {
                  selectedAppointment
                    .service
                }
              </span>

            </div>


            <div className="appointment-edit-grid">

              <label>
                Nome

                <input
                  value={
                    editForm.name
                  }
                  onChange={
                    (
                      event,
                    ) =>
                      changeEditForm(
                        'name',
                        event.target
                          .value,
                      )
                  }
                />
              </label>


              <label>
                Telemóvel

                <input
                  type="tel"
                  value={
                    editForm.phone
                  }
                  onChange={
                    (
                      event,
                    ) =>
                      changeEditForm(
                        'phone',
                        event.target
                          .value,
                      )
                  }
                />
              </label>


              <label className="appointment-edit-wide">
                Email

                <input
                  type="email"
                  value={
                    editForm.email
                  }
                  onChange={
                    (
                      event,
                    ) =>
                      changeEditForm(
                        'email',
                        event.target
                          .value,
                      )
                  }
                />
              </label>


              <label className="appointment-edit-wide">
                Serviço

                <select
                  value={
                    editForm.serviceId
                  }
                  onChange={
                    (
                      event,
                    ) =>
                      changeEditForm(
                        'serviceId',
                        event.target
                          .value,
                      )
                  }
                >

                  {!editForm
                    .serviceId && (
                    <option value="">
                      {
                        selectedAppointment
                          .service
                      }
                    </option>
                  )}


                  {services.map(
                    (
                      service,
                    ) => (
                      <option
                        key={
                          service.id
                        }
                        value={
                          service.id
                        }
                      >
                        {
                          service.name
                        }
                        {' — '}
                        {
                          service.duration
                        }
                        {' min'}
                      </option>
                    ),
                  )}

                </select>
              </label>


              <label>
                Data

                <input
                  type="date"
                  value={
                    editForm.date
                  }
                  onChange={
                    (
                      event,
                    ) =>
                      changeEditForm(
                        'date',
                        event.target
                          .value,
                      )
                  }
                />
              </label>


              <label>
                Hora

                <input
                  type="time"
                  step="600"
                  value={
                    editForm.time
                  }
                  onChange={
                    (
                      event,
                    ) =>
                      changeEditForm(
                        'time',
                        event.target
                          .value,
                      )
                  }
                />
              </label>

            </div>


            {error && (
              <div
                className="appointments-error"
                role="alert"
              >
                {error}
              </div>
            )}


            <div className="appointment-editor-actions">

              <button
                type="button"
                className="appointment-save-button"
                disabled={
                  savingAppointment
                }
                onClick={
                  saveAppointmentChanges
                }
              >
                {savingAppointment
                  ? 'A guardar...'
                  : 'Guardar alterações'}
              </button>


              <button
                type="button"
                className="appointment-delete-button"
                disabled={
                  savingAppointment
                }
                onClick={
                  deleteAppointment
                }
              >
                Eliminar
              </button>

            </div>

          </section>

        </div>
      )}

    </main>
  );
}