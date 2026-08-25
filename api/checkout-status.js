import { retrieveCheckoutSession } from '../server/stripeApi.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const sessionId = String(req.query?.session_id || '').trim();

    if (!sessionId.startsWith('cs_')) {
      return res.status(400).json({ message: 'Sessão inválida.' });
    }

    const session = await retrieveCheckoutSession(sessionId);

    return res.status(200).json({
      status: session.status,
      paymentStatus: session.payment_status,
      amountTotal: session.amount_total,
      currency: session.currency,
      customerEmail: session.customer_details?.email || null,
    });
  } catch (error) {
    console.error('Checkout status error:', error);
    return res.status(400).json({ message: 'Não foi possível confirmar o pagamento.' });
  }
}
