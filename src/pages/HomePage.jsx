import { useMemo, useState } from 'react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import Hero from '../components/sections/Hero';
import QuickBook from '../components/sections/QuickBook';
import About from '../components/sections/About';
import Services from '../components/sections/Services';
import Instagram from '../components/sections/Instagram';
import Experience from '../components/sections/Experience';
import Shop from '../components/sections/Shop';
import Reviews from '../components/sections/Reviews';
import Contact from '../components/sections/Contact';
import BookingModal from '../components/booking/BookingModal';
import CartDrawer from '../components/shop/CartDrawer';
import { readCart, saveCart } from '../utils/storage';

export default function HomePage() {
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState(() => readCart());

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);

  const openBooking = (serviceId = null) => {
    setSelectedServiceId(serviceId);
    setBookingOpen(true);
  };

  const updateCart = (nextCart) => {
    setCart(nextCart);
    saveCart(nextCart);
  };

  const addToCart = (productId) => {
    const existing = cart.find((item) => item.id === productId);
    const nextCart = existing
      ? cart.map((item) => item.id === productId ? { ...item, qty: item.qty + 1 } : item)
      : [...cart, { id: productId, qty: 1 }];

    updateCart(nextCart);
    setCartOpen(true);
  };

  const removeFromCart = (productId) => {
    updateCart(cart.filter((item) => item.id !== productId));
  };

  return (
    <>
      <Header
        cartCount={cartCount}
        onBook={openBooking}
        onOpenCart={() => setCartOpen(true)}
      />
      <main>
        <Hero onBook={openBooking} />
        <QuickBook onBook={openBooking} />
        <About />
        <Services onBook={openBooking} />
        <Experience />
        <Shop onAddToCart={addToCart} />
        <Reviews />
        <Instagram />
        <Contact />
      </main>
      <Footer />

      <BookingModal
        open={bookingOpen}
        initialServiceId={selectedServiceId}
        onClose={() => setBookingOpen(false)}
      />
      <CartDrawer
        open={cartOpen}
        cart={cart}
        onClose={() => setCartOpen(false)}
        onRemove={removeFromCart}
      />
    </>
  );
}
