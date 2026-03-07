import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const slides = [
  '/images/slideshow/feature1.png',
  '/images/slideshow/feature2.png',
  '/images/slideshow/feature3.png',
];

export default function Hero() {
  const [current, setCurrent] = useState(0);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    if (hover) return;
    const id = setInterval(() => setCurrent((c) => (c + 1) % slides.length), 5500);
    return () => clearInterval(id);
  }, [hover]);

  const goTo = (next) => {
    setCurrent((c) => {
      if (next >= slides.length) return 0;
      if (next < 0) return slides.length - 1;
      return next;
    });
  };

  return (
    <header className="hero">
      <div
        className="hero-slider"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <div className="slides" style={{ transform: `translateX(-${current * 100}%)` }}>
          {slides.map((src, i) => (
            <img key={i} src={src} className="slide" alt="Lavitúr Collection" />
          ))}
        </div>
        <button type="button" className="nav prev" aria-label="Previous slide" onClick={() => goTo(current - 1)}>&#10094;</button>
        <button type="button" className="nav next" aria-label="Next slide" onClick={() => goTo(current + 1)}>&#10095;</button>
      </div>
      <div className="hero-content">
        <h1 className="WordLogo">Lavitúr</h1>
        <h2 className="tagline">Grace in Grit</h2>
        <button className="cta-button">
          <Link to="/shop">Discover the Collection</Link>
        </button>
      </div>
    </header>
  );
}
