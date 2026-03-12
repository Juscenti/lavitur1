import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SignInRequiredModal from '../components/SignInRequiredModal';
import { api } from '../lib/api';
import Skeleton from '../components/Skeleton.jsx';
import '../styles/shop.css';

function ProductPageSkeleton() {
  return (
    <div className="product-page">
      <div className="pdp" id="pdp-main">
        <nav className="pdp-breadcrumb" aria-hidden="true">
          <Skeleton style={{ width: 40, height: 18, display: 'inline-block' }} />
          <Skeleton style={{ width: 80, height: 18, display: 'inline-block', marginLeft: 8 }} />
          <Skeleton style={{ width: 120, height: 18, display: 'inline-block', marginLeft: 8 }} />
        </nav>
        <article className="pdp-content">
          <div className="pdp-gallery-wrap">
            <div className="pdp-gallery">
              <Skeleton style={{ width: '100%', aspectRatio: '3/4', borderRadius: 0 }} />
            </div>
            <div className="pdp-gallery-thumbs">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} style={{ width: 64, height: 80, flexShrink: 0, borderRadius: 0 }} />
              ))}
            </div>
          </div>
          <div className="pdp-info">
            <Skeleton style={{ width: 72, height: 18, marginBottom: 8 }} />
            <Skeleton style={{ width: '85%', height: 36, marginBottom: 12 }} />
            <Skeleton style={{ width: 100, height: 28, marginBottom: 16 }} />
            <Skeleton style={{ width: '100%', height: 48, marginBottom: 12 }} />
            <Skeleton style={{ width: 80, height: 20, marginBottom: 24 }} />
            <div className="pdp-size-options" style={{ marginBottom: 24 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} style={{ width: 48, height: 48, display: 'inline-block', marginRight: 8, borderRadius: 0 }} />
              ))}
            </div>
            <Skeleton style={{ width: '100%', height: 52, marginBottom: 12, borderRadius: 0 }} />
            <Skeleton style={{ width: 120, height: 22, marginTop: 24 }} />
          </div>
        </article>
        <section className="pdp-reviews">
          <Skeleton style={{ width: 100, height: 28, marginBottom: 8 }} />
          <Skeleton style={{ width: 180, height: 20, marginBottom: 24 }} />
          {[1, 2].map((i) => (
            <div key={i} style={{ marginBottom: 20 }}>
              <Skeleton style={{ width: '60%', height: 20, marginBottom: 8 }} />
              <Skeleton style={{ width: '100%', height: 16 }} />
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

const PLACEHOLDER_SVG = "data:image/svg+xml," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500"><rect fill="#f1f0ed" width="400" height="500"/><text fill="#999" x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14">No image</text></svg>'
);
const WISHLIST_KEY = 'lavitur_wishlist';
const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL'];

function formatMoney(amount, currency = 'JMD') {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(amount ?? 0));
}

function getWishlistProductsLocal() {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (_) {
    return [];
  }
}

function Stars({ rating }) {
  return (
    <span className="pdp-review-stars-static">
      {[1, 2, 3, 4, 5].map((i) => (
        <i key={i} className={i <= rating ? 'fas fa-star' : 'far fa-star'} />
      ))}
    </span>
  );
}

function formatReviewDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (_) {
    return '';
  }
}

const PLACEHOLDER_DESC_PATTERN = /^(no description|n\/a|qwerty|asdfgh|placeholder|lorem|test|xxx|\.\.\.)$/i;
const GIBBERISH_MAX_LEN = 25;
function isRealDescription(text) {
  if (!text || typeof text !== 'string') return false;
  const t = text.trim();
  if (t.length < 15) return false;
  if (PLACEHOLDER_DESC_PATTERN.test(t)) return false;
  if (t.length <= GIBBERISH_MAX_LEN && !/[.!?]/.test(t) && /^[a-z]+$/i.test(t.replace(/\s/g, ''))) return false;
  return true;
}

