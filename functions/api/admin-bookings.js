import { getSignedInUserId } from "../lib/auth.js";

export async function onRequestGet({ request, env }) {
  try {
    const userId = await getSignedInUserId(request, env);

    const admin = await env.DB.prepare(
      "SELECT member_id FROM admins WHERE member_id = ?"
    )
      .bind(userId)
      .first();

    if (!admin) {
      return Response.json(
        {
          success: false,
          data: null,
          error: {
            code: "FORBIDDEN",
            message: "Admin access is required.",
          },
        },
        { status: 403 }
      );
    }

    const bookings = await env.DB.prepare(
      `SELECT
        bookings.id,
        bookings.starts_at,
        bookings.ends_at,
        bookings.programme,
        bookings.status,
        members.name AS customer_name,
        members.email AS customer_email,
        members.phone AS customer_phone,
        orders.status AS payment_status
      FROM bookings
      LEFT JOIN members ON members.id = bookings.member_id
      LEFT JOIN orders ON orders.id = bookings.payment_order_id
      ORDER BY bookings.starts_at ASC`
    ).all();

    return Response.json({
      success: true,
      data: { bookings: bookings.results || [] },
      error: null,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        success: false,
        data: null,
        error: {
          code: "UNAUTHORISED",
          message: "Unable to load bookings.",
        },
      },
      { status: 401 }
    );
  }
}
