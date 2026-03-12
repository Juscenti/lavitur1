import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import Skeleton from '../components/Skeleton.jsx';
import '../styles/cart.css';

function CartPageSkeleton() {
  return (
    <div className="cart-page">
      <header className="cart-hero">
        <div className="cart-hero-inner">
          <Skeleton style={{ width: 220, height: 32, background: 'rgba(255,255,255,0.2)' }} />
          <Skeleton style={{ width: 140, height: 20, background: 'rgba(255,255,255,0.15)' }} />
        </div>
      </header>
      <main className="cart-container has-hero">
        <Skeleton style={{ width: 160, height: 22, marginBottom: '1.5rem' }} />
        <div className="cart-main">
          <ul className="cart-items">
            {[1, 2, 3].map((i) => (
              <li key={i} className="cart-item">
                <div className="cart-item-image-wrap">
                  <Skeleton style={{ width: '100%', height: '100%', minHeight: 140 }} />
                </div>
                <div className="cart-item-details">
                  <Skeleton style={{ width: '80%', height: 24, marginBottom: 8 }} />
                  <Skeleton style={{ width: 100, height: 18, marginBottom: 8 }} />
                  <Skeleton style={{ width: 60, height: 36, marginTop: 8 }} />
                </div>
                <div className="cart-item-total">
                  <Skeleton style={{ width: 70, height: 24 }} />
                </div>
              </li>
            ))}
          </ul>
          <aside className="cart-summary">
            <Skeleton style={{ width: 140, height: 26, marginBottom: '1rem' }} />
            <Skeleton style={{ width: '100%', height: 20, marginBottom: '1rem' }} />
            <Skeleton style={{ width: '100%', height: 32, marginBottom: '1.5rem' }} />
            <Skeleton style={{ width: '100%', height: 52, borderRadius: 8 }} />
          </aside>
        </div>
      </main>
    </div>
  );
}

function formatMoney(amount, currency = 'JMD') {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(amount ?? 0));
}

export default function Cart() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    api.get('/me/cart')
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => {
        try {
          const raw = localStorage.getItem('cart');
          const parsed = raw ? JSON.parse(raw) : [];
          setItems(Array.isArray(parsed) ? parsed : []);
        } catch {
          setItems([]);
        }
      })
      .finally(() => setLoading(false));
  }, [user]);

  const handleDecrease = async (index) => {
    const item = items[index];
    if (!item?.id) return;
    const nextQty = (item.quantity || 1) - 1;
    if (nextQty < 1) {
      handleRemove(index);
      return;
    }
    try {
      await api.patch('/me/cart/' + encodeURIComponent(item.id), { quantity: nextQty });
      const next = [...items];
      next[index] = { ...next[index], quantity: nextQty };
      setItems(next);
    } catch (_) {}
  };

  const handleIncrease = async (index) => {
    const item = items[index];
    if (!item?.id) return;
    const nextQty = (item.quantity || 1) + 1;
    try {
      await api.patch('/me/cart/' + encodeURIComponent(item.id), { quantity: nextQty });
      const next = [...items];
      next[index] = { ...next[index], quantity: nextQty };
      setItems(next);
    } catch (_) {}
  };

  const handleRemove = async (index) => {
    const item = items[index];
    if (!item?.id) return;
    try {
      await api.delete('/me/cart/' + encodeURIComponent(item.id));
      const next = [...items];
      next.splice(index, 1);
      setItems(next);
    } catch (_) {}
  };

  const total = items.reduce((sum, i) => sum + (Number(i.price) || 0) * (i.quantity || 1), 0);

  if (!user) {
    return (
      <div className="cart-page">
        <main className="cart-container">
          <h1>Your Shopping Cart</h1>
          <div className="cart-empty cart-sign-in">
            <p>Sign in to view your cart and checkout.</p>
            <Link to="/login" className="shop-link">Sign in</Link>
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return <CartPageSkeleton />;
  }

  if (items.length === 0) {
    return (
      <div className="cart-page">
        <main className="cart-container">
          <h1>Your Shopping Cart</h1>
          <div className="cart-empty">
            <p>Your cart is empty.</p>
            <p className="empty-sub">Looks like you haven't added anything yet.</p>
            <Link to="/shop" className="shop-link">Discover the Collection</Link>
          </div>
        </main>
      </div>
    );
  }

  const itemCount = items.reduce((n, i) => n + (i.quantity || 1), 0);

  return (
    <div className="cart-page">
      <header className="cart-hero">
        <div className="cart-hero-inner">
          <h1>Your Shopping Cart</h1>
          <div className="cart-hero-meta">
            <span className="cart-hero-count">
              {items.length} {items.length === 1 ? 'item' : 'items'} · {itemCount} total
            </span>
            <nav className="cart-breadcrumb" aria-label="Breadcrumb">
              <Link to="/">Home</Link>
              <span aria-hidden="true"> / </span>
              <span>Cart</span>
            </nav>
          </div>
        </div>
      </header>

      <main className="cart-container has-hero">
        <p className="cart-continue">
          <Link to="/shop">← Continue shopping</Link>
        </p>

        <div className="cart-main">
          <ul className="cart-items" id="cart-items">
            {items.map((item, idx) => {
              const qty = item.quantity || 1;
              const lineTotal = (Number(item.price) || 0) * qty;
              return (
                <li key={idx} className="cart-item">
                  <div className="cart-item-image-wrap">
                    <img
                      src={item.image || item.image_url || '/images/placeholder.jpg'}
                      alt={item.name || item.title || 'Product'}
                    />
                  </div>
                  <div className="cart-item-details">
                    <h3 className="cart-item-title">{item.name || item.title || 'Untitled'}</h3>
                    {item.size && (
                      <p className="cart-item-meta">Size {item.size}</p>
                    )}
                    <p className="cart-item-unit">{formatMoney(item.price)} each</p>
                    <div className="cart-item-actions">
                      <div className="cart-qty-control" role="group" aria-label="Quantity">
                        <button
                          type="button"
                          className="cart-qty-btn"
                          aria-label="Decrease quantity"
                          onClick={() => handleDecrease(idx)}
                        >
                          −
                        </button>
                        <span className="cart-qty-value" aria-live="polite">{qty}</span>
                        <button
                          type="button"
                          className="cart-qty-btn"
                          aria-label="Increase quantity"
                          onClick={() => handleIncrease(idx)}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="cart-remove-btn"
                        aria-label="Remove item"
                        onClick={() => handleRemove(idx)}
                        title="Remove"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="cart-item-total">
                    <span className="cart-item-total-label">Line total</span>
                    <strong>{formatMoney(lineTotal)}</strong>
                  </div>
                </li>
              );
            })}
          </ul>

          <aside id="cart-summary" className="cart-summary">
            <h2 className="cart-summary-title">Order summary</h2>
            <p className="cart-summary-count">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </p>
            <div className="cart-summary-total-row">
              <span>Total</span>
              <strong>{formatMoney(total)}</strong>
            </div>
            <Link to="/checkout" className="cart-cta">Proceed to Checkout</Link>
          </aside>
        </div>
      </main>
    </div>
  );
}