export default function Product() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mainImage, setMainImage] = useState('');
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [wishlisted, setWishlisted] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewHint, setReviewHint] = useState(false);
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const [addToCartSizeHint, setAddToCartSizeHint] = useState(false);
  const [signInModalOpen, setSignInModalOpen] = useState(false);

  const reviewDisplayName = profile?.username || profile?.full_name || (user?.email?.split('@')[0]) || 'Guest';

  useEffect(() => {
    if (!id?.trim()) {
      setLoading(false);
      setError(true);
      return;
    }
    setLoading(true);
    setError(false);
    const productId = id.trim();
    Promise.all([
      api.get('/products/' + encodeURIComponent(productId)),
      api.get('/products/' + encodeURIComponent(productId) + '/reviews').catch(() => []),
      user ? api.get('/me/wishlist').catch(() => []) : Promise.resolve(null),
    ])
      .then(([data, reviewsList, wishlistData]) => {
        setProduct(data);
        const baseImages = (data.images && data.images.length) ? data.images : (data.image_url ? [data.image_url] : []);
        const variants = Array.isArray(data.color_variants) ? data.color_variants : [];
        const defaultVariant = variants.find((v) => v.is_default) || variants[0] || null;
        setSelectedColor(defaultVariant);
        const firstImages = defaultVariant?.images?.length ? defaultVariant.images : baseImages;
        setMainImage(firstImages[0] || data.image_url || '');
        setReviews(Array.isArray(reviewsList) ? reviewsList : []);
        if (user && Array.isArray(wishlistData)) {
          setWishlisted(wishlistData.some((w) => String(w.product_id) === String(data.id)));
        } else {
          setWishlisted(getWishlistProductsLocal().some((p) => String(p.id) === String(data.id)));
        }
      })
      .catch((err) => {
        if (err?.status === 404 || (err?.data && err.data.error)) setError(true);
        else setError(true);
      })
      .finally(() => setLoading(false));
  }, [id, user?.id]);

  useEffect(() => {
    if (product) document.title = (product.title || 'Product') + ' – Lavitúr';
  }, [product]);

  const toggleWishlist = async () => {
    if (!user) return;
    if (wishlisted) {
      try {
        await api.delete('/me/wishlist/product/' + encodeURIComponent(product.id));
        setWishlisted(false);
      } catch (_) {}
    } else {
      try {
        await api.post('/me/wishlist', { product_id: product.id });
        setWishlisted(true);
      } catch (_) {}
    }
  };

  const addToCart = async () => {
    if (!user) return;
    const sizes = (product.sizes && product.sizes.length) ? product.sizes : DEFAULT_SIZES;
    if (sizes.length && !selectedSize) {
      setAddToCartSizeHint(true);
      return;
    }
    setAddToCartSizeHint(false);
    const qty = Math.max(1, Math.min(99, quantity));
    try {
      await api.post('/me/cart', { product_id: product.id, size: selectedSize || undefined, quantity: qty });
      setCartModalOpen(true);
      setTimeout(() => setCartModalOpen(false), 2500);
    } catch (_) {
      // fallback: keep localStorage for any edge case
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      const key = (item) => String(item.id) + (item.size ? ':' + item.size : '');
      const existing = cart.find((item) => key(item) === key({ id: product.id, size: selectedSize || undefined }));
      if (existing) existing.quantity += qty;
      else cart.push({ ...product, quantity: qty, size: selectedSize || null });
      localStorage.setItem('cart', JSON.stringify(cart));
      setCartModalOpen(true);
      setTimeout(() => setCartModalOpen(false), 2500);
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (reviewRating < 1) {
      setReviewHint(true);
      return;
    }
    setReviewHint(false);
    if (!user) return;
    try {
      await api.post('/products/' + encodeURIComponent(product.id) + '/reviews', {
        rating: reviewRating,
        body: reviewComment.trim() || undefined,
      });
      const list = await api.get('/products/' + encodeURIComponent(product.id) + '/reviews');
      setReviews(Array.isArray(list) ? list : []);
      setReviewRating(0);
      setReviewComment('');
    } catch (_) {}
  };

  if (loading) {
    return <ProductPageSkeleton />;
  }

  if (error || !product) {
    return (
      <div className="product-page">
        <div className="pdp" id="pdp-main">
          <div className="pdp-error">
            <p>Product not found.</p>
            <Link to="/shop" className="pdp-back">Back to shop</Link>
          </div>
        </div>
      </div>
    );
  }

  const colorVariants = Array.isArray(product.color_variants) ? product.color_variants : [];
  const hasColors = colorVariants.length > 0;
  const baseImages = (product.images && product.images.length) ? product.images : (product.image_url ? [product.image_url] : []);
  const activeImages = (() => {
    if (!selectedColor) return baseImages;
    const varImgs = selectedColor.images || [];
    return varImgs.length ? varImgs : baseImages;
  })();
  const sizes = (product.sizes && product.sizes.length) ? product.sizes : DEFAULT_SIZES;
  const stock = Number(product.stock ?? 0);
  const maxQty = Math.max(1, Math.min(99, stock));
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length : 0;
  const categorySlug = (product.category_slug || product.category_slugs?.[0] || '').toLowerCase().trim();
  const showDescription = isRealDescription(product.description);
  const currentImageIndex = activeImages.length ? Math.max(0, activeImages.indexOf(mainImage)) : 0;
  const goToPrev = () => {
    if (activeImages.length < 2) return;
    setMainImage(activeImages[(currentImageIndex - 1 + activeImages.length) % activeImages.length]);
  };
  const goToNext = () => {
    if (activeImages.length < 2) return;
    setMainImage(activeImages[(currentImageIndex + 1) % activeImages.length]);
  };

  return (
    <div className="product-page">
      <div className="pdp" id="pdp-main">
        <nav className="pdp-breadcrumb" aria-label="Breadcrumb">
          <Link to="/shop">Shop</Link>
          {product.category_name && (
            <>
              <span className="pdp-breadcrumb-sep" aria-hidden>/</span>
              <Link to={categorySlug ? `/shop?category=${encodeURIComponent(categorySlug)}` : '/shop'}>{product.category_name}</Link>
            </>
          )}
          <span className="pdp-breadcrumb-sep" aria-hidden>/</span>
          <span className="pdp-breadcrumb-current" aria-current="page">{product.title || 'Product'}</span>
        </nav>
        <article className="pdp-content">
        <div className="pdp-gallery-wrap">
          <div className="pdp-gallery">
            <img
              src={mainImage || PLACEHOLDER_SVG}
              alt={product.title}
              onError={(e) => { e.target.onerror = null; e.target.src = PLACEHOLDER_SVG; }}
            />
            {activeImages.length > 1 && (
              <>
                <button
                  type="button"
                  className="pdp-gallery-nav pdp-gallery-prev"
                  aria-label="Previous image"
                  onClick={goToPrev}
                >
                  &#10094;
                </button>
                <button
                  type="button"
                  className="pdp-gallery-nav pdp-gallery-next"
                  aria-label="Next image"
                  onClick={goToNext}
                >
                  &#10095;
                </button>
              </>
            )}
          </div>
          {activeImages.length > 1 && (
            <div className="pdp-gallery-thumbs">
              {activeImages.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  className={'pdp-thumb' + (url === mainImage ? ' active' : '')}
                  onClick={() => setMainImage(url)}
                  aria-label={`View image ${i + 1}`}
                >
                  <img src={url} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="pdp-info">
          {product.category_name && (
            <Link to={categorySlug ? `/shop?category=${encodeURIComponent(categorySlug)}` : '/shop'} className="pdp-category">
              {product.category_name}
            </Link>
          )}
          <h1 className="pdp-title">{product.title || 'Untitled'}</h1>
          <p className="pdp-price">{formatMoney(product.price, 'JMD')}</p>
          {showDescription && (
            <div className="pdp-desc-block">
              <p className="pdp-desc">{product.description}</p>
            </div>
          )}
          <p className="pdp-stock">
            {stock > 0 ? (
              <span className="pdp-stock-in">{stock > 5 ? `In stock` : `Only ${stock} left`}</span>
            ) : (
              <span className="pdp-stock-out">Sold out</span>
            )}
          </p>

          {hasColors && (
            <div className="pdp-option pdp-color-wrap">
              <label className="pdp-option-label">
                Colour{selectedColor ? `: ${selectedColor.color_name}` : ''}
              </label>
              <div className="pdp-color-options">
                {colorVariants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    className={'pdp-color-btn' + (selectedColor?.id === v.id ? ' selected' : '')}
                    title={v.color_name}
                    aria-label={v.color_name}
                    aria-pressed={selectedColor?.id === v.id}
                    onClick={() => {
                      setSelectedColor(v);
                      const vImgs = v.images || [];
                      const imgs = vImgs.length ? vImgs : baseImages;
                      setMainImage(imgs[0] || '');
                    }}
                  >
                    {v.color_hex ? (
                      <span className="pdp-color-swatch" style={{ background: v.color_hex }} />
                    ) : (
                      <span className="pdp-color-label">{v.color_name}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pdp-option pdp-size-wrap">
            <label className="pdp-option-label">Size</label>
            <div className="pdp-size-options">
              {sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={'pdp-size-btn' + (selectedSize === s ? ' selected' : '')}
                  onClick={() => { setSelectedSize(s); setAddToCartSizeHint(false); }}
                >
                  {s}
                </button>
              ))}
            </div>
            {addToCartSizeHint && <p className="pdp-size-required-hint">Please select a size.</p>}
            <p className="pdp-size-guide-hint">
              <Link to="/contact" className="pdp-size-guide-link">Size guide</Link>
            </p>
          </div>

          <div className="pdp-option pdp-quantity-wrap">
            <label className="pdp-option-label">Quantity</label>
            <div className="pdp-quantity">
              <button type="button" className="pdp-qty-btn" aria-label="Decrease" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>−</button>
              <input type="number" value={quantity} min={1} max={maxQty} onChange={(e) => setQuantity(Math.max(1, Math.min(maxQty, parseInt(e.target.value, 10) || 1)))} aria-label="Quantity" />
              <button type="button" className="pdp-qty-btn" aria-label="Increase" onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}>+</button>
            </div>
          </div>

          <div className="pdp-actions">
            {user ? (
              <>
                <button type="button" className="pdp-add-cart" disabled={stock <= 0} onClick={addToCart}>
                  Add to cart
                </button>
                <button type="button" className={'pdp-wishlist' + (wishlisted ? ' is-wishlisted' : '')} aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'} onClick={toggleWishlist}>
                  <i className={wishlisted ? 'fas fa-heart' : 'far fa-heart'} />
                </button>
              </>
            ) : (
              <>
                <button type="button" className="pdp-add-cart pdp-sign-in-cta" onClick={() => setSignInModalOpen(true)}>
                  Sign in to add to cart
                </button>
                <button type="button" className="pdp-wishlist pdp-wishlist-guest" aria-label="Sign in to add to wishlist" title="Sign in to add to wishlist" onClick={() => setSignInModalOpen(true)}>
                  <i className="far fa-heart" />
                </button>
              </>
            )}
          </div>

          {cartModalOpen && (
            <div className="pdp-cart-modal" role="dialog" aria-live="polite" aria-label="Added to cart">
              <div className="pdp-cart-modal-inner">
                <i className="fas fa-check-circle pdp-cart-modal-icon" aria-hidden />
                <p className="pdp-cart-modal-text">Added to cart</p>
              </div>
            </div>
          )}

          <SignInRequiredModal open={signInModalOpen} onClose={() => setSignInModalOpen(false)} />

          <div className="pdp-details-block">
            <p className="pdp-details-item">
              <span className="pdp-details-label">Shipping</span>
              Complimentary worldwide shipping on orders over €200. Free returns within 30 days.
            </p>
            <p className="pdp-details-item">
              <span className="pdp-details-label">Returns</span>
              Easy returns. See our <Link to="/contact">Contact</Link> page for details.
            </p>
          </div>

          <Link to="/shop" className="pdp-btn-back">← Back to shop</Link>
        </div>
        </article>

        <section className="pdp-reviews">
        <div className="pdp-reviews-header">
          <h2 className="pdp-reviews-title">Reviews</h2>
          <p className="pdp-reviews-summary" aria-live="polite">
            {reviews.length === 0 ? '' : `${reviews.length} ${reviews.length === 1 ? 'review' : 'reviews'} · ${(Math.round(avgRating * 10) / 10).toFixed(1)} ★ average`}
          </p>
        </div>
        <div className="pdp-reviews-list">
          {reviews.length === 0 ? (
            <p className="pdp-reviews-empty">No reviews yet. Be the first to leave one.</p>
          ) : (
            [...reviews].reverse().map((r) => {
              const canDelete = (r.userId && user && r.userId === user.id) || (!r.userId && r.name === reviewDisplayName);
              return (
                <div key={r.id} className="pdp-review-item">
                  <div className="pdp-review-meta">
                    <span className="pdp-review-name">{r.name}</span>
                    <Stars rating={r.rating} />
                    <span className="pdp-review-date">{formatReviewDate(r.date)}</span>
                    {canDelete && (
                      <button
                        type="button"
                        className="pdp-review-delete"
                        onClick={async () => {
                          try {
                            await api.delete('/products/' + encodeURIComponent(product.id) + '/reviews/' + encodeURIComponent(r.id));
                            const list = await api.get('/products/' + encodeURIComponent(product.id) + '/reviews');
                            setReviews(Array.isArray(list) ? list : []);
                          } catch (_) {}
                        }}
                        aria-label="Delete your review"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  <p className="pdp-review-comment">{r.comment}</p>
                </div>
              );
            })
          )}
        </div>
        <form className="pdp-review-form" onSubmit={submitReview}>
          <h3>Write a review</h3>
          <div className="pdp-review-field">
            <label>Rating</label>
            <div className="pdp-review-stars">
              {[1, 2, 3, 4, 5].map((i) => (
                <button key={i} type="button" className="pdp-star" data-rating={i} aria-label={`${i} star`} onClick={() => setReviewRating(i)}>
                  <i className={i <= reviewRating ? 'fas fa-star' : 'far fa-star'} />
                </button>
              ))}
            </div>
            {reviewHint && <p className="pdp-review-rating-hint">Please select a rating.</p>}
          </div>
          <div className="pdp-review-field">
            <label htmlFor="pdp-review-comment">Comment</label>
            <textarea id="pdp-review-comment" rows={4} maxLength={1000} placeholder="Share your thoughts…" required value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} />
          </div>
          <button type="submit" className="pdp-review-submit">Submit review</button>
        </form>
        </section>
      </div>
    </div>
  );
}
