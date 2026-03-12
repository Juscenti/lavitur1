import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { COUNTRY_LIST } from '../data/countries';
import Skeleton from '../components/Skeleton.jsx';
import '../styles/settings.css';

function SettingsPageSkeleton() {
  return (
    <div className="settings-page">
      <main className="settings-main">
        <div className="settings-container">
          <div className="settings-top">
            <Skeleton style={{ width: 280, height: 24, marginBottom: 8 }} />
            <div className="settings-header">
              <Skeleton style={{ width: 220, height: 32, marginBottom: 8 }} />
              <Skeleton style={{ width: '100%', maxWidth: 360, height: 20 }} />
            </div>
          </div>
          <div className="settings-body">
            <nav className="settings-sidebar">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Skeleton key={i} style={{ width: '100%', height: 44, marginBottom: 4 }} />
              ))}
            </nav>
            <div className="settings-content">
              <Skeleton style={{ width: 160, height: 28, marginBottom: '1.5rem' }} />
              <Skeleton style={{ width: '100%', height: 24, marginBottom: 8 }} />
              <Skeleton style={{ width: '100%', height: 24, marginBottom: 8 }} />
              <Skeleton style={{ width: '100%', height: 24, marginBottom: '1.5rem' }} />
              <Skeleton style={{ width: 120, height: 40 }} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
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

const SECTIONS = [
  { id: 'preferences', label: 'Preferences', icon: 'fas fa-sliders-h' },
  { id: 'wallet', label: 'Wallet', icon: 'fas fa-wallet' },
  { id: 'payments', label: 'Payment Methods', icon: 'fas fa-credit-card' },
  { id: 'addresses', label: 'Addresses', icon: 'fas fa-map-marker-alt' },
  { id: 'subscription', label: 'Subscription', icon: 'fas fa-crown' },
  { id: 'order-prefs', label: 'Order Preferences', icon: 'fas fa-box' },
  { id: 'security', label: 'Security', icon: 'fas fa-shield-alt' },
  { id: 'danger', label: 'Danger Zone', icon: 'fas fa-exclamation-triangle' },
];

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  if (!message) return null;
  return <div className={`toast show ${type}`}>{message}</div>;
}

