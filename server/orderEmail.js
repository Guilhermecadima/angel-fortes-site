import { Resend } from 'resend';
import { getOrderSummary } from './storeOrders.js';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function euro(value) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(value || 0));
}

export async function sendPaidOrderNotification(orderId) {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  const recipient = (process.env.ORDER_EMAIL || process.env.BOOKING_EMAIL || '').trim();

  if (!apiKey || !recipient) return;

  const { order, items } = await getOrderSummary(orderId);
  if (!order) return;

  const resend = new Resend(apiKey);
  const lines = items.map((item) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #eee;">${escapeHtml(item.product_name)} × ${item.quantity}</td>
      <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">${euro(item.line_total)}</td>
    </tr>
  `).join('');

  const address = order.shipping_address?.address || order.shipping_address || {};
  const addressText = [
    address.line1,
    address.line2,
    [address.postal_code, address.city].filter(Boolean).join(' '),
    address.state,
    address.country,
  ].filter(Boolean).join(', ');

  await resend.emails.send({
    from: 'Angel Fortes <onboarding@resend.dev>',
    to: recipient,
    subject: `Nova encomenda paga — ${String(order.id).slice(0, 8)}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;color:#111;">
        <h1>Nova encomenda paga</h1>
        <p>A Stripe confirmou o pagamento da Tudo de Compras.</p>
        <table style="width:100%;border-collapse:collapse;">${lines}</table>
        <p style="font-size:20px;"><strong>Total:</strong> ${euro(order.total)}</p>
        <hr />
        <p><strong>Cliente:</strong> ${escapeHtml(order.customer_name || '')}</p>
        <p><strong>Email:</strong> ${escapeHtml(order.customer_email || '')}</p>
        <p><strong>Telefone:</strong> ${escapeHtml(order.customer_phone || '')}</p>
        <p><strong>Entrega:</strong> ${escapeHtml(addressText || 'Consultar Stripe Dashboard')}</p>
        <p style="color:#777;font-size:12px;">Encomenda ${escapeHtml(order.id)}</p>
      </div>
    `,
  });
}
