import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { COUNTRY_LIST } from '../data/countries';
import Skeleton from '../components/Skeleton.jsx';
import '../styles/checkout.css';

function CheckoutPageSkeleton() {
  return (
    <div className="checkout-page">
      <header className="checkout-hero">
        <div className="checkout-hero-inner">
          <Skeleton style={{ width: 140, height: 32, background: 'rgba(255,255,255,0.2)' }} />
          <Skeleton style={{ width: 180, height: 20, background: 'rgba(255,255,255,0.15)' }} />
        </div>
      </header>
      <main className="checkout-container has-hero">
        <Skeleton style={{ width: 120, height: 22, marginBottom: '1.5rem' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '2rem', alignItems: 'start' }}>
          <div>
            <Skeleton style={{ width: 180, height: 26, marginBottom: '1.5rem' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} style={{ width: '100%', height: 44 }} />
              ))}
            </div>
          </div>
          <aside className="checkout-summary">
            <Skeleton style={{ width: 140, height: 26, marginBottom: '1rem' }} />
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center' }}>
                <Skeleton style={{ width: 56, height: 56, flexShrink: 0 }} />
                <Skeleton style={{ flex: 1, height: 20 }} />
                <Skeleton style={{ width: 60, height: 20 }} />
              </div>
            ))}
            <Skeleton style={{ width: '100%', height: 40, marginTop: 16, marginBottom: 16 }} />
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

function formatAddress(addr) {
  const parts = [
    addr.address_line1,
    addr.address_line2,
    [addr.city, addr.parish, addr.postal_code].filter(Boolean).join(', '),
    addr.country,
  ].filter(Boolean);
  return parts.join(' · ');
}

