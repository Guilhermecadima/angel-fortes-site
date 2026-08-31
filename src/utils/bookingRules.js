export const BOOKING_TIME_ZONE =
  'Europe/Lisbon';


export const MIN_BOOKING_NOTICE_HOURS =
  8;


export const SLOT_INTERVAL =
  10;


/*
 * Horário permitido para
 * marcações online.
 */
export const OPENING_PERIODS = [

  {
    start:
      '10:00',

    end:
      '13:00',
  },

  {
    start:
      '15:00',

    end:
      '18:00',
  },

];


/* =========================================================
   TIME → MINUTES

   Aceita:
   10:20
   10:20:00
========================================================= */

export function timeToMinutes(
  time,
) {

  const match =
    /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/
      .exec(
        String(
          time || '',
        ),
      );


  if (!match) {
    return NaN;
  }


  const hours =
    Number(
      match[1],
    );


  const minutes =
    Number(
      match[2],
    );


  if (
    !Number.isInteger(
      hours,
    ) ||
    !Number.isInteger(
      minutes,
    ) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {

    return NaN;

  }


  return (
    hours * 60 +
    minutes
  );

}


/* =========================================================
   MINUTES → HH:MM
========================================================= */

export function minutesToTime(
  totalMinutes,
) {

  if (
    !Number.isFinite(
      totalMinutes,
    )
  ) {

    return '';

  }


  const hours =
    Math.floor(
      totalMinutes /
        60,
    );


  const minutes =
    totalMinutes %
    60;


  return (
    `${String(hours).padStart(
      2,
      '0',
    )}:` +
    `${String(minutes).padStart(
      2,
      '0',
    )}`
  );

}


/* =========================================================
   GERAR SLOTS
========================================================= */

export function generateBookingSlots(
  duration,
) {

  const numericDuration =
    Number(
      duration,
    );


  if (
    !Number.isFinite(
      numericDuration,
    ) ||
    numericDuration <= 0
  ) {

    return [];

  }


  const slots =
    [];


  OPENING_PERIODS.forEach(
    ({
      start,
      end,
    }) => {

      const startMinutes =
        timeToMinutes(
          start,
        );


      const endMinutes =
        timeToMinutes(
          end,
        );


      if (
        !Number.isFinite(
          startMinutes,
        ) ||
        !Number.isFinite(
          endMinutes,
        )
      ) {

        return;

      }


      for (
        let current =
          startMinutes;

        current +
          numericDuration <=
        endMinutes;

        current +=
          SLOT_INTERVAL
      ) {

        slots.push(
          minutesToTime(
            current,
          ),
        );

      }

    },
  );


  return slots;

}


/* =========================================================
   DOMINGO
========================================================= */

export function isSunday(
  dateString,
) {

  if (!dateString) {
    return false;
  }


  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/
      .exec(
        dateString,
      );


  if (!match) {
    return false;
  }


  const year =
    Number(
      match[1],
    );


  const month =
    Number(
      match[2],
    );


  const day =
    Number(
      match[3],
    );


  return (
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
      ),
    ).getUTCDay() ===
    0
  );

}


/* =========================================================
   DATA ATUAL EM PORTUGAL
========================================================= */

export function getTodayInBookingTimeZone(
  now =
    new Date(),
) {

  const formatter =
    new Intl.DateTimeFormat(
      'en-GB',
      {

        timeZone:
          BOOKING_TIME_ZONE,

        year:
          'numeric',

        month:
          '2-digit',

        day:
          '2-digit',

      },
    );


  const parts =
    formatter
      .formatToParts(
        now,
      );


  const year =
    parts.find(
      (part) =>
        part.type ===
        'year',
    )?.value;


  const month =
    parts.find(
      (part) =>
        part.type ===
        'month',
    )?.value;


  const day =
    parts.find(
      (part) =>
        part.type ===
        'day',
    )?.value;


  return (
    `${year}-${month}-${day}`
  );

}


/* =========================================================
   TIMEZONE OFFSET
========================================================= */

function getTimeZoneOffsetMs(
  date,
  timeZone,
) {

  const formatter =
    new Intl.DateTimeFormat(
      'en-GB',
      {

        timeZone,

        hourCycle:
          'h23',

        year:
          'numeric',

        month:
          '2-digit',

        day:
          '2-digit',

        hour:
          '2-digit',

        minute:
          '2-digit',

        second:
          '2-digit',

      },
    );


  const parts =
    formatter
      .formatToParts(
        date,
      );


  const value =
    (type) =>
      Number(
        parts.find(
          (part) =>
            part.type ===
            type,
        )?.value,
      );


  const asUTC =
    Date.UTC(

      value('year'),

      value('month') -
        1,

      value('day'),

      value('hour'),

      value('minute'),

      value('second'),

    );


  return (
    asUTC -
    date.getTime()
  );

}


/* =========================================================
   DATA/HORA LISBOA → UTC
========================================================= */

