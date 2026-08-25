import { getSupabaseAdmin } from './supabaseAdmin.js';

function cents(value) {
  return Math.round(Number(value) * 100);
}

export async function createReservedOrder(cart) {
  const supabase = getSupabaseAdmin();

  if (!Array.isArray(cart) || cart.length === 0 || cart.length > 50) {
    throw new Error('Carrinho inválido.');
  }

  const normalized = cart.map((item) => ({
    id: String(item.id || '').trim(),
    quantity: Math.max(1, Math.min(20, Number(item.qty || item.quantity || 1))),
  }));

  if (normalized.some((item) => !item.id || !Number.isInteger(item.quantity))) {
    throw new Error('Carrinho inválido.');
  }

  const uniqueIds = [...new Set(normalized.map((item) => item.id))];

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id,name,description,price,stock,image_url,active')
    .in('id', uniqueIds)
    .eq('active', true);

  if (productsError) throw productsError;

  const productMap = new Map((products || []).map((product) => [String(product.id), product]));

  if (productMap.size !== uniqueIds.length) {
    throw new Error('Um dos produtos já não está disponível. Atualiza o carrinho.');
  }

  const items = normalized.map((item) => {
    const product = productMap.get(item.id);

    if (Number(product.stock) < item.quantity) {
      throw new Error(`Stock insuficiente para ${product.name}.`);
    }

    const unitAmount = cents(product.price);

    return {
      product_id: product.id,
      name: product.name,
      description: product.description || '',
      image_url: product.image_url || '',
      quantity: item.quantity,
      unit_amount: unitAmount,
      unit_price: unitAmount / 100,
      line_total: (unitAmount * item.quantity) / 100,
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      status: 'pending',
      currency: 'eur',
      subtotal,
      total: subtotal,
    })
    .select()
    .single();

  if (orderError) throw orderError;

  try {
    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(items.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.name,
        unit_price: item.unit_price,
        quantity: item.quantity,
        line_total: item.line_total,
      })));

    if (itemsError) throw itemsError;

    const { error: reserveError } = await supabase.rpc('reserve_store_order', {
      p_order_id: order.id,
    });

    if (reserveError) throw reserveError;

    return { order, items };
  } catch (error) {
    await supabase.from('orders').delete().eq('id', order.id);
    throw error;
  }
}

export async function attachStripeSession(orderId, sessionId) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('orders')
    .update({ stripe_session_id: sessionId, updated_at: new Date().toISOString() })
    .eq('id', orderId);

  if (error) throw error;
}

export async function releaseOrder(orderId, status = 'expired') {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.rpc('release_store_order', {
    p_order_id: orderId,
    p_status: status,
  });
  if (error) throw error;
}

export async function finalizeOrderFromSession(session) {
  const supabase = getSupabaseAdmin();
  const orderId = session.metadata?.order_id || session.client_reference_id;

  if (!orderId) throw new Error('Stripe session sem order_id.');

  const shippingDetails = session.shipping_details
    || session.collected_information?.shipping_details
    || null;

  const { data, error } = await supabase.rpc('finalize_store_order', {
    p_order_id: orderId,
    p_stripe_session_id: session.id,
    p_payment_intent_id: typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id || null,
    p_customer_email: session.customer_details?.email || null,
    p_customer_name: session.customer_details?.name || null,
    p_customer_phone: session.customer_details?.phone || null,
    p_shipping_address: shippingDetails || null,
    p_total: Number(session.amount_total || 0) / 100,
  });

  if (error) throw error;
  return { orderId, changed: data };
}

export async function markOrderStatus(orderId, status) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId);
  if (error) throw error;
}

export async function getOrderSummary(orderId) {
  const supabase = getSupabaseAdmin();

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle();
  if (orderError) throw orderError;

  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('product_name,unit_price,quantity,line_total')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });
  if (itemsError) throw itemsError;

  return { order, items: items || [] };
}
