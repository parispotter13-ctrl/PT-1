const products = {
  foundation: { price: 'price_REPLACE_FOUNDATION', mode: 'subscription' },
  performance: { price: 'price_REPLACE_PERFORMANCE', mode: 'subscription' },
  sessions: { price: 'price_REPLACE_SESSION', mode: 'payment' },
};

export async function onRequestPost({ request, env }) {
  const { programme } = await request.json();
  const product = products[programme];
  if (!product) return Response.json({ error: 'Unknown programme' }, { status: 400 });
  const form = new URLSearchParams({
    mode: product.mode,
    'line_items[0][price]': product.price,
    'line_items[0][quantity]': '1',
    success_url: `${new URL(request.url).origin}/account?payment=success`,
    cancel_url: `${new URL(request.url).origin}/#programmes`,
    'metadata[programme]': programme,
  });
  const stripe = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST', headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form,
  });
  const data = await stripe.json();
  return Response.json({ url: data.url }, { status: stripe.ok ? 200 : 500 });
}
