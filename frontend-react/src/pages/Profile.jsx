import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import '../styles/profile.css';

const SECTIONS = [
  { id: 'personal', label: 'Personal Info' },
  { id: 'orders', label: 'Order History' },
  { id: 'wishlist', label: 'Wishlist' },
  { id: 'addresses', label: 'Saved Addresses' },
  { id: 'activity', label: 'Activity Timeline' },
  { id: 'loyalty', label: 'Loyalty & Tier' },
];

const USERNAME_RE = /^[a-zA-Z0-9._]+$/;

function formatMoney(amount) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'JMD' }).format(Number(amount ?? 0));
}

function EmptyState({ icon = 'fa-inbox', title, message }) {
  return (
    <div className="pf-empty">
      <i className={`fas ${icon} pf-empty-icon`} />
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  );
}

function OrdersList({ orders }) {
  if (!orders) return <div className="pf-loading">Loading your orders…</div>;
  if (orders.length === 0) return <EmptyState title="No Orders Yet" message="Start shopping to see your orders here." />;
  return (
    <div className="pf-orders">
      {orders.map((order) => {
        const statusClass = {
          delivered: 'pf-status--delivered',
          shipped: 'pf-status--shipped',
          processing: 'pf-status--processing',
          cancelled: 'pf-status--cancelled',
        }[order.status] ?? 'pf-status--pending';
        return (
          <div key={order.id} className="pf-order-card">
            <div className="pf-order-header">
              <div>
                <div className="pf-order-id">#{(order.id || '').slice(0, 8).toUpperCase()}</div>
                <div className="pf-order-date">{new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
              </div>
              <span className={`pf-order-status ${statusClass}`}>{order.status}</span>
            </div>
            <div className="pf-order-total">{formatMoney(order.total || 0)}</div>
            <div className="pf-order-items">{order.items_count || 0} item{order.items_count !== 1 ? 's' : ''}</div>
          </div>
        );
      })}
    </div>
  );
}

function WishlistSection({ items }) {
  const [sortOrder, setSortOrder] = useState('newest');

  if (!items) return <div className="pf-loading">Loading your wishlist…</div>;
  if (items.length === 0) return <EmptyState icon="fa-heart" title="Your Wishlist is Empty" message="Add items to your wishlist to save them for later." />;

  const sorted = [...items].sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    return sortOrder === 'newest' ? bTime - aTime : aTime - bTime;
  });

  return (
    <>
      <div className="pf-section-toolbar">
        <label className="pf-sort-label">
          Sort:
          <select
            className="pf-sort-select"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
      </div>
      <div className="pf-wishlist-grid">
        {sorted.map((item) => (
          <div key={item.id} className="pf-wishlist-item">
            <img src={item.image || '/images/placeholder.jpg'} alt={item.name} />
            <div className="pf-wishlist-info">
              <h3>{item.name}</h3>
              <p>{formatMoney(item.price)}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function formatAddressLine(addr) {
  const parts = [
    addr.address_line1,
    addr.address_line2,
    [addr.city, addr.parish, addr.postal_code].filter(Boolean).join(', '),
    addr.country,
  ].filter(Boolean);
  return parts.join(' · ');
}

function AddressesSection({ addresses }) {
  if (!addresses) return <div className="pf-loading">Loading your addresses…</div>;
  if (addresses.length === 0) return <EmptyState icon="fa-map-marker-alt" title="No Saved Addresses" message="Add an address in settings to save it for faster checkout." />;
  return (
    <div className="pf-addresses">
      {addresses.map((addr) => (
        <div key={addr.id} className="pf-address-card">
          {addr.is_default && <span className="pf-address-badge">Default</span>}
          {addr.label && <div className="pf-address-type">{addr.label}</div>}
          <p>
            <strong>{addr.full_name}</strong><br />
            {formatAddressLine(addr)}
          </p>
          {addr.phone && <p className="pf-address-phone">{addr.phone}</p>}
        </div>
      ))}
    </div>
  );
}

function ActivitySection({ activities }) {
  if (!activities) return <div className="pf-loading">Loading your activity…</div>;
  if (activities.length === 0) return <EmptyState icon="fa-clock" title="No Activity Yet" message="Your recent activities will appear here." />;
  return (
    <div className="pf-activity">
      {activities.map((act, i) => (
        <div key={i} className="pf-activity-item">
          <div className="pf-activity-time">
            {new Date(act.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
            {' at '}
            {new Date(act.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <p>{act.description}</p>
        </div>
      ))}
    </div>
  );
}

function LoyaltySection({ loyalty, profile }) {
  const points = loyalty?.points ?? 0;
  const nextTierPoints = loyalty?.next_tier_points ?? 1000;
  const tierName = loyalty?.tier ?? 'Standard Member';
  const year = profile?.created_at ? new Date(profile.created_at).getFullYear() : '—';
  return (
    <div className="pf-loyalty">
      <div className="pf-loyalty-tier">
        <span className="pf-loyalty-icon">🏆</span>
        <div>
          <div className="pf-loyalty-tier-name">{tierName}</div>
          <p className="pf-loyalty-status">Member Status</p>
        </div>
      </div>
      <div className="pf-loyalty-stats">
        {[
          { label: 'Current Points', value: points },
          { label: 'Until Next Tier', value: Math.max(0, nextTierPoints - points) },
          { label: 'Member Since', value: year },
        ].map(({ label, value }) => (
          <div key={label} className="pf-loyalty-stat">
            <div className="pf-loyalty-stat-label">{label}</div>
            <div className="pf-loyalty-stat-value">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Profile() {
  const { user, session, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  const [section, setSection] = useState('personal');
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [saveError, setSaveError] = useState('');

  const [orders, setOrders] = useState(null);
  const [wishlist, setWishlist] = useState(null);
  const [addresses, setAddresses] = useState(null);
  const [activity, setActivity] = useState(null);
  const [loyalty, setLoyalty] = useState(null);

  const [avatarSrc, setAvatarSrc] = useState('/images/icons/default-avatar.png');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!session && !authLoading) {
      navigate('/login');
      return;
    }
    if (!session) return;

    setProfileLoading(true);

    api.get('/me').then((data) => {
      setProfile(data);
      setFullName(data?.full_name ?? '');
      setUsername(data?.username ?? '');
      setLoadError('');
      const picKey = `profilePicture:${session.user.id}`;
      const saved = localStorage.getItem(picKey);
      if (saved) setAvatarSrc(saved);
    }).catch((err) => {
      const status = err?.status ?? err?.response?.status;
      if (status === 401) {
        setProfileLoading(false);
        navigate('/login');
        return;
      }
      setLoadError(err?.data?.error || err?.message || 'Unable to load your profile. Please try again in a moment.');
    }).finally(() => {
      setProfileLoading(false);
    });

    api.get('/me/orders').then(setOrders).catch(() => setOrders([]));
    api.get('/me/wishlist').then(setWishlist).catch(() => setWishlist([]));
    api.get('/me/addresses').then(setAddresses).catch(() => setAddresses([]));
    api.get('/me/activity').then(setActivity).catch(() => setActivity([]));
    api.get('/me/loyalty').then(setLoyalty).catch(() => setLoyalty(null));
  }, [session, authLoading, navigate]);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target.result;
      setAvatarSrc(src);
      localStorage.setItem(`profilePicture:${session.user.id}`, src);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaveError('');
    const trimmedUsername = username.trim();
    if (!trimmedUsername || !USERNAME_RE.test(trimmedUsername)) {
      setSaveError('Invalid username. Use letters, numbers, dots, and underscores.');
      return;
    }
    try {
      await api.patch('/me', { username: trimmedUsername, full_name: fullName.trim() });
      setProfile((p) => ({ ...p, username: trimmedUsername, full_name: fullName.trim() }));
      setEditing(false);
    } catch (err) {
      setSaveError(err?.data?.error || err?.message || 'Failed to update profile.');
    }
  };

  const handleCancelEdit = () => {
    setFullName(profile?.full_name ?? '');
    setUsername(profile?.username ?? '');
    setSaveError('');
    setEditing(false);
  };

  if ((authLoading || profileLoading) && !profile) {
    // While auth + first profile load are in-flight, don't render any placeholder text.
    // The page will simply appear once everything is ready.
    return null;
  }

  if (!authLoading && !session && !profile) {
    // Safety net: if auth is done and we have no session/profile, send to login
    navigate('/login');
    return null;
  }

  if (!profile) {
    // Auth thinks we have a session but /me failed in a non-401 way
    return (
      <div className="page-section" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        {loadError || 'Unable to load your profile.'}
      </div>
    );
  }

  const memberYear = profile.created_at ? new Date(profile.created_at).getFullYear() : '';

  return (
    <>
      {loadError && (
        <div className="page-section" style={{ padding: '1rem 2rem', color: '#b00020', textAlign: 'center' }}>
          {loadError}
        </div>
      )}
      <div className="pf-banner">
        <div className="pf-banner-inner">
          <img src={avatarSrc} alt="Profile" className="pf-banner-pic" />
          <div className="pf-banner-info">
            <h1>{profile.full_name || profile.username || 'Your Profile'}</h1>
            <p className="pf-banner-email">{profile.email}</p>
            <div className="pf-banner-meta">
              {memberYear && <span>Member since {memberYear}</span>}
              <span>Standard Member</span>
            </div>
          </div>
        </div>
      </div>

      <div className="pf-layout">
        <aside className="pf-sidebar">
          <ul>
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className={`pf-nav-btn${section === s.id ? ' active' : ''}`}
                  onClick={() => setSection(s.id)}
                >
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="pf-main-content">
          {section === 'personal' && (
            <>
              <h2 className="pf-section-title">Personal Information</h2>
              <div className="pf-avatar-wrapper">
                <img src={avatarSrc} alt="Profile" className="pf-avatar" />
                <button type="button" className="pf-change-pic-btn" onClick={() => fileInputRef.current?.click()}>
                  Change Picture
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
              </div>
              <div className="pf-form">
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={!editing} />
                </div>
                <div className="form-group">
                  <label>Username</label>
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} disabled={!editing} />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" value={profile.email ?? ''} disabled />
                </div>
                {saveError && <p className="pf-save-error">{saveError}</p>}
                <div className="pf-form-actions">
                  {editing ? (
                    <>
                      <button type="button" className="pf-btn pf-btn--primary" onClick={handleSave}>Save</button>
                      <button type="button" className="pf-btn pf-btn--secondary" onClick={handleCancelEdit}>Cancel</button>
                    </>
                  ) : (
                    <button type="button" className="pf-btn pf-btn--primary" onClick={() => setEditing(true)}>Edit</button>
                  )}
                </div>
              </div>
            </>
          )}
          {section === 'orders' && (
            <>
              <h2 className="pf-section-title">Order History</h2>
              <OrdersList orders={orders} />
            </>
          )}
          {section === 'wishlist' && (
            <>
              <h2 className="pf-section-title">Wishlist</h2>
              <WishlistSection items={wishlist} />
            </>
          )}
          {section === 'addresses' && (
            <>
              <h2 className="pf-section-title">Saved Addresses</h2>
              <AddressesSection addresses={addresses} />
            </>
          )}
          {section === 'activity' && (
            <>
              <h2 className="pf-section-title">Activity Timeline</h2>
              <ActivitySection activities={activity} />
            </>
          )}
          {section === 'loyalty' && (
            <>
              <h2 className="pf-section-title">Loyalty Points &amp; Tier</h2>
              <LoyaltySection loyalty={loyalty} profile={profile} />
            </>
          )}
        </div>
      </div>
    </>
  );
}
