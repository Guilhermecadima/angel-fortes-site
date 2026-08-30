export const BOOKING_TIME_ZONE =
  'Europe/Lisbon';

export const MIN_BOOKING_NOTICE_HOURS = 8;

export const SLOT_INTERVAL = 10;

export const OPENING_PERIODS = [
  {
    start: '10:00',
    end: '13:00',
  },
  {
    start: '15:00',
    end: '18:00',
  },
];

export function timeToMinutes(time) {
  const [hours, minutes] = String(time)
    .split(':')
    .map(Number);

  return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes) {
  const hours = Math.floor(
    totalMinutes / 60
  );

  const minutes =
    totalMinutes % 60;

  return `${String(hours).padStart(
    2,
    '0'
  )}:${String(minutes).padStart(
    2,
    '0'
  )}`;
}

export function generateBookingSlots(
  duration
) {
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
          minutesToTime(current)
        );
      }
    }
  );

  return slots;
}

export function isSunday(dateString) {
  if (!dateString) {
    return false;
  }

  const [year, month, day] =
    dateString
      .split('-')
      .map(Number);

  return (
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    ).getUTCDay() === 0
  );
}

export function getTodayInBookingTimeZone(
  now = new Date()
) {
  const formatter =
    new Intl.DateTimeFormat(
      'en-GB',
      {
        timeZone:
          BOOKING_TIME_ZONE,

        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }
    );

  const parts =
    formatter.formatToParts(now);

  const year =
    parts.find(
      (part) => part.type === 'year'
    )?.value;

  const month =
    parts.find(
      (part) => part.type === 'month'
    )?.value;

  const day =
    parts.find(
      (part) => part.type === 'day'
    )?.value;

  return `${year}-${month}-${day}`;
}

function getTimeZoneOffsetMs(
  date,
  timeZone
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
      }
    );

  const parts =
    formatter.formatToParts(date);

  const value = (type) =>
    Number(
      parts.find(
        (part) => part.type === type
      )?.value
    );

  const asUTC = Date.UTC(
    value('year'),
    value('month') - 1,
    value('day'),
    value('hour'),
    value('minute'),
    value('second')
  );

  return asUTC - date.getTime();
}

export function bookingDateTimeToUtc(
  dateString,
  timeString
) {
  const [year, month, day] =
    dateString
      .split('-')
      .map(Number);

  const [hours, minutes] =
    timeString
      .split(':')
      .map(Number);

  const wallClock =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
        hours,
        minutes,
        0
      )
    );

  let offset =
    getTimeZoneOffsetMs(
      wallClock,
      BOOKING_TIME_ZONE
    );

  let result =
    new Date(
      wallClock.getTime() - offset
    );

  const correctedOffset =
    getTimeZoneOffsetMs(
      result,
      BOOKING_TIME_ZONE
    );

  if (
    correctedOffset !== offset
  ) {
    result =
      new Date(
        wallClock.getTime() -
          correctedOffset
      );
  }

  return result;
}

export function hasMinimumNotice(
  dateString,
  timeString,
  now = new Date()
) {
  const bookingDate =
    bookingDateTimeToUtc(
      dateString,
      timeString
    );

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

export function isValidBookingSlot(
  time,
  duration
) {
  const start =
    timeToMinutes(time);

  const end =
    start + duration;

  return OPENING_PERIODS.some(
    (period) => {
      const periodStart =
        timeToMinutes(
          period.start
        );

      const periodEnd =
        timeToMinutes(
          period.end
        );

      return (
        start >= periodStart &&
        end <= periodEnd &&
        (start - periodStart) %
          SLOT_INTERVAL ===
          0
      );
    }
  );
}

export function rangesOverlap(
  startA,
  durationA,
  startB,
  durationB
) {
  const endA =
    startA + durationA;

  const endB =
    startB + durationB;

  return (
    startA < endB &&
    endA > startB
  );
}