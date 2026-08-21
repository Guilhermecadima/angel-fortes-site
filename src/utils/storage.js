const BOOKINGS_KEY = 'af_bookings';
const CART_KEY = 'af_cart';

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
    return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}
