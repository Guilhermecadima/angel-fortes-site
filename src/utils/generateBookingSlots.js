function timeToMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);

  return hours * 60 + minutes;
}

function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function generatePeriod(start, end, duration) {
  const slots = [];

  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);

  for (
    let time = startMinutes;
    time + duration <= endMinutes;
    time += duration
  ) {
    slots.push(minutesToTime(time));
  }

  return slots;
}

export function generateBookingSlots(duration) {
  const morning = generatePeriod(
    '10:00',
    '13:00',
    duration
  );

  const afternoon = generatePeriod(
    '15:00',
    '16:40',
    duration
  );

  return [
    ...morning,
    ...afternoon,
  ];
}