export function bookingDateTimeToUtc(
  dateString,
  timeString,
) {

  const dateMatch =
    /^(\d{4})-(\d{2})-(\d{2})$/
      .exec(
        String(
          dateString || '',
        ),
      );


  const timeMatch =
    /^(\d{1,2}):(\d{2})/
      .exec(
        String(
          timeString || '',
        ),
      );


  if (
    !dateMatch ||
    !timeMatch
  ) {

    return new Date(
      NaN,
    );

  }


  const year =
    Number(
      dateMatch[1],
    );


  const month =
    Number(
      dateMatch[2],
    );


  const day =
    Number(
      dateMatch[3],
    );


  const hours =
    Number(
      timeMatch[1],
    );


  const minutes =
    Number(
      timeMatch[2],
    );


  const wallClock =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
        hours,
        minutes,
        0,
      ),
    );


  let offset =
    getTimeZoneOffsetMs(
      wallClock,
      BOOKING_TIME_ZONE,
    );


  let result =
    new Date(
      wallClock.getTime() -
        offset,
    );


  const correctedOffset =
    getTimeZoneOffsetMs(
      result,
      BOOKING_TIME_ZONE,
    );


  if (
    correctedOffset !==
    offset
  ) {

    result =
      new Date(
        wallClock.getTime() -
          correctedOffset,
      );

  }


  return result;

}


/* =========================================================
   ANTECEDÊNCIA MÍNIMA
========================================================= */

export function hasMinimumNotice(
  dateString,
  timeString,
  now =
    new Date(),
) {

  const bookingDate =
    bookingDateTimeToUtc(
      dateString,
      timeString,
    );


  if (
    Number.isNaN(
      bookingDate
        .getTime(),
    )
  ) {

    return false;

  }


  const minimumMs =
    MIN_BOOKING_NOTICE_HOURS *
    60 *
    60 *
    1000;


  return (
    bookingDate.getTime() -
      now.getTime() >=
    minimumMs
  );

}


/* =========================================================
   VALIDAR SLOT
========================================================= */

export function isValidBookingSlot(
  time,
  duration,
) {

  const start =
    timeToMinutes(
      time,
    );


  const numericDuration =
    Number(
      duration,
    );


  if (
    !Number.isFinite(
      start,
    ) ||
    !Number.isFinite(
      numericDuration,
    ) ||
    numericDuration <= 0
  ) {

    return false;

  }


  const end =
    start +
    numericDuration;


  return OPENING_PERIODS.some(
    (period) => {

      const periodStart =
        timeToMinutes(
          period.start,
        );


      const periodEnd =
        timeToMinutes(
          period.end,
        );


      return (
        start >=
          periodStart &&

        end <=
          periodEnd &&

        (
          start -
          periodStart
        ) %
          SLOT_INTERVAL ===
          0
      );

    },
  );

}


/* =========================================================
   OVERLAP
========================================================= */

export function rangesOverlap(
  startA,
  durationA,
  startB,
  durationB,
) {

  const numericStartA =
    Number(
      startA,
    );


  const numericStartB =
    Number(
      startB,
    );


  const endA =
    numericStartA +
    Number(
      durationA,
    );


  const endB =
    numericStartB +
    Number(
      durationB,
    );


  return (
    numericStartA <
      endB &&
    endA >
      numericStartB
  );

}


/* =========================================================
   DISTÂNCIA ATÉ À MARCAÇÃO MAIS PRÓXIMA

   Isto serve para aproveitar gaps.

   Exemplo:

   marcação existente termina 10:30

   cliente quer 11:00

   10:30 fica encostado à marcação anterior,
   portanto tem um bom "gap score".
========================================================= */

function getAppointmentAdjacencyDistance(
  slotStart,
  slotDuration,
  appointments,
) {

  const slotEnd =
    slotStart +
    Number(
      slotDuration,
    );


  const distances =
    [];


  (
    appointments || []
  ).forEach(
    (appointment) => {

      const appointmentStart =
        timeToMinutes(
          appointment
            .appointment_time,
        );


      const appointmentDuration =
        Number(
          appointment
            .duration,
        );


      if (
        !Number.isFinite(
          appointmentStart,
        ) ||
        !Number.isFinite(
          appointmentDuration,
        )
      ) {

        return;

      }


      const appointmentEnd =
        appointmentStart +
        appointmentDuration;


      /*
       * Marca anterior.
       */

      if (
        appointmentEnd <=
        slotStart
      ) {

        distances.push(
          slotStart -
            appointmentEnd,
        );

      }


      /*
       * Marca seguinte.
       */

      if (
        appointmentStart >=
        slotEnd
      ) {

        distances.push(
          appointmentStart -
            slotEnd,
        );

      }

    },
  );


  /*
   * Se não houver marcações,
   * não tentamos empurrar a pessoa
   * artificialmente para a abertura.
   */
  if (
    distances.length ===
    0
  ) {

    return 120;

  }


  return Math.min(
    ...distances,
  );

}


