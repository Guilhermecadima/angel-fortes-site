import crypto from 'node:crypto';

const STRIPE_API = 'https://api.stripe.com/v1';

function getSecretKey() {
  const key = (process.env.STRIPE_SECRET_KEY || '').trim();
  if (!key) throw new Error('Stripe não está configurado.');
  return key;
}

async function stripeRequest(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.error?.message || `Stripe respondeu com ${response.status}.`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return data;
}

export async function createCheckoutSession({ order, items, baseUrl }) {
  const params = new URLSearchParams();

  params.set('mode', 'payment');
  params.set('locale', 'pt');
  params.set('client_reference_id', order.id);
  params.set('metadata[order_id]', order.id);
  params.set('success_url', `${baseUrl}/loja/sucesso?session_id={CHECKOUT_SESSION_ID}`);
  params.set('cancel_url', `${baseUrl}/loja/cancelado`);
  params.set('phone_number_collection[enabled]', 'true');
  params.set('shipping_address_collection[allowed_countries][0]', 'PT');
  params.set('customer_creation', 'always');
  params.set('expires_at', String(Math.floor(Date.now() / 1000) + 30 * 60));

  const methods = (process.env.STRIPE_PAYMENT_METHOD_TYPES || 'card,mb_way')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  methods.forEach((method, index) => {
    params.set(`payment_method_types[${index}]`, method);
  });

  items.forEach((item, index) => {
    const prefix = `line_items[${index}]`;
    params.set(`${prefix}[quantity]`, String(item.quantity));
    params.set(`${prefix}[price_data][currency]`, 'eur');
    params.set(`${prefix}[price_data][unit_amount]`, String(item.unit_amount));
    params.set(`${prefix}[price_data][product_data][name]`, item.name);

    if (item.description) {
      params.set(
        `${prefix}[price_data][product_data][description]`,
        item.description.slice(0, 500),
      );
    }

    if (item.image_url?.startsWith('https://')) {
      params.set(`${prefix}[price_data][product_data][images][0]`, item.image_url);
    }
  });

  const shippingCents = Number(process.env.STORE_SHIPPING_CENTS || 0);
  if (Number.isInteger(shippingCents) && shippingCents > 0) {
    params.set('shipping_options[0][shipping_rate_data][type]', 'fixed_amount');
    params.set('shipping_options[0][shipping_rate_data][fixed_amount][amount]', String(shippingCents));
    params.set('shipping_options[0][shipping_rate_data][fixed_amount][currency]', 'eur');
    params.set(
      'shipping_options[0][shipping_rate_data][display_name]',
      process.env.STORE_SHIPPING_LABEL || 'Envio',
    );
  }

  return stripeRequest('/checkout/sessions', {
    method: 'POST',
    body: params,
  });
}

export async function retrieveCheckoutSession(sessionId) {
  return stripeRequest(`/checkout/sessions/${encodeURIComponent(sessionId)}`);
}

export function verifyStripeWebhook(rawBody, signatureHeader) {
  const secret = (process.env.STRIPE_WEBHOOK_SECRET || '').trim();

  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET não configurado.');
  }

  if (!signatureHeader) {
    throw new Error('Assinatura Stripe em falta.');
  }

  const parts = signatureHeader.split(',');
  const timestamp = parts
    .find((part) => part.startsWith('t='))
    ?.slice(2);
  const signatures = parts
    .filter((part) => part.startsWith('v1='))
    .map((part) => part.slice(3));

  if (!timestamp || signatures.length === 0) {
    throw new Error('Assinatura Stripe inválida.');
  }

  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) {
    throw new Error('Assinatura Stripe expirada.');
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');

  const expectedBuffer = Buffer.from(expected, 'hex');
  const valid = signatures.some((signature) => {
    try {
      const candidate = Buffer.from(signature, 'hex');
      return candidate.length === expectedBuffer.length
        && crypto.timingSafeEqual(candidate, expectedBuffer);
    } catch {
      return false;
    }
  });

  if (!valid) {
    throw new Error('Assinatura Stripe inválida.');
  }

  return JSON.parse(rawBody);
}
