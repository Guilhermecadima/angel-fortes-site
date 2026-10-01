export const BOOKING_TIME_ZONE = 'Europe/Lisbon';

export const MIN_BOOKING_NOTICE_HOURS = 8;

export const SLOT_INTERVAL = 10;


/* =========================================================
   TIME -> MINUTES
========================================================= */

export function timeToMinutes(time) {
  const match =
    /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(
      String(time || ''),
    );

  if (!match) {
    return NaN;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return NaN;
  }

  return hours * 60 + minutes;
}


/* =========================================================
   MINUTES -> HH:MM
========================================================= */

export function minutesToTime(totalMinutes) {
  if (!Number.isFinite(totalMinutes)) {
    return '';
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return (
    `${String(hours).padStart(2, '0')}:` +
    `${String(minutes).padStart(2, '0')}`
  );
}


/* =========================================================
   VALIDAR DATA
========================================================= */

export function isValidBookingDate(dateString) {
  const value = String(dateString || '');

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return parsed.toISOString().slice(0, 10) === value;
}


/* =========================================================
   DIA DA SEMANA

   0 = Domingo
   1 = Segunda
   2 = Terça
   3 = Quarta
   4 = Quinta
   5 = Sexta
   6 = Sábado
========================================================= */

export function getDayOfWeek(dateString) {
  if (!isValidBookingDate(dateString)) {
    return null;
  }

  const [year, month, day] =
    dateString.split('-').map(Number);

  return new Date(
    Date.UTC(year, month - 1, day),
  ).getUTCDay();
}


/* =========================================================
   DOMINGO
========================================================= */

export function isSunday(dateString) {
  return getDayOfWeek(dateString) === 0;
}


/* =========================================================
   QUARTA
========================================================= */

export function isWednesday(dateString) {
  return getDayOfWeek(dateString) === 3;
}


/* =========================================================
   HORÁRIOS

   SEGUNDA
   Santa Marta: 09:00 - 14:00
   Costa:       14:00 - 19:00

   TERÇA
   Santa Marta: 09:00 - 14:00
   Costa:       14:00 - 19:00

   QUARTA
   Santa Marta: FECHADO
   Costa:       09:00 - 19:00

   QUINTA
   Santa Marta: 09:00 - 14:00
   Costa:       14:00 - 19:00

   SEXTA
   Santa Marta: 09:00 - 19:00
   Costa:       FECHADO

   SÁBADO
   Santa Marta: 08:00 - 14:00
   Costa:       14:00 - 19:00

   DOMINGO
   FECHADO
========================================================= */

export function getOpeningPeriodsForDate(
  dateString,
  location = '',
) {
  const dayOfWeek = getDayOfWeek(dateString);

  if (dayOfWeek === null) {
    return [];
  }

  // Domingo
  if (dayOfWeek === 0) {
    return [];
  }


  /* =======================================================
     SANTA MARTA DO PINHAL
  ======================================================= */

  if (location === 'santa_marta') {

    // Segunda
    if (dayOfWeek === 1) {
      return [
        {
          start: '09:00',
          end: '14:00',
        },
      ];
    }

    // Terça
    if (dayOfWeek === 2) {
      return [
        {
          start: '09:00',
          end: '14:00',
        },
      ];
    }

    // Quarta fechado
    if (dayOfWeek === 3) {
      return [];
    }

    // Quinta
    if (dayOfWeek === 4) {
      return [
        {
          start: '09:00',
          end: '14:00',
        },
      ];
    }

    // Sexta - dia inteiro
    if (dayOfWeek === 5) {
      return [
        {
          start: '09:00',
          end: '19:00',
        },
      ];
    }

    // Sábado
    if (dayOfWeek === 6) {
      return [
        {
          start: '08:00',
          end: '14:00',
        },
      ];
    }

    return [];
  }


  /* =======================================================
     COSTA DA CAPARICA
  ======================================================= */

  if (location === 'costa_caparica') {

    // Segunda
    if (dayOfWeek === 1) {
      return [
        {
          start: '14:00',
          end: '19:00',
        },
      ];
    }

    // Terça
    if (dayOfWeek === 2) {
      return [
        {
          start: '14:00',
          end: '19:00',
        },
      ];
    }

    // Quarta - dia inteiro
    if (dayOfWeek === 3) {
      return [
        {
          start: '09:00',
          end: '19:00',
        },
      ];
    }

    // Quinta
    if (dayOfWeek === 4) {
      return [
        {
          start: '14:00',
          end: '19:00',
        },
      ];
    }

    // Sexta fechado
    if (dayOfWeek === 5) {
      return [];
    }

    // Sábado
    if (dayOfWeek === 6) {
      return [
        {
          start: '14:00',
          end: '19:00',
        },
      ];
    }

    return [];
  }

  return [];
}


/* =========================================================
   GERAR SLOTS
========================================================= */

export function generateBookingSlots(
  duration,
  dateString = '',
  location = '',
) {
  const numericDuration = Number(duration);

  if (
    !Number.isFinite(numericDuration) ||
    numericDuration <= 0
  ) {
    return [];
  }

  const slots = [];

  const openingPeriods =
    getOpeningPeriodsForDate(
      dateString,
      location,
    );

  openingPeriods.forEach(({ start, end }) => {
    const startMinutes = timeToMinutes(start);
    const endMinutes = timeToMinutes(end);

    if (
      !Number.isFinite(startMinutes) ||
      !Number.isFinite(endMinutes)
    ) {
      return;
    }

    for (
      let current = startMinutes;
      current + numericDuration <= endMinutes;
      current += SLOT_INTERVAL
    ) {
      slots.push(minutesToTime(current));
    }
  });

  return slots;
}


/* =========================================================
   DATA ATUAL EM PORTUGAL
========================================================= */

export function getTodayInBookingTimeZone(
  now = new Date(),
) {
  const formatter =
    new Intl.DateTimeFormat(
      'en-GB',
      {
        timeZone: BOOKING_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      },
    );

  const parts = formatter.formatToParts(now);

  const year =
    parts.find(
      (part) => part.type === 'year',
    )?.value;

  const month =
    parts.find(
      (part) => part.type === 'month',
    )?.value;

  const day =
    parts.find(
      (part) => part.type === 'day',
    )?.value;

  return `${year}-${month}-${day}`;
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
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      },
    );

  const parts = formatter.formatToParts(date);

  const value = (type) =>
    Number(
      parts.find(
        (part) => part.type === type,
      )?.value,
    );

  const asUTC =
    Date.UTC(
      value('year'),
      value('month') - 1,
      value('day'),
      value('hour'),
      value('minute'),
      value('second'),
    );

  return asUTC - date.getTime();
}


