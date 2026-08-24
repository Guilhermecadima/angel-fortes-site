import { useState } from 'react';
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
import { useCart } from '../hooks/useCart';

export default function HomePage() {
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);

  const {
    cart,
    count,
    total,
    add,
    remove,
    setQuantity,
  } = useCart();

  const openBooking = (serviceId = null) => {
    setSelectedServiceId(serviceId);
    setBookingOpen(true);
  };

  const addToCart = (product) => {
    add(product);
    setCartOpen(true);
  };

  return (
    <>
      <Header
        cartCount={count}
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
        total={total}
        onClose={() => setCartOpen(false)}
        onRemove={remove}
        onQuantityChange={setQuantity}
      />
    </>
  );
}
