import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { fetchPublicContentBlocks } from '../lib/contentBlocks.js';
import { api } from '../lib/api.js';
import Skeleton from '../components/Skeleton.jsx';
import '../styles/home.css';

function HomePageSkeleton() {
  return (
    <div className="index-page">
      <header className="hero skeleton-hero">
        <div className="hero-content">
          <Skeleton className="skeleton-logo" style={{ width: 'min(80%, 420px)', height: 'clamp(3rem, 8vw, 5rem)', margin: '0 auto 0.5rem' }} />
          <Skeleton style={{ width: 'min(60%, 280px)', height: '1.25rem', margin: '0 auto 2rem' }} />
          <Skeleton style={{ width: 140, height: 48, margin: '0 auto', borderRadius: 0 }} />
        </div>
      </header>
      <section className="index-editorial">
        <div className="index-editorial-inner">
          <Skeleton style={{ width: '70%', maxWidth: 320, height: 28, marginBottom: '1rem' }} />
          <Skeleton style={{ width: '100%', height: 20, marginBottom: '0.5rem' }} />
          <Skeleton style={{ width: '90%', height: 20 }} />
        </div>
      </section>
      <section id="collections" className="collections">
        <Skeleton style={{ width: 240, height: 36, margin: '0 auto 3.5rem' }} />
        <div className="grid" id="collection-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="collection-box" style={{ pointerEvents: 'none' }}>
              <Skeleton style={{ width: '100%', aspectRatio: '3/4', display: 'block' }} />
              <Skeleton style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, borderRadius: 0, background: 'rgba(0,0,0,0.5)' }} />
            </div>
          ))}
        </div>
      </section>
      <section id="top-picks" className="top-picks skeleton-top-picks">
        <Skeleton style={{ width: 200, height: 32, marginBottom: '1.5rem' }} />
        <div className="carousel-wrapper" style={{ opacity: 0.9 }}>
          <div style={{ display: 'flex', gap: 24, overflow: 'hidden', justifyContent: 'center', flexWrap: 'wrap' }}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} style={{ width: 280, flexShrink: 0, aspectRatio: '3/4', borderRadius: 0 }} />
            ))}
          </div>
        </div>
      </section>
      <section className="index-newsletter">
        <div className="index-newsletter-inner">
          <Skeleton style={{ width: 220, height: 28, marginBottom: '0.75rem' }} />
          <Skeleton style={{ width: '100%', maxWidth: 360, height: 20, marginBottom: '1.5rem' }} />
          <Skeleton style={{ width: '100%', maxWidth: 340, height: 48, borderRadius: 0 }} />
        </div>
      </section>
    </div>
  );
}

const CURRENCY = 'JMD';
function formatPrice(amount) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: CURRENCY }).format(Number(amount ?? 0));
}

const CURATED_COUNT = 8;
const SLIDE_WIDTH = 280;
const SLIDE_GAP = 24;
const slideStep = SLIDE_WIDTH + SLIDE_GAP;

