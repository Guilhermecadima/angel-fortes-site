import { sendPaidOrderNotification } from '../server/orderEmail.js';
import { verifyStripeWebhook } from '../server/stripeApi.js';
import {
  finalizeOrderFromSession,
  releaseOrder,
} from '../server/storeOrders.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const rawBody = await readRawBody(req);
    const event = verifyStripeWebhook(rawBody, req.headers['stripe-signature']);
    const session = event.data?.object;
    const orderId = session?.metadata?.order_id || session?.client_reference_id;

    if (!session || !orderId) {
      return res.status(200).json({ received: true });
    }

    if (
      (event.type === 'checkout.session.completed' && session.payment_status === 'paid')
      || event.type === 'checkout.session.async_payment_succeeded'
    ) {
      const result = await finalizeOrderFromSession(session);

      if (result.changed) {
        try {
          await sendPaidOrderNotification(result.orderId);
        } catch (emailError) {
          console.error('Order email error:', emailError);
        }
      }
    }

    if (event.type === 'checkout.session.async_payment_failed') {
      await releaseOrder(orderId, 'payment_failed');
    }

    if (event.type === 'checkout.session.expired') {
      await releaseOrder(orderId, 'expired');
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return res.status(400).json({ message: 'Webhook inválido.' });
  }
}
