const BOOKINGS_KEY =
  'af_bookings';


const CART_KEY =
  'af_store_cart_v2';


/* =========================================================
   BOOKINGS
========================================================= */

export function readBookings() {

  try {

    const raw =
      localStorage.getItem(
        BOOKINGS_KEY,
      );


    const value =
      JSON.parse(
        raw || '[]',
      );


    return Array.isArray(value)
      ? value
      : [];


  } catch {

    return [];

  }

}


export function saveBooking(
  booking,
) {

  const bookings =
    readBookings();


  bookings.push(
    booking,
  );


  localStorage.setItem(
    BOOKINGS_KEY,
    JSON.stringify(
      bookings,
    ),
  );


  return bookings;

}


export function clearBookings() {

  localStorage.removeItem(
    BOOKINGS_KEY,
  );

}


/* =========================================================
   CART
========================================================= */

export function readCart() {

  try {

    const raw =
      localStorage.getItem(
        CART_KEY,
      );


    const value =
      JSON.parse(
        raw || '[]',
      );


    return Array.isArray(value)
      ? value
      : [];


  } catch {

    return [];

  }

}


export function saveCart(
  cart,
) {

  const safeCart =
    Array.isArray(cart)
      ? cart
      : [];


  localStorage.setItem(
    CART_KEY,
    JSON.stringify(
      safeCart,
    ),
  );


  return safeCart;

}