/* =========================================================
   HORÁRIOS SUGERIDOS

   Regras:

   1. Só recebe slots já confirmados como livres.
   2. Dá prioridade à proximidade da hora pretendida.
   3. Também favorece slots encostados a marcações existentes.
   4. Se a hora pedida estiver livre, tentamos sempre mostrá-la.
   5. Nunca devolve mais do que "limit".
========================================================= */

export function getSuggestedBookingSlots({
  availableTimes,
  preferredTime,
  duration,
  appointments = [],
  limit = 4,
}) {

  const preferredMinutes =
    timeToMinutes(
      preferredTime,
    );


  if (
    !Number.isFinite(
      preferredMinutes,
    ) ||
    !Array.isArray(
      availableTimes,
    ) ||
    availableTimes.length ===
      0
  ) {

    return [];

  }


  const candidates =
    availableTimes
      .map(
        (slot) => {

          const start =
            timeToMinutes(
              slot,
            );


          if (
            !Number.isFinite(
              start,
            )
          ) {

            return null;

          }


          const distanceMinutes =
            Math.abs(
              start -
                preferredMinutes,
            );


          const adjacencyDistance =
            getAppointmentAdjacencyDistance(

              start,

              duration,

              appointments,

            );


          /*
           * Quanto menor, melhor.
           *
           * O gap pesa mais do que
           * alguns minutos de diferença,
           * mas não domina completamente
           * a vontade do cliente.
           */
          const scheduleScore =
            distanceMinutes +
            (
              Math.min(
                adjacencyDistance,
                120,
              ) *
              2
            );


          return {

            time:
              slot,

            start,

            distanceMinutes,

            adjacencyDistance,

            scheduleScore,

            requested:
              start ===
              preferredMinutes,

          };

        },
      )
      .filter(Boolean);


  if (
    candidates.length ===
    0
  ) {

    return [];

  }


  /*
   * Só procuramos um horário
   * "melhor para a agenda" dentro
   * de 60 minutos da preferência.
   *
   * Não vamos sugerir 15:00 a alguém
   * que pediu 11:00 só porque encaixa.
   */
  let recommendationPool =
    candidates.filter(
      (candidate) =>
        candidate
          .distanceMinutes <=
        60,
    );


  if (
    recommendationPool.length ===
    0
  ) {

    recommendationPool =
      [...candidates]
        .sort(
          (a, b) =>
            a.distanceMinutes -
            b.distanceMinutes,
        )
        .slice(
          0,
          Math.min(
            4,
            candidates.length,
          ),
        );

  }


  const requestedCandidate =
    candidates.find(
      (candidate) =>
        candidate.requested,
    );


  let recommendedCandidate =
    [...recommendationPool]
      .sort(
        (a, b) => {

          if (
            a.scheduleScore !==
            b.scheduleScore
          ) {

            return (
              a.scheduleScore -
              b.scheduleScore
            );

          }


          return (
            a.distanceMinutes -
            b.distanceMinutes
          );

        },
      )[0];


  /*
   * Se a hora do cliente estiver livre,
   * só recomendamos outra hora quando
   * existe uma melhoria real no encaixe
   * da agenda.
   */

  if (
    requestedCandidate &&
    recommendedCandidate &&
    recommendedCandidate.time !==
      requestedCandidate.time
  ) {

    const improvement =
      requestedCandidate
        .scheduleScore -
      recommendedCandidate
        .scheduleScore;


    if (
      improvement <
        15 ||
      recommendedCandidate
        .distanceMinutes >
        60
    ) {

      recommendedCandidate =
        requestedCandidate;

    }

  }


  const selected =
    [];


  const addCandidate =
    (candidate) => {

      if (!candidate) {
        return;
      }


      if (
        selected.some(
          (item) =>
            item.time ===
            candidate.time,
        )
      ) {

        return;

      }


      selected.push(
        candidate,
      );

    };


  /*
   * 1. Melhor encaixe.
   */
  addCandidate(
    recommendedCandidate,
  );


  /*
   * 2. Hora pedida, se estiver livre.
   */
  addCandidate(
    requestedCandidate,
  );


  /*
   * 3. Restantes opções:
   * as mais próximas da preferência.
   */

  const remaining =
    candidates
      .filter(
        (candidate) =>
          !selected.some(
            (item) =>
              item.time ===
              candidate.time,
          ),
      )
      .sort(
        (a, b) => {

          if (
            a.distanceMinutes !==
            b.distanceMinutes
          ) {

            return (
              a.distanceMinutes -
              b.distanceMinutes
            );

          }


          return (
            a.scheduleScore -
            b.scheduleScore
          );

        },
      );


  remaining.forEach(
    (candidate) => {

      if (
        selected.length >=
        limit
      ) {
        return;
      }


      addCandidate(
        candidate,
      );

    },
  );


  return selected
    .slice(
      0,
      limit,
    )
    .map(
      (candidate) => ({

        time:
          candidate.time,

        requested:
          candidate.requested,

        recommended:
          candidate.time ===
          recommendedCandidate
            ?.time,

      }),
    );

}