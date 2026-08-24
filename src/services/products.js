import { fallbackProducts } from '../data/products';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { slugify } from '../utils/slugify';

const BUCKET = 'product-images';

function normalizeProduct(product) {
  return {
    ...product,
    price: Number(product.price || 0),
    stock: Number(product.stock || 0),
    active: Boolean(product.active),
    featured: Boolean(product.featured),
  };
}

export async function listPublicProducts() {
  if (!isSupabaseConfigured) {
    return {
      data: fallbackProducts.map(normalizeProduct),
      demo: true,
    };
  }

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('active', true)
    .order('featured', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;

  return {
    data: (data || []).map(normalizeProduct),
    demo: false,
  };
}

export async function listFeaturedProducts(limit = 3) {
  if (!isSupabaseConfigured) {
    return {
      data: fallbackProducts.filter((product) => product.featured).slice(0, limit),
      demo: true,
    };
  }

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('active', true)
    .eq('featured', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return {
    data: (data || []).map(normalizeProduct),
    demo: false,
  };
}

export async function getPublicProductBySlug(slug) {
  if (!isSupabaseConfigured) {
    const product = fallbackProducts.find((item) => item.slug === slug && item.active);

    return {
      data: product ? normalizeProduct(product) : null,
      demo: true,
    };
  }

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle();

  if (error) throw error;

  return {
    data: data ? normalizeProduct(data) : null,
    demo: false,
  };
}

export async function listAdminProducts() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase ainda não está configurado.');
  }

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map(normalizeProduct);
}

export async function createProduct(values) {
  const payload = {
    name: values.name.trim(),
    slug: `${slugify(values.name)}-${Date.now().toString(36).slice(-5)}`,
    description: values.description?.trim() || null,
    price: Number(values.price),
    stock: Number(values.stock),
    category: values.category?.trim() || 'Outros',
    image_url: values.image_url || null,
    active: Boolean(values.active),
    featured: Boolean(values.featured),
  };

  const { data, error } = await supabase
    .from('products')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return normalizeProduct(data);
}

export async function updateProduct(id, values) {
  const payload = {
    name: values.name.trim(),
    description: values.description?.trim() || null,
    price: Number(values.price),
    stock: Number(values.stock),
    category: values.category?.trim() || 'Outros',
    image_url: values.image_url || null,
    active: Boolean(values.active),
    featured: Boolean(values.featured),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('products')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return normalizeProduct(data);
}

export async function deleteProduct(id) {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function uploadProductImage(file) {
  if (!file) return null;

  if (!file.type.startsWith('image/')) {
    throw new Error('O ficheiro escolhido não é uma imagem.');
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('A imagem deve ter no máximo 5 MB.');
  }

  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const safeName = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const path = `products/${safeName}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}
