// Frontend/js/profile.js — uses REST API for profile (auth via Supabase)
import { supabase } from "./supabaseClient.js";
import { api } from "./api.js";

const DEFAULT_PROFILE_PIC = "images/icons/default-avatar.png";

async function requireSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const session = data?.session || null;
  if (!session) {
    window.location.replace("login.html");
    return null;
  }
  return session;
}

function setInputValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value ?? "";
}

function setDisabled(id, disabled) {
  const el = document.getElementById(id);
  if (el) el.disabled = disabled;
}

function wireSidebarNav() {
  const buttons = document.querySelectorAll(".nav-btn");
  const sections = document.querySelectorAll(".profile-section");
  if (!buttons.length || !sections.length) return;

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const target = btn.dataset.section;
      sections.forEach((sec) => {
        sec.classList.remove("active");
        if (sec.id === "section-" + target) sec.classList.add("active");
      });
    });
  });
}

function wireProfilePicture(userId) {
  const img = document.getElementById("profile-picture");
  const bannerImg = document.getElementById("profile-picture-banner");
  const changeBtn = document.getElementById("change-picture-btn");
  const fileInput = document.getElementById("upload-profile-picture");
  if (!img) return;

  const PIC_KEY = `profilePicture:${userId}`;
  const savedPic = localStorage.getItem(PIC_KEY) || DEFAULT_PROFILE_PIC;
  img.src = savedPic;
  if (bannerImg) bannerImg.src = savedPic;
  img.alt = "Profile picture";
  
  changeBtn?.addEventListener("click", () => fileInput?.click());
  fileInput?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      img.src = ev.target.result;
      if (bannerImg) bannerImg.src = ev.target.result;
      localStorage.setItem(PIC_KEY, ev.target.result);
    };
    reader.readAsDataURL(file);
  });
}

function wireEditSave(userId, initialProfile) {
  const editBtn = document.getElementById("edit-profile-btn");
  const usernameEl = document.getElementById("username");
  const emailEl = document.getElementById("email");
  const fullNameEl = document.getElementById("fullName");
  if (emailEl) emailEl.disabled = true;
  let isEditing = false;
  if (usernameEl) usernameEl.disabled = true;
  if (fullNameEl) fullNameEl.disabled = true;

  editBtn?.addEventListener("click", async () => {
    isEditing = !isEditing;
    if (usernameEl) usernameEl.disabled = !isEditing;
    if (fullNameEl) fullNameEl.disabled = !isEditing;
    editBtn.textContent = isEditing ? "Save" : "Edit";

    if (!isEditing) {
      const newUsername = (usernameEl?.value || "").trim();
      const newFullName = (fullNameEl?.value || "").trim();
      const usernameRegex = /^[a-zA-Z0-9._]+$/;
      if (!newUsername || !usernameRegex.test(newUsername)) {
        alert("Invalid username. Use letters, numbers, dots, and underscores.");
        if (usernameEl) usernameEl.value = initialProfile.username || "";
        if (fullNameEl) fullNameEl.value = initialProfile.full_name || "";
        return;
      }
      try {
        await api.patch("/me", { username: newUsername, full_name: newFullName });
        initialProfile.username = newUsername;
        initialProfile.full_name = newFullName;
      } catch (err) {
        alert(err?.data?.error || err?.message || "Failed to update profile.");
        if (usernameEl) usernameEl.value = initialProfile.username || "";
        if (fullNameEl) fullNameEl.value = initialProfile.full_name || "";
      }
    }
  });
}