/* =========================================================
   DATA/HORA PORTUGAL -> UTC
========================================================= */

export function bookingDateTimeToUtc(
  dateString,
  timeString,
) {
  if (!isValidBookingDate(dateString)) {
    return new Date(NaN);
  }

  const dateMatch =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      String(dateString || ''),
    );

  const timeMatch =
    /^(\d{1,2}):(\d{2})/.exec(
      String(timeString || ''),
    );

  if (!dateMatch || !timeMatch) {
    return new Date(NaN);
  }

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);

  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return new Date(NaN);
  }

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
      wallClock.getTime() - offset,
    );

  const correctedOffset =
    getTimeZoneOffsetMs(
      result,
      BOOKING_TIME_ZONE,
    );

  if (correctedOffset !== offset) {
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
  now = new Date(),
) {
  const bookingDate =
    bookingDateTimeToUtc(
      dateString,
      timeString,
    );

  if (
    Number.isNaN(
      bookingDate.getTime(),
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
  dateString = '',
  location = '',
) {
  const start = timeToMinutes(time);
  const numericDuration = Number(duration);

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(numericDuration) ||
    numericDuration <= 0
  ) {
    return false;
  }

  const end =
    start + numericDuration;

  const openingPeriods =
    getOpeningPeriodsForDate(
      dateString,
      location,
    );

  return openingPeriods.some(
    (period) => {
      const periodStart =
        timeToMinutes(period.start);

      const periodEnd =
        timeToMinutes(period.end);

      return (
        start >= periodStart &&
        end <= periodEnd &&
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
  const numericStartA = Number(startA);
  const numericStartB = Number(startB);

  const endA =
    numericStartA +
    Number(durationA);

  const endB =
    numericStartB +
    Number(durationB);

  return (
    numericStartA < endB &&
    endA > numericStartB
  );
}


/* =========================================================
   DISTÂNCIA DA MARCAÇÃO MAIS PRÓXIMA
========================================================= */

function getAppointmentAdjacencyDistance(
  slotStart,
  slotDuration,
  appointments,
) {
  const slotEnd =
    slotStart +
    Number(slotDuration);

  const distances = [];

  (appointments || []).forEach(
    (appointment) => {
      const appointmentStart =
        timeToMinutes(
          appointment.appointment_time,
        );

      const appointmentDuration =
        Number(
          appointment.duration,
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

      if (
        appointmentEnd <= slotStart
      ) {
        distances.push(
          slotStart - appointmentEnd,
        );
      }

      if (
        appointmentStart >= slotEnd
      ) {
        distances.push(
          appointmentStart - slotEnd,
        );
      }
    },
  );

  if (distances.length === 0) {
    return 120;
  }

  return Math.min(...distances);
}


/* =========================================================
   HORÁRIOS SUGERIDOS
========================================================= */

export function getSuggestedBookingSlots({
  availableTimes,
  preferredTime,
  duration,
  appointments = [],
  limit = 4,
}) {
  const preferredMinutes =
    timeToMinutes(preferredTime);

  if (
    !Number.isFinite(preferredMinutes) ||
    !Array.isArray(availableTimes) ||
    availableTimes.length === 0
  ) {
    return [];
  }

  const candidates =
    availableTimes
      .map((slot) => {
        const start =
          timeToMinutes(slot);

        if (
          !Number.isFinite(start)
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

        const scheduleScore =
          distanceMinutes +
          Math.min(
            adjacencyDistance,
            120,
          ) *
            2;

        return {
          time: slot,
          start,
          distanceMinutes,
          adjacencyDistance,
          scheduleScore,

          requested:
            start ===
            preferredMinutes,
        };
      })
      .filter(Boolean);

  if (candidates.length === 0) {
    return [];
  }

  let recommendationPool =
    candidates.filter(
      (candidate) =>
        candidate.distanceMinutes <= 60,
    );

  if (
    recommendationPool.length === 0
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

  if (
    requestedCandidate &&
    recommendedCandidate &&
    recommendedCandidate.time !==
      requestedCandidate.time
  ) {
    const improvement =
      requestedCandidate.scheduleScore -
      recommendedCandidate.scheduleScore;

    if (
      improvement < 15 ||
      recommendedCandidate
        .distanceMinutes > 60
    ) {
      recommendedCandidate =
        requestedCandidate;
    }
  }

  const selected = [];

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

      selected.push(candidate);
    };

  addCandidate(
    recommendedCandidate,
  );

  addCandidate(
    requestedCandidate,
  );

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
        selected.length < limit
      ) {
        addCandidate(candidate);
      }
    },
  );

  return selected
    .slice(0, limit)
    .map(
      (candidate) => ({
        time: candidate.time,

        requested:
          candidate.requested,

        recommended:
          candidate.time ===
          recommendedCandidate?.time,
      }),
    );
}