function parseBodyJson(body) {
  if (!body || typeof body !== 'string') return null;
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

// —— Hero (slides + title + tagline + CTA) ——
function HeroBlock({ block }) {
  const [index, setIndex] = useState(1);
  const [noTransition, setNoTransition] = useState(false);
  const indexRef = useRef(1);
  const isTransitioningRef = useRef(false);
  const parsed = parseBodyJson(block.body);
  const tagline = parsed?.tagline ?? ((block.body || '').trim() || null);
  const slideUrls = Array.isArray(parsed?.slides) && parsed.slides.length > 0
    ? parsed.slides
    : (block.media_url ? [block.media_url] : []);
  const slides = slideUrls.filter(Boolean);
  const n = slides.length;
  const extendedSlides = n > 0 ? [slides[n - 1], ...slides, slides[0]] : [];
  const maxIndex = extendedSlides.length - 1;

  indexRef.current = index;

  const handleTransitionEnd = (e) => {
    if (n === 0) return;
    if (e.target !== e.currentTarget || e.propertyName !== 'transform') return;
    if (isTransitioningRef.current) return;
    const i = indexRef.current;
    if (i === 0) {
      isTransitioningRef.current = true;
      setNoTransition(true);
      setIndex(n);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setNoTransition(false);
          isTransitioningRef.current = false;
        });
      });
    } else if (i === maxIndex) {
      isTransitioningRef.current = true;
      setNoTransition(true);
      setIndex(1);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setNoTransition(false);
          isTransitioningRef.current = false;
        });
      });
    }
  };

  const goNext = () => setIndex((i) => Math.min(i + 1, maxIndex));
  const goPrev = () => setIndex((i) => Math.max(i - 1, 0));

  const safeIndex = Math.max(0, Math.min(index, maxIndex));

  if (slides.length === 0 && !block.title) return null;

  return (
    <header className="hero">
      {slides.length > 0 && (
        <div className="hero-slider">
          <div
            className="slides"
            style={{
              transform: `translateX(-${safeIndex * 100}%)`,
              transition: noTransition ? 'none' : 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
              willChange: 'transform',
            }}
            onTransitionEnd={handleTransitionEnd}
          >
            {extendedSlides.map((src, i) => (
              <img key={`${i}-${src}`} src={src} className="slide" alt="" loading="eager" decoding="async" />
            ))}
          </div>
          <button type="button" className="nav prev" aria-label="Previous slide" onClick={goPrev}>&#10094;</button>
          <button type="button" className="nav next" aria-label="Next slide" onClick={goNext}>&#10095;</button>
        </div>
      )}
      <div className="hero-content">
        {block.title && <h1 className="WordLogo">{block.title}</h1>}
        {tagline && <h2 className="tagline">{tagline}</h2>}
        {(block.cta_label && block.cta_url) && (
          <button type="button" className="cta-button">
            <Link to={block.cta_url}>{block.cta_label}</Link>
          </button>
        )}
      </div>
    </header>
  );
}

// —— Homepage section (editorial text) ——
function SectionBlock({ block }) {
  if (!block.title && !block.body) return null;
  return (
    <section className="index-editorial">
      <div className="index-editorial-inner">
        {block.title && <h3>{block.title}</h3>}
        {block.body && <p>{block.body}</p>}
      </div>
    </section>
  );
}