function renderEmptyState(containerId, title, message) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">
        <i class="fas fa-inbox"></i>
      </div>
      <h3 class="empty-state-title">${title}</h3>
      <p class="empty-state-text">${message}</p>
    </div>
  `;
}

async function loadOrders() {
  const container = document.getElementById("orders-list");
  if (!container) return;
  
  try {
    const orders = await api.get("/me/orders");
    
    if (!orders || orders.length === 0) {
      renderEmptyState("orders-list", "No Orders Yet", "Start shopping to see your orders here.");
      return;
    }

    container.innerHTML = orders.map(order => {
      const date = new Date(order.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      
      let statusClass = "status-pending";
      if (order.status === "delivered") statusClass = "status-delivered";
      else if (order.status === "shipped") statusClass = "status-shipped";
      else if (order.status === "processing") statusClass = "status-processing";
      else if (order.status === "cancelled") statusClass = "status-cancelled";

      return `
        <div class="order-card">
          <div class="order-header">
            <div>
              <div class="order-id">#${order.id.slice(0, 8).toUpperCase()}</div>
              <div class="order-date">${date}</div>
            </div>
            <span class="order-status ${statusClass}">${order.status}</span>
          </div>
          <div class="order-total">$${(order.total || 0).toFixed(2)}</div>
          <div class="order-items-list">
            <strong>Items:</strong> ${order.items_count || 0} item${order.items_count !== 1 ? 's' : ''}
          </div>
        </div>
      `;
    }).join("");
  } catch (err) {
    console.error("Failed to load orders:", err);
    renderEmptyState("orders-list", "No Orders Yet", "Start shopping to see your orders here.");
  }
}

async function loadWishlist() {
  const container = document.getElementById("wishlist-list");
  if (!container) return;
  
  try {
    const wishlist = await api.get("/me/wishlist");
    
    if (!wishlist || wishlist.length === 0) {
      renderEmptyState("wishlist-list", "Your Wishlist is Empty", "Add items to your wishlist to save them for later.");
      return;
    }

    container.innerHTML = wishlist.map(item => `
      <div class="wishlist-item">
        <img src="${item.image || 'images/products/placeholder.jpg'}" alt="${item.name}" class="wishlist-image" />
        <div class="wishlist-content">
          <h3 class="wishlist-name">${item.name}</h3>
          <div class="wishlist-price">$${(item.price || 0).toFixed(2)}</div>
          <button class="wishlist-btn" onclick="addToCart('${item.id}')">Add to Cart</button>
        </div>
      </div>
    `).join("");
  } catch (err) {
    console.error("Failed to load wishlist:", err);
    renderEmptyState("wishlist-list", "Your Wishlist is Empty", "Add items to your wishlist to save them for later.");
  }
}

async function loadAddresses() {
  const container = document.getElementById("addresses-list");
  if (!container) return;
  
  try {
    const addresses = await api.get("/me/addresses");
    
    if (!addresses || addresses.length === 0) {
      renderEmptyState("addresses-list", "No Saved Addresses", "Add an address in settings to save it for faster checkout.");
      return;
    }

    container.innerHTML = addresses.map(addr => `
      <div class="address-card">
        <div class="address-type">${addr.type || 'Address'}</div>
        <p class="address-text">
          <strong>${addr.name}</strong><br>
          ${addr.street}<br>
          ${addr.city}, ${addr.state} ${addr.zip}<br>
          ${addr.country}
        </p>
        <p class="address-text" style="margin-top: 0.8rem; font-size: 0.9rem; color: #666;">
          ${addr.phone || 'No phone'}
        </p>
      </div>
    `).join("");
  } catch (err) {
    console.error("Failed to load addresses:", err);
    renderEmptyState("addresses-list", "No Saved Addresses", "Add an address in settings to save it for faster checkout.");
  }
}

async function loadActivity() {
  const container = document.getElementById("activity-list");
  if (!container) return;
  
  try {
    const activities = await api.get("/me/activity");
    
    if (!activities || activities.length === 0) {
      renderEmptyState("activity-list", "No Activity Yet", "Your recent activities will appear here.");
      return;
    }

    container.innerHTML = activities.map(activity => {
      const date = new Date(activity.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      
      const time = new Date(activity.created_at).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });

      return `
        <div class="activity-item">
          <div class="activity-time">${date} at ${time}</div>
          <p class="activity-description">${activity.description}</p>
        </div>
      `;
    }).join("");
  } catch (err) {
    console.error("Failed to load activity:", err);
    renderEmptyState("activity-list", "No Activity Yet", "Your recent activities will appear here.");
  }
}

async function loadLoyalty(profile) {
  const container = document.getElementById("loyalty-info");
  if (!container) return;
  
  try {
    const loyalty = await api.get("/me/loyalty");
    
    const tierName = loyalty?.tier || "Standard Member";
    const points = loyalty?.points || 0;
    const nextTierPoints = loyalty?.next_tier_points || 1000;

    container.innerHTML = `
      <div class="loyalty-tier">
        <div class="loyalty-tier-name">🏆 ${tierName}</div>
        <p class="loyalty-tier-status">Member Status</p>
      </div>
      <div class="loyalty-points">
        <div class="points-stat">
          <div class="points-label">Current Points</div>
          <div class="points-value">${points}</div>
        </div>
        <div class="points-stat">
          <div class="points-label">Until Next Tier</div>
          <div class="points-value">${Math.max(0, nextTierPoints - points)}</div>
        </div>
        <div class="points-stat">
          <div class="points-label">Account Created</div>
          <div class="points-value">${new Date(profile.created_at).getFullYear()}</div>
        </div>
      </div>
    `;
  } catch (err) {
    console.error("Failed to load loyalty:", err);
    const container = document.getElementById("loyalty-info");
    container.innerHTML = `
      <div class="loyalty-tier">
        <div class="loyalty-tier-name">🏆 Standard Member</div>
        <p class="loyalty-tier-status">Member Status</p>
      </div>
      <div class="loyalty-points">
        <div class="points-stat">
          <div class="points-label">Current Points</div>
          <div class="points-value">0</div>
        </div>
        <div class="points-stat">
          <div class="points-label">Account Created</div>
          <div class="points-value">${new Date(profile.created_at).getFullYear()}</div>
        </div>
      </div>
    `;
  }
}

function updateBanner(profile) {
  const bannerUsername = document.getElementById("banner-username");
  const bannerEmail = document.getElementById("banner-email");
  const memberSince = document.getElementById("member-since");
  const tierEl = document.getElementById("loyalty-tier");

  if (bannerUsername) {
    bannerUsername.textContent = profile.full_name || profile.username || "Your Profile";
  }
  if (bannerEmail) {
    bannerEmail.textContent = profile.email || "";
  }
  if (memberSince && profile.created_at) {
    const year = new Date(profile.created_at).getFullYear();
    memberSince.innerHTML = `<strong>Member since ${year}</strong>`;
  }
  if (tierEl) {
    tierEl.innerHTML = `<strong>Standard Member</strong>`;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") {
          var path = window.location.pathname || "";
          var base = path.substring(0, path.lastIndexOf("/") + 1) || "/";
          window.location.replace(window.FRONTEND_HOME || base);
        }
  });
  try {
    const session = await requireSession();
    if (!session) return;

    const profile = await api.get("/me");
    setInputValue("username", profile.username || "");
    setInputValue("email", profile.email || "");
    setInputValue("fullName", profile.full_name || "");
    setDisabled("fullName", true);

    updateBanner(profile);
    wireProfilePicture(session.user.id);
    wireSidebarNav();
    wireEditSave(session.user.id, profile);

    // Load data for each section
    loadOrders();
    loadWishlist();
    loadAddresses();
    loadActivity();
    loadLoyalty(profile);
  } catch (e) {
    console.error("Profile page failed:", e);
    const status = e?.status;
    const msg = e?.data?.error || e?.message || "";
    if (status === 401) {
      alert("Your session expired or was not recognized. Please log in again.");
      window.location.replace("login.html");
      return;
    }
    if (status === 503 && (msg.includes("not configured") || msg.includes("Auth"))) {
      alert("Backend auth is not configured. If you deployed to Render, add SUPABASE_ANON_KEY (and SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) in the service Environment, then redeploy.");
      return;
    }
    window.location.replace("login.html");
  }
});
