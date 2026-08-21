import { useEffect, useRef, useState } from 'react';
import { site } from '../../data/site';

export default function Reviews() {
  const { google } = site;

  const [currentReview, setCurrentReview] = useState(0);
  const [paused, setPaused] = useState(false);

  const carouselRef = useRef(null);

  const goToReview = (index) => {
    const carousel = carouselRef.current;

    if (!carousel) return;

    const cards = carousel.children;
    const card = cards[index];

    if (!card) return;

    carousel.scrollTo({
      left: card.offsetLeft - carousel.offsetLeft,
      behavior: 'smooth',
    });

    setCurrentReview(index);
  };

  const nextReview = () => {
    const nextIndex =
      currentReview === google.reviews.length - 1
        ? 0
        : currentReview + 1;

    goToReview(nextIndex);
  };

  const previousReview = () => {
    const previousIndex =
      currentReview === 0
        ? google.reviews.length - 1
        : currentReview - 1;

    goToReview(previousIndex);
  };

  useEffect(() => {
    if (paused) return;

    const interval = setInterval(() => {
      setCurrentReview((current) => {
        const next =
          current === google.reviews.length - 1
            ? 0
            : current + 1;

        const carousel = carouselRef.current;

        if (carousel) {
          const card = carousel.children[next];

          if (card) {
            carousel.scrollTo({
              left: card.offsetLeft - carousel.offsetLeft,
              behavior: 'smooth',
            });
          }
        }

        return next;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [paused, google.reviews.length]);

  return (
    <section
      className="reviews section"
      id="avaliacoes"
    >
      <div className="reviews-wrapper">

        {/* COLUNA DA ESQUERDA */}

        <div className="reviews-summary">

          <p className="eyebrow dark">
            Google Reviews
          </p>

          <h2>
            Quem passa pela cadeira,
            <br />
            deixa a opinião.
          </h2>

          <div className="reviews-rating">

            <strong>
              {String(google.rating).replace('.', ',')}
            </strong>

            <div className="reviews-rating-info">

              <div className="google-stars">
                ★★★★★
              </div>

              <span>
                {google.reviewCount} avaliações no Google
              </span>

            </div>

          </div>

          <div className="reviews-buttons">

            <a
              href={google.reviewsUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-dark"
            >
              Ver todas no Google ↗
            </a>

            <a
              href={google.writeReviewUrl}
              target="_blank"
              rel="noreferrer"
              className="reviews-write-link"
            >
              Deixar avaliação
            </a>

          </div>

        </div>

        {/* CARROSSEL */}

        <div
          className="reviews-carousel-area"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >

          <div className="reviews-carousel-header">

            <span>
              Experiências de clientes
            </span>

            <div className="reviews-arrows">

              <button
                type="button"
                onClick={previousReview}
                aria-label="Avaliação anterior"
              >
                ←
              </button>

              <button
                type="button"
                onClick={nextReview}
                aria-label="Próxima avaliação"
              >
                →
              </button>

            </div>

          </div>

          <div
            className="reviews-carousel"
            ref={carouselRef}
          >

            {google.reviews.map((review, index) => (

              <article
                className="review-card"
                key={`${review.author}-${index}`}
              >

                <div className="review-card-top">

                  <div className="review-avatar">
                    {review.author.charAt(0)}
                  </div>

                  <div>

                    <strong>
                      {review.author}
                    </strong>

                    <span>
                      Google Review
                    </span>

                  </div>

                </div>

                <div className="review-stars">
                  {'★'.repeat(review.rating)}
                </div>

                <p>
                  “{review.text}”
                </p>

                <a
                  href={google.reviewsUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver no Google ↗
                </a>

              </article>

            ))}

          </div>

          <div className="reviews-dots">

            {google.reviews.map((_, index) => (

              <button
                key={index}
                type="button"
                aria-label={`Ir para avaliação ${index + 1}`}
                onClick={() => goToReview(index)}
                className={
                  currentReview === index
                    ? 'active'
                    : ''
                }
              />

            ))}

          </div>

        </div>

      </div>
    </section>
  );
}