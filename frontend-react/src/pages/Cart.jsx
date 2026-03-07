import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import '../styles/cart.css';

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
    return (
      <div className="cart-page">
        <main className="cart-container">
          <h1>Your Shopping Cart</h1>
          <p className="cart-loading">Loading your cart…</p>
        </main>
      </div>
    );
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

  return (
    <div className="cart-page">
      <main className="cart-container">
        <h1>Your Shopping Cart</h1>

        <ul className="cart-items" id="cart-items">
          {items.map((item, idx) => (
            <li key={idx} className="cart-item">
              <img
                src={item.image || item.image_url || '/images/placeholder.jpg'}
                alt={item.name || item.title || 'Product'}
              />
              <div className="info">
                <h3>{item.name || item.title || 'Untitled'}</h3>
                {item.size && (
                  <p className="item-meta">Size: {item.size}</p>
                )}
                <p className="item-price">
                  {formatMoney(item.price)} × {item.quantity || 1}
                </p>
              </div>
              <div className="actions">
                <button
                  type="button"
                  className="decrease"
                  aria-label="Decrease quantity"
                  onClick={() => handleDecrease(idx)}
                >
                  −
                </button>
                <button
                  type="button"
                  className="increase"
                  aria-label="Increase quantity"
                  onClick={() => handleIncrease(idx)}
                >
                  +
                </button>
                <button
                  type="button"
                  className="remove"
                  aria-label="Remove item"
                  onClick={() => handleRemove(idx)}
                >
                  <i className="fas fa-trash" />
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div id="cart-summary" className="cart-summary">
          <p className="summary-total">
            <strong>Total:</strong> {formatMoney(total)}
          </p>
          <button type="button" className="cta-button">Proceed to Checkout</button>
        </div>
      </main>
    </div>
  );
}
