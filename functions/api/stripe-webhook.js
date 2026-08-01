export async function onRequestPost({ request, env }) {
  // Verify Stripe-Signature here before changing any order or booking record.
  // On checkout.session.completed: create an order tied to the authenticated member.
  // On invoice.paid / customer.subscription.deleted: update payment access in D1.
  return new Response('Webhook handler needs Stripe signature verification configured.', { status: 501 });
}
