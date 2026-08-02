import { getSignedInUserId } from "../lib/auth.js";

export async function onRequestGet({ request, env }) {
  try {
    const memberId = await getSignedInUserId(request);

    const admin = await env.DB.prepare(
      "SELECT member_id FROM admins WHERE member_id = ?"
    )
      .bind(memberId)
      .first();

    if (!admin) {
      return Response.json({ error: "Admin access required." }, { status: 403 });
    }

    const orders = await env.DB.prepare(
      `SELECT
        orders.id,
        orders.member_id,
        orders.programme,
        orders.status,
        orders.amount,
        orders.created_at,
        members.email,
        members.name
      FROM orders
      LEFT JOIN members ON members.id = orders.member_id
      ORDER BY orders.created_at DESC`
    ).all();

    return Response.json({ orders: orders.results || [] });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Unauthorised" }, { status: 401 });
  }
}
