import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import '../styles/wishlist.css';

function formatMoney(amount, currency = 'JMD') {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(amount ?? 0));
}

export default function Wishlist() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    api.get('/me/wishlist')
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => {
        try {
          const raw = localStorage.getItem('lavitur_wishlist');
          const parsed = raw ? JSON.parse(raw) : [];
          setItems(Array.isArray(parsed) ? parsed.filter((i) => i && typeof i === 'object') : []);
        } catch {
          setItems([]);
        }
      })
      .finally(() => setLoading(false));
  }, [user]);

  const removeAtIndex = async (index) => {
    const item = items[index];
    if (!item) return;
    const rowId = item.id;
    const productId = item.product_id;
    try {
      if (rowId) {
        await api.delete('/me/wishlist/' + encodeURIComponent(rowId));
      } else if (productId) {
        await api.delete('/me/wishlist/product/' + encodeURIComponent(productId));
      }
      const next = [...items];
      next.splice(index, 1);
      setItems(next);
    } catch (_) {}
  };

  if (!user) {
    return (
      <div className="wishlist-page">
        <main className="wishlist-container">
          <h1>Your Wishlist</h1>
          <div className="wishlist-empty wishlist-sign-in">
            <p>Sign in to view and manage your wishlist.</p>
            <Link to="/login" className="shop-link">Sign in</Link>
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="wishlist-page">
        <main className="wishlist-container">
          <h1>Your Wishlist</h1>
          <p className="wishlist-loading">Loading your wishlist…</p>
        </main>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="wishlist-page">
        <main className="wishlist-container">
          <h1>Your Wishlist</h1>
          <div className="wishlist-empty">
            <p>Your wishlist is empty.</p>
            <p className="empty-sub">Save pieces you love while you browse.</p>
            <Link to="/shop" className="shop-link">Discover the Collection</Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="wishlist-page">
      <main className="wishlist-container">
        <h1>Your Wishlist</h1>
        <ul id="wishlist-items" className="wishlist-items">
          {items.map((item, idx) => (
            <li key={item.id ?? item.product_id ?? idx} className="wishlist-item">
              <Link
                to={(item.product_id || item.id) ? `/shop/${encodeURIComponent(item.product_id || item.id)}` : '/shop'}
                className="wishlist-item-link"
              >
                <img
                  src={item.image_url || item.image || '/images/placeholder.jpg'}
                  alt={item.title || item.name || 'Product'}
                />
                <div className="info">
                  <h3>{item.title || item.name || 'Untitled'}</h3>
                  <p>{formatMoney(item.price)}</p>
                </div>
              </Link>
              <button
                type="button"
                className="remove-btn"
                aria-label="Remove from wishlist"
                onClick={() => removeAtIndex(idx)}
              >
                <i className="fas fa-trash" />
              </button>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
