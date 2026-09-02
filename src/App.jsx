import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import HomePage from './pages/HomePage';
import StorePage from './pages/StorePage';
import ProductPage from './pages/ProductPage';
import AdminPage from './pages/AdminPage';
import CheckoutSuccessPage from './pages/CheckoutSuccessPage';
import CheckoutCancelPage from './pages/CheckoutCancelPage';

export default function App() {

  useEffect(() => {
    const handlePageShow = () => {
      window.scrollTo(0, 0);
    };

    window.addEventListener('pageshow', handlePageShow);

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/loja" element={<StorePage />} />
        <Route
          path="/loja/sucesso"
          element={<CheckoutSuccessPage />}
        />
        <Route
          path="/loja/cancelado"
          element={<CheckoutCancelPage />}
        />
        <Route path="/loja/:slug" element={<ProductPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}