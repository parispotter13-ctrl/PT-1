function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function buildTimes(startTime, endTime, slotMinutes) {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);

  let current = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  const times = [];

  while (current + slotMinutes <= end) {
    const hours = String(Math.floor(current / 60)).padStart(2, "0");
    const minutes = String(current % 60).padStart(2, "0");

    times.push(`${hours}:${minutes}`);
    current += slotMinutes;
  }

  return times;
}

export async function onRequestGet({ env }) {
  const rules = await env.DB.prepare(
    `SELECT weekday, start_time, end_time, slot_minutes, timezone
     FROM booking_rules
     WHERE active = 1`
  ).all();

  const activeRules = rules.results || [];

  if (activeRules.length === 0) {
    return Response.json({ success: true, data: { slots: [] }, error: null });
  }

  const today = new Date();
  const startDate = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );

  const endDate = addDays(startDate, 56);

  const bookings = await env.DB.prepare(
    `SELECT starts_at
     FROM bookings
     WHERE status IN ('pending', 'confirmed')
       AND starts_at >= ?
       AND starts_at < ?`
  )
    .bind(formatDate(startDate), formatDate(addDays(endDate, 1)))
    .all();

  const booked = new Set(
    (bookings.results || []).map((booking) => booking.starts_at)
  );

  const slots = [];

  for (let dayOffset = 0; dayOffset < 56; dayOffset += 1) {
    const date = addDays(startDate, dayOffset);
    const weekday = date.getUTCDay();

    for (const rule of activeRules) {
      if (rule.weekday !== weekday) continue;

      for (const time of buildTimes(
        rule.start_time,
        rule.end_time,
        rule.slot_minutes
      )) {
        const startsAt = `${formatDate(date)}T${time}:00`;

        if (!booked.has(startsAt)) {
          slots.push({
            startsAt,
            date: formatDate(date),
            time,
            timezone: rule.timezone,
          });
        }
      }
    }
  }

  return Response.json({
    success: true,
    data: { slots },
    error: null,
  });
}