// —— Banner / Video hero ——
function BannerBlock({ block }) {
  const url = block.media_url || '';
  const isVideo = url && (/\.(mp4|webm|ogg)(\?|$)/i.test(url) || /^data:video\//i.test(url));
  const ext = url.split('.').pop()?.split('?')[0]?.toLowerCase();
  const videoType = ext === 'webm' ? 'video/webm' : ext === 'ogg' ? 'video/ogg' : 'video/mp4';
  return (
    <section className="video-hero">
      {url && (
        isVideo ? (
          <video autoPlay muted loop playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}>
            <source src={url} type={videoType} />
          </video>
        ) : (
          <img src={url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        )
      )}
      <div className="video-overlay">
        {block.title && <h2>{block.title}</h2>}
        {block.body && <p>{block.body}</p>}
        {(block.cta_label && block.cta_url) && (
          <Link to={block.cta_url} className="btn">{block.cta_label}</Link>
        )}
      </div>
    </section>
  );
}

// —— Collections grid ——
function CollectionsBlock({ block }) {
  const items = parseBodyJson(block.body);
  const list = Array.isArray(items) ? items : [];
  const valid = list.filter((c) => c && (c.slug || c.label || c.img));
  return (
    <section id="collections" className="collections">
      {block.title && <h2>{block.title}</h2>}
      <div className="grid" id="collection-grid">
        {valid.map((c, i) => (
          <Link key={c.slug || c.label || c.img || i} to={c.url || `/shop?category=${c.slug || ''}`} className="collection-box" data-category={c.slug}>
            {c.img && <img src={c.img} alt={c.label || ''} />}
            <span className="collection-label">{c.label || c.slug || 'Collection'}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

// —— Split (e.g. Women / Men tiles) ——
function SplitBlock({ block }) {
  const items = parseBodyJson(block.body);
  const list = Array.isArray(items) ? items : [];
  const valid = list.filter((t) => t && (t.img || t.label || t.url));
  return (
    <section className="index-split">
      {valid.map((tile, i) => (
        <Link key={i} to={tile.url || '#'} className="index-split-tile">
          {tile.img && <img src={tile.img} alt={tile.label || ''} />}
          {(tile.label || tile.url) && <span className="index-split-label">{tile.label || 'Link'}</span>}
        </Link>
      ))}
    </section>
  );
}

// —— Top Picks (heading from block + product carousel) ——
function TopPicksBlock({ block }) {
  const [items, setItems] = useState([]);
  const [index, setIndex] = useState(1);
  const [noTransition, setNoTransition] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.get('/products')
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        const curated = list.slice(0, CURATED_COUNT).map((p) => ({
          id: p.id,
          title: p.title || 'Product',
          price: formatPrice(p.price),
          img: p.image_url || '/images/placeholder.jpg',
          link: `/shop/${encodeURIComponent(String(p.id))}`,
        }));
        setItems(curated);
      })
      .catch(() => { if (!cancelled) setItems([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const n = items.length;
  const extendedItems = n > 0 ? [items[n - 1], ...items, ...items] : [];

  const handleTransitionEnd = () => {
    if (index === 0) {
      setNoTransition(true);
      setIndex(n);
      requestAnimationFrame(() => requestAnimationFrame(() => setNoTransition(false)));
    } else if (index === n + 1) {
      setNoTransition(true);
      setIndex(1);
      requestAnimationFrame(() => requestAnimationFrame(() => setNoTransition(false)));
    }
  };

  const goNext = () => setIndex((i) => i + 1);
  const goPrev = () => setIndex((i) => i - 1);

  if (loading || !items.length) return null;

  return (
    <section id="top-picks" className="top-picks">
      {block.title && <h2>{block.title}</h2>}
      <div className="carousel-wrapper">
        <button type="button" className="tp-nav prev" aria-label="Previous" onClick={goPrev}>&#10094;</button>
        <div className="carousel-viewport">
          <div className="tp-fade tp-fade-left" aria-hidden="true" />
          <div className="tp-fade tp-fade-right" aria-hidden="true" />
          <div
            className="tp-slides"
            style={{
              transform: `translateX(-${index * slideStep}px)`,
              transition: noTransition ? 'none' : 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onTransitionEnd={handleTransitionEnd}
          >
            {extendedItems.map((item, i) => (
              <Link key={`tp-${i}`} to={item.link} className="tp-slide">
                <img src={item.img} alt={item.title} />
                <div className="info">
                  <h4>{item.title}</h4>
                  <p>{item.price}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
        <button type="button" className="tp-nav next" aria-label="Next" onClick={goNext}>&#10095;</button>
      </div>
    </section>
  );
}

// —— Newsletter (title + body from block, form in code) ——
function NewsletterBlock({ block }) {
  return (
    <section className="index-newsletter">
      <div className="index-newsletter-inner">
        {block.title && <h3>{block.title}</h3>}
        {block.body && <p>{block.body}</p>}
        <NewsletterForm />
      </div>
    </section>
  );
}

function NewsletterForm() {
  const handleSubmit = (e) => {
    e.preventDefault();
    const email = new FormData(e.currentTarget).get('email');
    if (email) alert('Thank you for subscribing. Welcome to Lavitúr.');
  };
  return (
    <form className="index-newsletter-form" id="newsletter-form" onSubmit={handleSubmit} noValidate>
      <input type="email" name="email" placeholder="Your email" required />
      <button type="submit">Subscribe</button>
    </form>
  );
}

function BlockRenderer({ block }) {
  switch (block.type) {
    case 'hero':
      return <HeroBlock block={block} />;
    case 'homepage_section':
      return <SectionBlock block={block} />;
    case 'banner':
      return <BannerBlock block={block} />;
    case 'collections':
      return <CollectionsBlock block={block} />;
    case 'split':
      return <SplitBlock block={block} />;
    case 'top_picks':
      return <TopPicksBlock block={block} />;
    case 'newsletter':
      return <NewsletterBlock block={block} />;
    default:
      return null;
  }
}

export default function Home() {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPublicContentBlocks('home')
      .then((data) => {
        if (!cancelled) setBlocks(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Failed to load content');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return <HomePageSkeleton />;
  }

  if (error) {
    return (
      <div className="index-page">
        <div className="index-editorial">
          <div className="index-editorial-inner">
            <p className="error">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="index-page">
      {blocks.length === 0 ? (
        <div className="index-editorial">
          <div className="index-editorial-inner">
            <p>No content blocks for this page. Add blocks in the admin Content Management and set Page to &quot;Home&quot;.</p>
          </div>
        </div>
      ) : (
        blocks.map((block) => <BlockRenderer key={block.id} block={block} />)
      )}
    </div>
  );
}