export default function Checkout() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [placed, setPlaced] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  const [saveNewAddress, setSaveNewAddress] = useState(false);
  const [setNewAsDefault, setSetNewAsDefault] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: user?.email ?? '',
    phone: '',
    address: '',
    addressLine2: '',
    city: '',
    parish: '',
    postalCode: '',
    country: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [discountInput, setDiscountInput] = useState('');
  const [discountLoading, setDiscountLoading] = useState(false);
  const [discountError, setDiscountError] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(null);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setAddresses([]);
      setLoading(false);
      return;
    }
    Promise.all([
      api.get('/me/cart').catch(() => []),
      api.get('/me/addresses').catch(() => []),
    ])
      .then(([cartData, addressesData]) => {
        setItems(Array.isArray(cartData) ? cartData : []);
        const list = Array.isArray(addressesData) ? addressesData : [];
        setAddresses(list);
        if (list.length > 0 && !useNewAddress) {
          const defaultAddr = list.find((a) => a.is_default) || list[0];
          setSelectedAddressId(defaultAddr.id);
          setForm((f) => ({
            ...f,
            fullName: defaultAddr.full_name || f.fullName,
            email: user?.email ?? f.email,
            phone: defaultAddr.phone || f.phone,
            address: defaultAddr.address_line1 || f.address,
            addressLine2: defaultAddr.address_line2 || '',
            city: defaultAddr.city || f.city,
            parish: defaultAddr.parish || '',
            postalCode: defaultAddr.postal_code || f.postalCode,
            country: defaultAddr.country || '',
          }));
        }
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (user?.email) setForm((f) => ({ ...f, email: user.email }));
  }, [user?.email]);

  useEffect(() => {
    if (!useNewAddress && selectedAddressId) {
      const addr = addresses.find((a) => a.id === selectedAddressId);
      if (addr) {
        setForm((f) => ({
          ...f,
          fullName: addr.full_name || f.fullName,
          phone: addr.phone || '',
          address: addr.address_line1 || '',
          addressLine2: addr.address_line2 || '',
          city: addr.city || '',
          parish: addr.parish || '',
          postalCode: addr.postal_code || '',
          country: addr.country || '',
        }));
      }
    }
  }, [selectedAddressId, useNewAddress, addresses]);

  const subtotal = items.reduce((sum, i) => sum + (Number(i.price) || 0) * (i.quantity || 1), 0);
  const discountAmount = appliedDiscount ? Number(appliedDiscount.discount_amount) || 0 : 0;
  const total = Math.max(0, Number((subtotal - discountAmount).toFixed(2)));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleApplyDiscount = async (e) => {
    e.preventDefault();
    setDiscountError('');
    const code = discountInput.trim();
    if (!code) {
      setDiscountError('Enter a discount code.');
      return;
    }
    setDiscountLoading(true);
    try {
      const res = await api.post('/me/discount/validate', { code, subtotal });
      if (res.valid && res.discount_code_id) {
        setAppliedDiscount({
          discount_code_id: res.discount_code_id,
          code: res.code,
          discount_amount: res.discount_amount,
        });
        setDiscountError('');
      } else {
        setAppliedDiscount(null);
        setDiscountError(res.message || 'Invalid or expired code.');
      }
    } catch (err) {
      setAppliedDiscount(null);
      setDiscountError(err?.message || 'Could not validate code.');
    } finally {
      setDiscountLoading(false);
    }
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    setDiscountInput('');
    setDiscountError('');
  };

  const handleSetDefault = async (id) => {
    try {
      await api.patch(`/me/addresses/${id}/default`);
      setAddresses((prev) =>
        prev.map((a) => ({ ...a, is_default: a.id === id }))
      );
    } catch (_) {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (items.length === 0) {
      setError('Your cart is empty.');
      return;
    }
    if (!form.fullName?.trim() || !form.email?.trim() || !form.address?.trim()) {
      setError('Please fill in name, email, and address.');
      return;
    }
    if (!form.country?.trim()) {
      setError('Please select a country.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/me/orders', {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone?.trim() || undefined,
        address: form.address.trim(),
        addressLine2: form.addressLine2?.trim() || undefined,
        city: form.city?.trim() || undefined,
        parish: form.parish?.trim() || undefined,
        postalCode: form.postalCode?.trim() || undefined,
        country: form.country?.trim() || undefined,
        discount_code_id: appliedDiscount?.discount_code_id || undefined,
      });
      if (saveNewAddress && useNewAddress) {
        try {
          await api.post('/me/addresses', {
            full_name: form.fullName.trim(),
            phone: form.phone?.trim() || undefined,
            address_line1: form.address.trim(),
            address_line2: form.addressLine2?.trim() || undefined,
            city: form.city?.trim() || undefined,
            parish: form.parish?.trim() || undefined,
            country: form.country?.trim() || undefined,
            postal_code: form.postalCode?.trim() || undefined,
            is_default: setNewAsDefault,
          });
        } catch (_) {}
      }
      setPlaced(true);
    } catch (err) {
      const msg = err?.data?.error || err?.message || 'Something went wrong. Please try again.';
      const message = err?.status === 404
        ? 'Checkout service not found (404). Make sure the backend is running and has the latest code.'
        : msg;
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="checkout-page">
        <main className="checkout-container">
          <h1>Checkout</h1>
          <div className="checkout-empty">
            <p>Sign in to checkout.</p>
            <Link to="/login" className="checkout-btn">Sign in</Link>
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return <CheckoutPageSkeleton />;
  }

  if (placed) {
    return (
      <div className="checkout-page">
        <main className="checkout-container checkout-success-wrap">
          <div className="checkout-success">
            <h1>Thank you</h1>
            <p className="checkout-success-lead">Your order has been received.</p>
            <p className="checkout-success-sub">We&apos;ll send a confirmation to your email shortly.</p>
            <Link to="/shop" className="checkout-btn">Continue shopping</Link>
          </div>
        </main>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="checkout-page">
        <main className="checkout-container">
          <h1>Checkout</h1>
          <div className="checkout-empty">
            <p>Your cart is empty.</p>
            <Link to="/shop" className="checkout-btn">Shop now</Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <header className="checkout-hero">
        <div className="checkout-hero-inner">
          <h1>Checkout</h1>
          <nav className="checkout-breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span aria-hidden="true"> / </span>
            <Link to="/cart">Cart</Link>
            <span aria-hidden="true"> / </span>
            <span>Checkout</span>
          </nav>
        </div>
      </header>

      <main className="checkout-container has-hero">
        <div className="checkout-top-actions">
          <Link to="/cart" className="checkout-back">← Back to cart</Link>
        </div>
        <form id="checkout-form-id" className="checkout-form" onSubmit={handleSubmit}>
          <section className="checkout-section checkout-section-delivery">
            <h2 className="checkout-section-title">Delivery details</h2>

            {addresses.length > 0 && (
              <div className="checkout-addresses">
                <p className="checkout-addresses-label">Saved addresses</p>
                <div className="checkout-address-list">
                  {addresses.map((addr) => (
                    <label key={addr.id} className={`checkout-address-card ${selectedAddressId === addr.id && !useNewAddress ? 'is-selected' : ''}`}>
                      <input
                        type="radio"
                        name="deliveryAddress"
                        checked={selectedAddressId === addr.id && !useNewAddress}
                        onChange={() => {
                          setUseNewAddress(false);
                          setEditingAddress(false);
                          setSelectedAddressId(addr.id);
                        }}
                      />
                      <span className="checkout-address-card-content">
                        {addr.is_default && <span className="checkout-address-badge">Default</span>}
                        {addr.label && <span className="checkout-address-label">{addr.label}</span>}
                        <strong>{addr.full_name}</strong>
                        <span className="checkout-address-text">{formatAddress(addr)}</span>
                        {addr.phone && <span className="checkout-address-text">{addr.phone}</span>}
                      </span>
                      <div className="checkout-address-card-actions">
                        {selectedAddressId === addr.id && !useNewAddress && (
                          <button
                            type="button"
                            className="checkout-address-edit"
                            onClick={(e) => { e.preventDefault(); setEditingAddress(true); }}
                          >
                            Edit
                          </button>
                        )}
                        {!addr.is_default && (
                          <button
                            type="button"
                            className="checkout-address-set-default"
                            onClick={(e) => { e.preventDefault(); handleSetDefault(addr.id); }}
                          >
                            Set as default
                          </button>
                        )}
                      </div>
                    </label>
                  ))}
                  <label className={`checkout-address-card checkout-address-card-new ${useNewAddress ? 'is-selected' : ''}`}>
                    <input
                      type="radio"
                      name="deliveryAddress"
                      checked={useNewAddress}
                      onChange={() => { setUseNewAddress(true); setEditingAddress(false); }}
                    />
                    <span className="checkout-address-card-content">+ Add new address</span>
                  </label>
                </div>
              </div>
            )}

            {/* Address form: only when no saved addresses, or user chose "Add new address", or "Edit" on selected address */}
            {(addresses.length === 0 || useNewAddress || editingAddress) && (
              <div className="checkout-fields-wrap">
                {editingAddress && (
                  <div className="checkout-edit-hint-row">
                    <p className="checkout-edit-hint">Editing delivery address. Changes apply to this order.</p>
                    <button
                      type="button"
                      className="checkout-edit-done"
                      onClick={() => setEditingAddress(false)}
                    >
                      Use selected address
                    </button>
                  </div>
                )}
                <div className="checkout-fields">
              <div className="checkout-field">
                <label htmlFor="checkout-fullName">Full name *</label>
                <input
                  id="checkout-fullName"
                  name="fullName"
                  type="text"
                  required
                  value={form.fullName}
                  onChange={handleChange}
                  placeholder="Jane Doe"
                />
              </div>
              <div className="checkout-field">
                <label htmlFor="checkout-email">Email *</label>
                <input
                  id="checkout-email"
                  name="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  placeholder="jane@example.com"
                />
              </div>
              <div className="checkout-field">
                <label htmlFor="checkout-phone">Phone</label>
                <input
                  id="checkout-phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+1 876 000 0000"
                />
              </div>
              <div className="checkout-field checkout-field-full">
                <label htmlFor="checkout-address">Address line 1 *</label>
                <input
                  id="checkout-address"
                  name="address"
                  type="text"
                  required
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Street address"
                />
              </div>
              <div className="checkout-field checkout-field-full">
                <label htmlFor="checkout-addressLine2">Address line 2</label>
                <input
                  id="checkout-addressLine2"
                  name="addressLine2"
                  type="text"
                  value={form.addressLine2}
                  onChange={handleChange}
                  placeholder="Apt, suite, etc."
                />
              </div>
              <div className="checkout-field">
                <label htmlFor="checkout-city">City</label>
                <input
                  id="checkout-city"
                  name="city"
                  type="text"
                  value={form.city}
                  onChange={handleChange}
                  placeholder="Kingston"
                />
              </div>
              <div className="checkout-field">
                <label htmlFor="checkout-parish">Parish / State</label>
                <input
                  id="checkout-parish"
                  name="parish"
                  type="text"
                  value={form.parish}
                  onChange={handleChange}
                  placeholder="e.g. St. Andrew"
                />
              </div>
              <div className="checkout-field">
                <label htmlFor="checkout-postalCode">Postal code</label>
                <input
                  id="checkout-postalCode"
                  name="postalCode"
                  type="text"
                  value={form.postalCode}
                  onChange={handleChange}
                  placeholder="JM12345"
                />
              </div>
              <div className="checkout-field">
                <label htmlFor="checkout-country">Country</label>
                <select
                  id="checkout-country"
                  name="country"
                  value={form.country}
                  onChange={handleChange}
                  aria-label="Country"
                >
                  <option value="">Select country</option>
                  {COUNTRY_LIST.map((c) => (
                    <option key={c.code} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {useNewAddress && (
              <div className="checkout-save-address">
                <label className="checkout-checkbox">
                  <input
                    type="checkbox"
                    checked={saveNewAddress}
                    onChange={(e) => setSaveNewAddress(e.target.checked)}
                  />
                  <span>Save this address for next time</span>
                </label>
                {saveNewAddress && (
                  <label className="checkout-checkbox checkout-checkbox-sub">
                    <input
                      type="checkbox"
                      checked={setNewAsDefault}
                      onChange={(e) => setSetNewAsDefault(e.target.checked)}
                    />
                    <span>Set as my default address</span>
                  </label>
                )}
              </div>
            )}
              </div>
            )}
          </section>

          {error && <p className="checkout-error" role="alert">{error}</p>}
        </form>

        <aside className="checkout-summary">
          <h2 className="checkout-summary-title">Order summary</h2>
          <ul className="checkout-items">
            {items.map((item, idx) => (
              <li key={idx} className="checkout-item">
                <img
                  src={item.image || item.image_url || '/images/placeholder.jpg'}
                  alt={item.name || item.title || ''}
                />
                <div className="checkout-item-info">
                  <span className="checkout-item-name">{item.name || item.title || 'Untitled'}</span>
                  <span className="checkout-item-qty">× {item.quantity || 1}</span>
                </div>
                <span className="checkout-item-price">
                  {formatMoney((Number(item.price) || 0) * (item.quantity || 1))}
                </span>
              </li>
            ))}
          </ul>

          <section className="checkout-discount">
            <h3 className="checkout-discount-title">Discount code</h3>
            {appliedDiscount ? (
              <div className="checkout-discount-applied">
                <span className="checkout-discount-code">{appliedDiscount.code}</span>
                <span className="checkout-discount-amount">−{formatMoney(appliedDiscount.discount_amount)}</span>
                <button type="button" className="checkout-discount-remove" onClick={handleRemoveDiscount}>
                  Remove
                </button>
              </div>
            ) : (
              <form className="checkout-discount-form" onSubmit={handleApplyDiscount}>
                <input
                  type="text"
                  className="checkout-discount-input"
                  placeholder="Enter code"
                  value={discountInput}
                  onChange={(e) => { setDiscountInput(e.target.value.toUpperCase()); setDiscountError(''); }}
                  disabled={discountLoading}
                  aria-label="Discount code"
                />
                <button type="submit" className="checkout-discount-apply" disabled={discountLoading}>
                  {discountLoading ? 'Checking…' : 'Apply'}
                </button>
              </form>
            )}
            {discountError && <p className="checkout-discount-error" role="alert">{discountError}</p>}
          </section>

          <div className="checkout-totals">
            {discountAmount > 0 && (
              <div className="checkout-total-line checkout-total-subtotal">
                <span>Subtotal</span>
                <span>{formatMoney(subtotal)}</span>
              </div>
            )}
            <div className="checkout-total">
              <span>Total</span>
              <strong>{formatMoney(total)}</strong>
            </div>
          </div>
          <button
            type="submit"
            form="checkout-form-id"
            className="checkout-submit"
            disabled={submitting}
          >
            {submitting ? 'Placing order…' : 'Place order'}
          </button>
        </aside>
      </main>
    </div>
  );
}
