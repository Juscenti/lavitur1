import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

const CURRENCY = 'JMD';
function formatPrice(amount) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: CURRENCY }).format(Number(amount ?? 0));
}

const CURATED_COUNT = 8;

export default function TopPicks() {
  const [items, setItems] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/products')
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        const curated = list
          .slice(0, CURATED_COUNT)
          .map((p) => ({
            id: p.id,
            title: p.title || 'Product',
            price: formatPrice(p.price),
            img: p.image_url || '/images/placeholder.jpg',
            link: `/shop/${encodeURIComponent(String(p.id))}`,
          }));
        setItems(curated);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (loading || !items.length) return null;

  const slideStep = 280 + 24;

  const showSlide = (idx) => {
    if (idx < 0) idx = items.length - 1;
    if (idx >= items.length) idx = 0;
    setCurrentIndex(idx);
  };

  return (
    <section id="top-picks" className="top-picks">
      <h2>Curated for You</h2>
      <div className="carousel-wrapper">
        <button type="button" className="tp-nav prev" aria-label="Previous" onClick={() => showSlide(currentIndex - 1)}>
          &#10094;
        </button>
        <div className="tp-slides" id="tp-slides" style={{ transform: `translateX(-${currentIndex * slideStep}px)` }}>
          {items.map((item) => (
            <Link key={item.id} to={item.link} className="tp-slide">
              <img src={item.img} alt={item.title} />
              <div className="info">
                <h4>{item.title}</h4>
                <p>{item.price}</p>
              </div>
            </Link>
          ))}
        </div>
        <button type="button" className="tp-nav next" aria-label="Next" onClick={() => showSlide(currentIndex + 1)}>
          &#10095;
        </button>
      </div>
    </section>
  );
}
