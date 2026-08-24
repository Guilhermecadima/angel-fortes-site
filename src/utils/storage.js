const BOOKINGS_KEY = 'af_bookings';
const CART_KEY = 'af_store_cart_v2';

export function readBookings() {
  try {
    return JSON.parse(localStorage.getItem(BOOKINGS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveBooking(booking) {
  const bookings = readBookings();
  bookings.push(booking);
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
  return bookings;
}

export function clearBookings() {
  localStorage.removeItem(BOOKINGS_KEY);
}

export function readCart() {
  try {
    const value = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}