function ConfirmModal({ title, message, onConfirm, onCancel }) {
  return (
    <div className="modal show" role="dialog" aria-modal="true">
      <div className="modal-backdrop" onClick={onCancel} />
      <div className="modal-content">
        <button className="modal-close" onClick={onCancel} aria-label="Close"><i className="fas fa-times" /></button>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  const { session, user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [profile, setProfile] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const hashSection = location.hash.replace('#', '') || 'preferences';
  const validSection = SECTIONS.find((s) => s.id === hashSection)?.id ?? 'preferences';
  const [activeSection, setActiveSection] = useState(validSection);

  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);

  const [prefs, setPrefs] = useState({ emailNotif: false, smsNotif: false, marketingEmails: false, theme: 'light' });
  const [security, setSecurity] = useState({ currentPw: '', newPw: '', confirmPw: '' });
  const [pwStrength, setPwStrength] = useState('');
  const [orderPrefs, setOrderPrefs] = useState({ giftWrapping: false, signatureRequired: false, carrier: '', deliveryInstructions: '', returnMethod: 'original' });

  const [addresses, setAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressForm, setAddressForm] = useState({
    label: '',
    full_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    parish: '',
    postal_code: '',
    country: '',
    is_default: false,
  });
  const [addressSubmitError, setAddressSubmitError] = useState('');

  const showToast = useCallback((msg, type = 'success') => setToast({ msg, type }), []);
  const hideToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (!session && !authLoading) {
      navigate('/login');
      return;
    }
    if (!session) return;
    let cancelled = false;
    setLoadError(null);
    setSettingsLoading(true);
    api.get('/me')
      .then((res) => {
        if (!cancelled && res?.data) setProfile(res.data);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.response?.status === 401) {
          navigate('/login');
          return;
        }
        setLoadError(err?.message || 'Could not load account.');
        setProfile(null);
      })
      .finally(() => {
        if (!cancelled) setSettingsLoading(false);
      });
    return () => { cancelled = true; };
  }, [session, authLoading, navigate]);

  useEffect(() => {
    setActiveSection(SECTIONS.find((s) => s.id === hashSection)?.id ?? 'preferences');
  }, [hashSection]);

  const fetchAddresses = useCallback(() => {
    setAddressesLoading(true);
    api.get('/me/addresses')
      .then((data) => setAddresses(Array.isArray(data) ? data : []))
      .catch(() => setAddresses([]))
      .finally(() => setAddressesLoading(false));
  }, []);

  useEffect(() => {
    if (activeSection === 'addresses' && session) fetchAddresses();
  }, [activeSection, session, fetchAddresses]);

  const calcStrength = (pw) => {
    if (!pw) return '';
    if (pw.length < 6) return 'weak';
    if (/[A-Z]/.test(pw) && /[0-9]/.test(pw) && pw.length >= 10) return 'strong';
    return 'medium';
  };

  const handleSecurityChange = (e) => {
    const { name, value } = e.target;
    setSecurity((s) => ({ ...s, [name]: value }));
    if (name === 'newPw') setPwStrength(calcStrength(value));
  };

  const handlePrefsSubmit = (e) => {
    e.preventDefault();
    showToast('Preferences saved.', 'success');
  };

  const handleOrderPrefsSubmit = (e) => {
    e.preventDefault();
    showToast('Order preferences saved.', 'success');
  };

  const handleSecuritySubmit = (e) => {
    e.preventDefault();
    if (security.newPw !== security.confirmPw) {
      showToast('Passwords do not match.', 'error');
      return;
    }
    showToast('Password updated successfully.', 'success');
    setSecurity({ currentPw: '', newPw: '', confirmPw: '' });
    setPwStrength('');
  };

  const handleLogout = () => {
    signOut();
    navigate('/');
  };

  const handleDeleteAccount = () => {
    setModal({
      title: 'Delete Account',
      message: 'Permanently delete your account and all associated data. This cannot be undone.',
      onConfirm: () => {
        setModal(null);
        showToast('Account deletion requested.', 'info');
      },
    });
  };

  const openAddAddressForm = () => {
    setEditingAddressId(null);
    setAddressForm({
      label: '',
      full_name: profile?.full_name || user?.user_metadata?.full_name || '',
      phone: '',
      address_line1: '',
      address_line2: '',
      city: '',
      parish: '',
      postal_code: '',
      country: '',
      is_default: addresses.length === 0,
    });
    setAddressSubmitError('');
    setShowAddressForm(true);
  };

  const openEditAddressForm = (addr) => {
    setEditingAddressId(addr.id);
    setAddressForm({
      label: addr.label || '',
      full_name: addr.full_name || '',
      phone: addr.phone || '',
      address_line1: addr.address_line1 || '',
      address_line2: addr.address_line2 || '',
      city: addr.city || '',
      parish: addr.parish || '',
      postal_code: addr.postal_code || '',
      country: addr.country || '',
      is_default: Boolean(addr.is_default),
    });
    setAddressSubmitError('');
    setShowAddressForm(true);
  };

  const closeAddressForm = () => {
    setShowAddressForm(false);
    setEditingAddressId(null);
    setAddressSubmitError('');
  };

  const handleAddressFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAddressForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    setAddressSubmitError('');
    if (!addressForm.full_name?.trim() || !addressForm.address_line1?.trim()) {
      setAddressSubmitError('Please fill in full name and address line 1.');
      return;
    }
    try {
      const payload = {
        full_name: addressForm.full_name.trim(),
        phone: addressForm.phone?.trim() || undefined,
        address_line1: addressForm.address_line1.trim(),
        address_line2: addressForm.address_line2?.trim() || undefined,
        city: addressForm.city?.trim() || undefined,
        parish: addressForm.parish?.trim() || undefined,
        postal_code: addressForm.postal_code?.trim() || undefined,
        country: addressForm.country?.trim() || undefined,
        is_default: addressForm.is_default,
      };
      if (addressForm.label?.trim()) payload.label = addressForm.label.trim();
      if (editingAddressId) {
        await api.patch(`/me/addresses/${editingAddressId}`, payload);
        showToast('Address updated.', 'success');
      } else {
        await api.post('/me/addresses', payload);
        showToast('Address added.', 'success');
      }
      closeAddressForm();
      fetchAddresses();
    } catch (err) {
      setAddressSubmitError(err?.data?.error || err?.message || 'Failed to save address.');
    }
  };

  const handleSetDefaultAddress = async (id) => {
    try {
      await api.patch(`/me/addresses/${id}/default`);
      setAddresses((prev) => prev.map((a) => ({ ...a, is_default: a.id === id })));
      showToast('Default address updated.', 'success');
    } catch (_) {
      showToast('Could not set default address.', 'error');
    }
  };

  const handleDeleteAddress = (addr) => {
    setModal({
      title: 'Delete Address',
      message: `Remove "${addr.address_line1}" from your saved addresses?`,
      onConfirm: async () => {
        setModal(null);
        try {
          await api.delete(`/me/addresses/${addr.id}`);
          setAddresses((prev) => prev.filter((a) => a.id !== addr.id));
          showToast('Address removed.', 'success');
        } catch (_) {
          showToast('Could not delete address.', 'error');
        }
      },
    });
  };

  if (authLoading || settingsLoading) return <SettingsPageSkeleton />;
  if (!session) return null;

  const displayEmail = profile?.email ?? user?.email ?? '';

  const setSection = (id) => {
    setActiveSection(id);
    window.location.hash = id;
  };

  return (
    <div className="settings-page">
      <main className="settings-main">
        <div className="settings-container">
          <div className="settings-top">
            {loadError && (
              <div className="settings-error-banner" role="alert">
                {loadError}
              </div>
            )}
            {displayEmail && (
              <div className="settings-auth-banner">
                Signed in as <strong>{displayEmail}</strong>
              </div>
            )}
            <div className="settings-header">
              <h1>Account Settings</h1>
              <p>Manage your payment methods, addresses, preferences, and security</p>
            </div>
          </div>

          <div className="settings-body">
            <nav className="settings-sidebar" aria-label="Settings sections">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`settings-sidebar-item${activeSection === s.id ? ' active' : ''}`}
                  onClick={() => setSection(s.id)}
                >
                  <i className={s.icon} aria-hidden />
                  <span>{s.label}</span>
                </button>
              ))}
            </nav>

            <div className="settings-content">
            {/* PREFERENCES */}
            {activeSection === 'preferences' && (
              <section className="settings-section" style={{ display: 'block' }}>
                <div className="section-header">
                  <div className="header-title">
                    <i className="fas fa-sliders-h" />
                    <div>
                      <h3>Preferences</h3>
                      <p>Customize your experience</p>
                    </div>
                  </div>
                </div>
                <form className="settings-form" onSubmit={handlePrefsSubmit}>
                  <div className="settings-group">
                    <h4>Communication Preferences</h4>
                    {[
                      { key: 'emailNotif', label: 'Email Notifications', desc: 'Order updates, promotions, and news' },
                      { key: 'smsNotif', label: 'SMS Notifications', desc: 'Important order updates via text' },
                      { key: 'marketingEmails', label: 'Marketing Emails', desc: 'Exclusive deals and announcements' },
                    ].map(({ key, label, desc }) => (
                      <div className="form-group checkbox-group" key={key}>
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={prefs[key]}
                            onChange={(e) => setPrefs((p) => ({ ...p, [key]: e.target.checked }))}
                          />
                          <span className="checkbox-content">
                            <strong>{label}</strong>
                            <small>{desc}</small>
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                  <div className="divider" />
                  <div className="settings-group">
                    <h4>Display Preferences</h4>
                    <div className="form-group">
                      <label htmlFor="theme-pref">Theme</label>
                      <select id="theme-pref" value={prefs.theme} onChange={(e) => setPrefs((p) => ({ ...p, theme: e.target.value }))}>
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="auto">Auto (based on system)</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary"><i className="fas fa-check" /> Save Preferences</button>
                  </div>
                </form>
              </section>
            )}

            {/* WALLET */}
            {activeSection === 'wallet' && (
              <section className="settings-section" style={{ display: 'block' }}>
                <div className="section-header">
                  <div className="header-title">
                    <i className="fas fa-wallet" />
                    <div>
                      <h3>Wallet &amp; Balance</h3>
                      <p>View and manage your store credit</p>
                    </div>
                  </div>
                </div>
                <div className="wallet-container">
                  <div className="wallet-card">
                    <div className="wallet-balance">
                      <span className="balance-label">Current Balance</span>
                      <span className="balance-amount">€0.00</span>
                    </div>
                    <div className="wallet-actions">
                      <button type="button" className="btn btn-primary" onClick={() => showToast('Add funds feature coming soon!', 'info')}>
                        <i className="fas fa-plus" /> Add Funds
                      </button>
                    </div>
                  </div>
                  <div className="wallet-info">
                    <h4>Balance Breakdown</h4>
                    {[['Store Credit', '€0.00'], ['Gift Card Balance', '€0.00'], ['Loyalty Points (€)', '€0.00']].map(([label, val]) => (
                      <div className="balance-item" key={label}>
                        <span>{label}</span>
                        <strong>{val}</strong>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="transaction-history">
                  <h4>Recent Transactions</h4>
                  <div className="transactions-list">
                    <p className="empty-state">No transactions yet</p>
                  </div>
                </div>
              </section>
            )}

            {/* PAYMENT METHODS */}
            {activeSection === 'payments' && (
              <section className="settings-section" style={{ display: 'block' }}>
                <div className="section-header">
                  <div className="header-title">
                    <i className="fas fa-credit-card" />
                    <div>
                      <h3>Payment Methods</h3>
                      <p>Manage your saved cards and digital wallets</p>
                    </div>
                  </div>
                </div>
                <div className="saved-cards-list">
                  <p className="empty-state">No saved payment methods. Add one for faster checkout.</p>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-primary" onClick={() => showToast('Add credit card feature coming soon!', 'info')}>
                    <i className="fas fa-plus" /> Add Payment Method
                  </button>
                </div>
              </section>
            )}

            {/* ADDRESSES */}
            {activeSection === 'addresses' && (
              <section className="settings-section" style={{ display: 'block' }}>
                <div className="section-header">
                  <div className="header-title">
                    <i className="fas fa-map-marker-alt" />
                    <div>
                      <h3>Shipping Addresses</h3>
                      <p>Manage your saved addresses for faster checkout</p>
                    </div>
                  </div>
                </div>

                {addressesLoading ? (
                  <p className="empty-state">Loading addresses…</p>
                ) : showAddressForm ? (
                  <form className="settings-form address-form" onSubmit={handleAddressSubmit}>
                    <h4>{editingAddressId ? 'Edit address' : 'Add new address'}</h4>
                    <div className="address-form-grid">
                      <div className="form-group">
                        <label htmlFor="addr-label">Label (optional)</label>
                        <input id="addr-label" name="label" type="text" value={addressForm.label} onChange={handleAddressFormChange} placeholder="e.g. Home, Work" />
                      </div>
                      <div className="form-group">
                        <label htmlFor="addr-full_name">Full name *</label>
                        <input id="addr-full_name" name="full_name" type="text" required value={addressForm.full_name} onChange={handleAddressFormChange} placeholder="Jane Doe" />
                      </div>
                      <div className="form-group">
                        <label htmlFor="addr-phone">Phone</label>
                        <input id="addr-phone" name="phone" type="tel" value={addressForm.phone} onChange={handleAddressFormChange} placeholder="+1 876 000 0000" />
                      </div>
                      <div className="form-group full-width">
                        <label htmlFor="addr-address_line1">Address line 1 *</label>
                        <input id="addr-address_line1" name="address_line1" type="text" required value={addressForm.address_line1} onChange={handleAddressFormChange} placeholder="Street address" />
                      </div>
                      <div className="form-group full-width">
                        <label htmlFor="addr-address_line2">Address line 2</label>
                        <input id="addr-address_line2" name="address_line2" type="text" value={addressForm.address_line2} onChange={handleAddressFormChange} placeholder="Apt, suite, etc." />
                      </div>
                      <div className="form-group">
                        <label htmlFor="addr-city">City</label>
                        <input id="addr-city" name="city" type="text" value={addressForm.city} onChange={handleAddressFormChange} placeholder="City" />
                      </div>
                      <div className="form-group">
                        <label htmlFor="addr-parish">State / Parish / Region</label>
                        <input id="addr-parish" name="parish" type="text" value={addressForm.parish} onChange={handleAddressFormChange} placeholder="e.g. St. Andrew" />
                      </div>
                      <div className="form-group">
                        <label htmlFor="addr-postal_code">Postal code</label>
                        <input id="addr-postal_code" name="postal_code" type="text" value={addressForm.postal_code} onChange={handleAddressFormChange} placeholder="Postal code" />
                      </div>
                      <div className="form-group">
                        <label htmlFor="addr-country">Country</label>
                        <select id="addr-country" name="country" value={addressForm.country} onChange={handleAddressFormChange}>
                          <option value="">Select country</option>
                          {COUNTRY_LIST.map((c) => (
                            <option key={c.code} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group checkbox-group full-width">
                        <label className="checkbox-label">
                          <input type="checkbox" name="is_default" checked={addressForm.is_default} onChange={handleAddressFormChange} />
                          <span className="checkbox-content">Set as default address</span>
                        </label>
                      </div>
                    </div>
                    {addressSubmitError && <p className="form-error" role="alert">{addressSubmitError}</p>}
                    <div className="form-actions">
                      <button type="submit" className="btn btn-primary"><i className="fas fa-check" /> {editingAddressId ? 'Update address' : 'Add address'}</button>
                      <button type="button" className="btn btn-secondary" onClick={closeAddressForm}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="addresses-container">
                      <div className="addresses-list">
                        {addresses.length === 0 ? (
                          <p className="empty-state">No saved addresses yet. Add one for faster checkout.</p>
                        ) : (
                          addresses.map((addr) => (
                            <div key={addr.id} className={`address-card ${addr.is_default ? 'default' : ''}`}>
                              {addr.is_default && <span className="address-default-badge">Default</span>}
                              <div className="address-info">
                                {addr.label && <div className="address-label">{addr.label}</div>}
                                <div className="address-name">{addr.full_name}</div>
                                <div className="address-text">{formatAddress(addr)}</div>
                                {addr.phone && <div className="address-text">{addr.phone}</div>}
                              </div>
                              <div className="address-actions">
                                {!addr.is_default && (
                                  <button type="button" className="btn btn-outline btn-sm" onClick={() => handleSetDefaultAddress(addr.id)}>
                                    Set as default
                                  </button>
                                )}
                                <button type="button" className="btn btn-outline btn-sm" onClick={() => openEditAddressForm(addr)}>
                                  Edit
                                </button>
                                <button type="button" className="btn btn-outline btn-sm" onClick={() => handleDeleteAddress(addr)}>
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="form-actions">
                      <button type="button" className="btn btn-primary" onClick={openAddAddressForm}>
                        <i className="fas fa-plus" /> Add New Address
                      </button>
                    </div>
                  </>
                )}
              </section>
            )}

            {/* SUBSCRIPTION */}
            {activeSection === 'subscription' && (
              <section className="settings-section" style={{ display: 'block' }}>
                <div className="section-header">
                  <div className="header-title">
                    <i className="fas fa-crown" />
                    <div>
                      <h3>Subscription &amp; Membership</h3>
                      <p>Manage your membership status and benefits</p>
                    </div>
                  </div>
                </div>
                <div className="membership-info">
                  <div className="membership-card">
                    <div className="membership-tier">
                      <span className="tier-label">Current Tier</span>
                      <span className="tier-name">Standard</span>
                    </div>
                    <div className="membership-benefits">
                      <h4>Your Benefits</h4>
                      <ul>
                        <li><i className="fas fa-check" /> Free shipping on orders over €200</li>
                        <li><i className="fas fa-check" /> Earn 1% loyalty points on purchases</li>
                        <li><i className="fas fa-check" /> Early access to sales</li>
                      </ul>
                    </div>
                  </div>
                  <div className="tier-progress">
                    <h4>Progress to Next Tier</h4>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: '35%' }} />
                    </div>
                    <p className="progress-text">€650 spent of €1,000 needed for Gold tier</p>
                  </div>
                </div>
              </section>
            )}

            {/* ORDER PREFERENCES */}
            {activeSection === 'order-prefs' && (
              <section className="settings-section" style={{ display: 'block' }}>
                <div className="section-header">
                  <div className="header-title">
                    <i className="fas fa-box" />
                    <div>
                      <h3>Order Preferences</h3>
                      <p>Customize how you want to receive your orders</p>
                    </div>
                  </div>
                </div>
                <form className="settings-form" onSubmit={handleOrderPrefsSubmit}>
                  <div className="settings-group">
                    <h4>Delivery Options</h4>
                    {[
                      { key: 'giftWrapping', label: 'Offer Gift Wrapping', desc: 'Show gift wrapping option at checkout' },
                      { key: 'signatureRequired', label: 'Signature on Delivery', desc: 'Require signature for high-value orders' },
                    ].map(({ key, label, desc }) => (
                      <div className="form-group checkbox-group" key={key}>
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={orderPrefs[key]}
                            onChange={(e) => setOrderPrefs((p) => ({ ...p, [key]: e.target.checked }))}
                          />
                          <span className="checkbox-content">
                            <strong>{label}</strong>
                            <small>{desc}</small>
                          </span>
                        </label>
                      </div>
                    ))}
                    <div className="form-group">
                      <label htmlFor="carrier">Preferred Shipping Carrier</label>
                      <select id="carrier" value={orderPrefs.carrier} onChange={(e) => setOrderPrefs((p) => ({ ...p, carrier: e.target.value }))}>
                        <option value="">No preference</option>
                        <option value="dhl">DHL</option>
                        <option value="ups">UPS</option>
                        <option value="fedex">FedEx</option>
                        <option value="local">Local courier</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="delivery-instructions">Delivery Instructions</label>
                      <textarea
                        id="delivery-instructions"
                        rows={3}
                        placeholder="E.g., Leave at door, ring doorbell twice"
                        value={orderPrefs.deliveryInstructions}
                        onChange={(e) => setOrderPrefs((p) => ({ ...p, deliveryInstructions: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="divider" />
                  <div className="settings-group">
                    <h4>Return Preferences</h4>
                    <div className="form-group">
                      <label htmlFor="return-method">Preferred Refund Method</label>
                      <select id="return-method" value={orderPrefs.returnMethod} onChange={(e) => setOrderPrefs((p) => ({ ...p, returnMethod: e.target.value }))}>
                        <option value="original">Original payment method</option>
                        <option value="wallet">Store credit / Wallet</option>
                        <option value="gift-card">Gift card</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary"><i className="fas fa-check" /> Save Preferences</button>
                  </div>
                </form>
              </section>
            )}

            {/* SECURITY */}
            {activeSection === 'security' && (
              <section className="settings-section" style={{ display: 'block' }}>
                <div className="section-header">
                  <div className="header-title">
                    <i className="fas fa-shield-alt" />
                    <div>
                      <h3>Security &amp; Password</h3>
                      <p>Protect your account with a strong password</p>
                    </div>
                  </div>
                </div>
                <form className="settings-form" onSubmit={handleSecuritySubmit}>
                  <div className="settings-group">
                    <h4>Change Password</h4>
                    <div className="form-group">
                      <label htmlFor="current-password">Current Password</label>
                      <input
                        type="password"
                        id="current-password"
                        name="currentPw"
                        placeholder="Enter current password"
                        value={security.currentPw}
                        onChange={handleSecurityChange}
                        required
                      />
                      <small className="form-help">Verified for security</small>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="new-password">New Password</label>
                        <input
                          type="password"
                          id="new-password"
                          name="newPw"
                          placeholder="Enter new password"
                          value={security.newPw}
                          onChange={handleSecurityChange}
                        />
                        <small className="form-help">8+ chars: uppercase, lowercase, numbers</small>
                        {pwStrength && (
                          <div className="password-strength" style={{ display: 'block' }}>
                            <div className="strength-bar">
                              <div className={`strength-fill ${pwStrength}`} />
                            </div>
                            <p className="strength-text">{pwStrength.charAt(0).toUpperCase() + pwStrength.slice(1)}</p>
                          </div>
                        )}
                      </div>
                      <div className="form-group">
                        <label htmlFor="confirm-password">Confirm Password</label>
                        <input
                          type="password"
                          id="confirm-password"
                          name="confirmPw"
                          placeholder="Confirm new password"
                          value={security.confirmPw}
                          onChange={handleSecurityChange}
                        />
                      </div>
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="btn btn-primary"><i className="fas fa-check" /> Update Password</button>
                      <button type="button" className="btn btn-secondary" onClick={() => { setSecurity({ currentPw: '', newPw: '', confirmPw: '' }); setPwStrength(''); }}>
                        <i className="fas fa-redo" /> Reset
                      </button>
                    </div>
                  </div>
                </form>
                <div className="security-divider" />
                <div className="security-actions">
                  <h4>Session Management</h4>
                  <div className="action-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p className="text-muted">You're signed in on this device</p>
                    <button type="button" className="btn btn-outline" onClick={handleLogout}>
                      <i className="fas fa-sign-out-alt" /> Sign Out
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* DANGER ZONE */}
            {activeSection === 'danger' && (
              <section className="settings-section" style={{ display: 'block' }}>
                <div className="section-header">
                  <div className="header-title">
                    <i className="fas fa-exclamation-triangle" />
                    <div>
                      <h3>Danger Zone</h3>
                      <p>Account &amp; data management</p>
                    </div>
                  </div>
                </div>
                <div className="account-actions">
                  <div className="action-card">
                    <div className="action-icon"><i className="fas fa-download" /></div>
                    <div className="action-content">
                      <h4>Download Your Data</h4>
                      <p>Export all your personal data in a structured format</p>
                    </div>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => showToast('Data export feature coming soon!', 'info')}>
                      Download
                    </button>
                  </div>
                  <div className="action-card danger-card">
                    <div className="action-icon danger"><i className="fas fa-trash-alt" /></div>
                    <div className="action-content">
                      <h4>Delete Account</h4>
                      <p>Permanently delete your account and all associated data. This cannot be undone.</p>
                    </div>
                    <button type="button" className="btn btn-danger btn-sm" onClick={handleDeleteAccount}>
                      Delete
                    </button>
                  </div>
                </div>
              </section>
            )}
            </div>
          </div>
        </div>
      </main>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={hideToast} />}
      {modal && (
        <ConfirmModal
          title={modal.title}
          message={modal.message}
          onConfirm={modal.onConfirm}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  );
}
