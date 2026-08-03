import { z } from "zod";
import { getSignedInUserId } from "../../lib/auth.js";

const inputSchema = z.object({
  startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00$/),
  programme: z.string().min(1).max(100).default("Foundation"),
});

function addMinutes(startsAt, minutes) {
  const date = new Date(`${startsAt}Z`);
  date.setUTCMinutes(date.getUTCMinutes() + minutes);

  return date.toISOString().replace(".000Z", "");
}

export async function onRequestPost({ request, env }) {
  try {
    const memberId = await getSignedInUserId(request, env);
    const input = inputSchema.parse(await request.json());

    const date = new Date(`${input.startsAt}Z`);
    const weekday = date.getUTCDay();
    const time = input.startsAt.slice(11, 16);

    const rule = await env.DB.prepare(
      `SELECT slot_minutes
       FROM booking_rules
       WHERE active = 1
         AND weekday = ?
         AND start_time <= ?
         AND end_time > ?`
    )
      .bind(weekday, time, time)
      .first();

    if (!rule) {
      return Response.json(
        {
          success: false,
          data: null,
          error: { code: "INVALID_SLOT", message: "That time is unavailable." },
        },
        { status: 400 }
      );
    }

    const paidOrder = await env.DB.prepare(
      `SELECT id
       FROM orders
       WHERE member_id = ?
         AND programme = ?
         AND status = 'paid'
       ORDER BY created_at DESC
       LIMIT 1`
    )
      .bind(memberId, input.programme)
      .first();

    if (!paidOrder) {
      return Response.json(
        {
          success: false,
          data: null,
          error: {
            code: "PAYMENT_REQUIRED",
            message: "A paid programme is required before booking.",
          },
        },
        { status: 403 }
      );
    }

    const existingBooking = await env.DB.prepare(
      `SELECT id
       FROM bookings
       WHERE member_id = ?
         AND programme = ?
         AND status IN ('pending', 'confirmed')
       LIMIT 1`
    )
      .bind(memberId, input.programme)
      .first();

    if (existingBooking) {
      return Response.json(
        {
          success: false,
          data: null,
          error: {
            code: "BOOKING_LIMIT_REACHED",
            message: "You already have an active session booked.",
          },
        },
        { status: 409 }
      );
    }

    const endsAt = addMinutes(input.startsAt, rule.slot_minutes);

    await env.DB.prepare(
      `INSERT INTO bookings
       (id, member_id, starts_at, ends_at, programme, payment_order_id, status)
       VALUES (?, ?, ?, ?, ?, ?, 'confirmed')`
    )
      .bind(
        crypto.randomUUID(),
        memberId,
        input.startsAt,
        endsAt,
        input.programme,
        paidOrder.id
      )
      .run();

    return Response.json({
      success: true,
      data: {
        startsAt: input.startsAt,
        endsAt,
        status: "confirmed",
      },
      error: null,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        success: false,
        data: null,
        error: { code: "BOOKING_ERROR", message: "Unable to create booking." },
      },
      { status: 400 }
    );
  }
}
