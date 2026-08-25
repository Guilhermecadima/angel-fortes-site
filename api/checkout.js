import { createCheckoutSession } from '../server/stripeApi.js';
import {
  attachStripeSession,
  createReservedOrder,
  releaseOrder,
} from '../server/storeOrders.js';

function getBaseUrl(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');

  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  let reservedOrderId = null;

  try {
    const { cart } = req.body || {};
    const { order, items } = await createReservedOrder(cart);
    reservedOrderId = order.id;

    const session = await createCheckoutSession({
      order,
      items,
      baseUrl: getBaseUrl(req),
    });

    await attachStripeSession(order.id, session.id);

    return res.status(200).json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Checkout error:', error);

    if (reservedOrderId) {
      try {
        await releaseOrder(reservedOrderId, 'checkout_error');
      } catch (releaseError) {
        console.error('Erro ao libertar stock:', releaseError);
      }
    }

    const message = /configurad|Stripe|Supabase/i.test(error.message || '')
      ? 'O checkout ainda não está configurado no servidor.'
      : error.message || 'Não foi possível iniciar o pagamento.';

    return res.status(400).json({ message });
  }
}
