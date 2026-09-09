import { useState } from 'react';

import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

import Hero from '../components/sections/Hero';
import About from '../components/sections/About';
import Services from '../components/sections/Services';
import Experience from '../components/sections/Experience';
import Shop from '../components/sections/Shop';
import Reviews from '../components/sections/Reviews';
import Contact from '../components/sections/Contact';

import BookingModal from '../components/booking/BookingModal';

export default function HomePage() {
  const [bookingOpen, setBookingOpen] = useState(false);

  const [
    selectedServiceId,
    setSelectedServiceId,
  ] = useState(null);

  const openBooking = (serviceId = null) => {
    setSelectedServiceId(serviceId);
    setBookingOpen(true);
  };

  return (
    <>
      <Header
        onBook={openBooking}
      />

      <main>
        <Hero onBook={openBooking} />

        <About />

        <Services
          onBook={openBooking}
        />

        <Experience />

        <Shop />

        <Reviews />

        <Contact />
      </main>

      <Footer />

      <BookingModal
        open={bookingOpen}
        initialServiceId={selectedServiceId}
        onClose={() =>
          setBookingOpen(false)
        }
      />
    </>
  );
}