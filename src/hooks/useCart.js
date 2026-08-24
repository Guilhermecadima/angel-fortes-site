import { useMemo, useState } from 'react';
import { readCart, saveCart } from '../utils/storage';

export function useCart() {
  const [cart, setCart] = useState(() => readCart());

  const update = (nextCart) => {
    setCart(nextCart);
    saveCart(nextCart);
  };

  const add = (product, quantity = 1) => {
    if (!product || product.stock <= 0) return;

    const amount = Math.max(1, Number(quantity || 1));
    const existing = cart.find((item) => item.id === product.id);

    const nextCart = existing
      ? cart.map((item) => (
          item.id === product.id
            ? {
                ...item,
                qty: Math.min(item.qty + amount, product.stock),
                stock: product.stock,
                price: product.price,
                image_url: product.image_url,
              }
            : item
        ))
      : [
          ...cart,
          {
            id: product.id,
            slug: product.slug,
            name: product.name,
            price: product.price,
            image_url: product.image_url,
            stock: product.stock,
            qty: Math.min(amount, product.stock),
          },
        ];

    update(nextCart);
  };

  const remove = (productId) => {
    update(cart.filter((item) => item.id !== productId));
  };

  const setQuantity = (productId, quantity) => {
    const nextQuantity = Number(quantity);

    if (nextQuantity <= 0) {
      remove(productId);
      return;
    }

    update(
      cart.map((item) => (
        item.id === productId
          ? { ...item, qty: Math.min(nextQuantity, item.stock || nextQuantity) }
          : item
      )),
    );
  };

  const clear = () => update([]);

  const count = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty, 0),
    [cart],
  );

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.price || 0) * item.qty, 0),
    [cart],
  );

  return {
    cart,
    count,
    total,
    add,
    remove,
    setQuantity,
    clear,
  };
}
