import {
  useEffect,
  useState,
} from 'react';

import {
  Link,
  useParams,
} from 'react-router-dom';

import StoreHeader from '../components/store/StoreHeader';
import StoreFooter from '../components/store/StoreFooter';

import storeLogo from '../assets/images/tudo-de-compras.png';

import {
  getPublicProductBySlug,
} from '../services/products';

import {
  formatCurrency,
} from '../utils/currency';


export default function ProductPage() {
  const { slug } =
    useParams();

  const [
    product,
    setProduct,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState('');


  useEffect(() => {
    let active =
      true;


    async function load() {
      setLoading(true);

      setError('');


      try {
        const result =
          await getPublicProductBySlug(
            slug,
          );

        if (active) {
          setProduct(
            result.data,
          );
        }
      } catch (err) {
        console.error(err);

        if (active) {
          setError(
            'Não foi possível carregar este produto.',
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }


    load();


    return () => {
      active =
        false;
    };
  }, [slug]);


  return (
    <div className="store-page">

      <StoreHeader />


      <main className="product-page-main">

        <Link
          className="product-back"
          to="/loja"
        >
          ← Voltar à loja
        </Link>


        {loading && (
          <div className="store-loading light">
            A carregar produto...
          </div>
        )}


        {error && (
          <div className="store-error light">
            {error}
          </div>
        )}


        {!loading &&
          !error &&
          !product && (

            <div className="product-not-found">

              <h1>
                Produto não encontrado.
              </h1>

              <Link
                className="btn btn-dark"
                to="/loja"
              >
                Ver catálogo
              </Link>

            </div>

          )}


        {!loading &&
          product && (

            <section className="product-detail">

              <div className="product-detail-image">

                <img
                  src={
                    product.image_url ||
                    storeLogo
                  }
                  alt={product.name}
                />


                {product.featured && (
                  <span className="product-badge">
                    Destaque
                  </span>
                )}

              </div>


              <div className="product-detail-copy">

                <p className="store-kicker dark">
                  {product.category ||
                    'Produto'}
                </p>


                <h1>
                  {product.name}
                </h1>


                <div className="product-detail-price">

                  {formatCurrency(
                    product.price,
                  )}

                </div>


                <p className="product-detail-description">

                  {product.description ||
                    'Produto disponível na Tudo de Compras.'}

                </p>


                <div
                  className={
                    `product-availability ${
                      product.stock <= 0
                        ? 'out'
                        : ''
                    }`
                  }
                >

                  {product.stock <= 0
                    ? 'Indisponível'
                    : 'Disponível na barbearia'}

                </div>


                {product.stock > 0 && (

                  <div
                    className="product-detail-note"
                    style={{
                      marginTop:
                        '20px',
                    }}
                  >

                    Compra disponível
                    presencialmente na
                    Barbearia Angel
                    Fortes.

                  </div>

                )}

              </div>

            </section>

          )}

      </main>


      <StoreFooter />

    </div>
  );
}