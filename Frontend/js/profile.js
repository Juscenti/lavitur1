// js/profile.js

const token = localStorage.getItem('authToken');
let user = JSON.parse(localStorage.getItem('lavitur_user'));

if (!token || !user) {
  window.location.href = 'login.html';
}

function obfuscateEmail(email) {
  const [u, d] = email.split('@');
  const half = Math.floor(u.length / 2);
  return u.slice(0, half) + '***@' + d;
}

document.addEventListener('DOMContentLoaded', () => {
  // Fill editable fields
  document.getElementById('username').value = user.username || '';
  document.getElementById('fullName').value = user.fullName || '';
  document.getElementById('email').value = user.email || '';

  // Profile picture
  const storedPic = localStorage.getItem('profilePicture');
  if (storedPic) {
    document.getElementById('profile-picture').src = storedPic;
  }

  document.getElementById('change-picture-btn').addEventListener('click', () => {
    document.getElementById('upload-profile-picture').click();
  });

  document.getElementById('upload-profile-picture').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = function (e) {
        const imgData = e.target.result;
        document.getElementById('profile-picture').src = imgData;
        localStorage.setItem('profilePicture', imgData);
      };
      reader.readAsDataURL(file);
    }
  });

  // Sidebar nav
  const buttons = document.querySelectorAll('.nav-btn');
  const sections = document.querySelectorAll('.profile-section');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.dataset.section;
      sections.forEach(sec => {
        sec.classList.remove('active');
        if (sec.id === 'section-' + target) {
          sec.classList.add('active');
        }
      });
    });
  });

  // Edit/save user data
  let isEditing = false;
  const editBtn = document.getElementById('edit-profile-btn');
  const usernameInput = document.getElementById('username');
  const fullNameInput = document.getElementById('fullName');
  const emailInput = document.getElementById('email');

  editBtn.addEventListener('click', () => {
    isEditing = !isEditing;

    usernameInput.disabled = !isEditing;
    fullNameInput.disabled = !isEditing;
    emailInput.disabled = !isEditing;
    editBtn.textContent = isEditing ? 'Save' : 'Edit';

    if (!isEditing) {
      // Save data
      user.username = usernameInput.value.trim();
      user.fullName = fullNameInput.value.trim();
      user.email = emailInput.value.trim();

      localStorage.setItem('lavitur_user', JSON.stringify(user));
    }
  });

  // Populate other sections
  populateOrders();
  populateWishlist();
  populateAddresses();
  populateActivity();
  populateLoyalty();
});

// Load Order History
function loadOrderHistory() {
  const ordersList = document.getElementById('orders-list');
  const orders = JSON.parse(localStorage.getItem('lavitur_orders')) || [];

  if (!orders.length) {
    ordersList.innerHTML += `<p style="margin-top:1rem;">You have no orders yet.</p>`;
    return;
  }

  orders.forEach(order => {
    const row = document.createElement('div');
    row.classList.add('order-row');
    row.innerHTML = `
      <div>${order.id}</div>
      <div>${order.date}</div>
      <div>${order.status}</div>
      <div>€${order.total.toFixed(2)}</div>
      <div><button class="order-action-btn">View</button></div>
    `;

    const itemDetails = document.createElement('div');
    itemDetails.classList.add('order-items');
    itemDetails.innerHTML = order.items.map(item => `
      <div class="order-item">
        <img src="${item.image || 'images/default-product.png'}" alt="${item.name}" />
        <div class="order-item-details">
          <span><strong>${item.name}</strong></span>
          <span>${item.quantity} × €${item.price.toFixed(2)}</span>
        </div>
      </div>
    `).join('');

    row.addEventListener('click', () => {
      row.classList.toggle('expanded');
    });

    ordersList.appendChild(row);
    ordersList.appendChild(itemDetails);
  });
}

// Load Wishlist
function loadWishlist() {
  const container = document.getElementById('wishlist-list');
  if (mockWishlist.length === 0) {
    container.innerHTML = '<p>Wishlist is empty.</p>';
    return;
  }

  container.innerHTML = mockWishlist.map(product => `
    <div class="product-card">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-details">
        <h4>${product.name}</h4>
        <p>Size: ${product.size}</p>
        <p>€${product.price.toFixed(2)}</p>
        <span class="status ${product.inStock ? 'in-stock' : 'out-stock'}">
          ${product.inStock ? 'In Stock' : 'Out of Stock'}
        </span>
      </div>
    </div>
  `).join('');
}

function populateAddresses() {
  document.getElementById('addresses-list').innerHTML = `<ul>
    <li>123 Lavitúr St, New York, NY 10001</li>
    <li>47 Rue de Lavitúr, Paris, France 75001</li>
  </ul>`;
}

function populateActivity() {
  document.getElementById('activity-list').innerHTML = `<ul>
    <li>Logged in on May 29, 2025 from IP 192.168.1.23</li>
    <li>Added "Signature Beanie" to Wishlist</li>
    <li>Placed Order #10342</li>
  </ul>`;
}

function populateLoyalty() {
  document.getElementById('loyalty-info').innerHTML = `
    <p><strong>Points:</strong> 1,450</p>
    <p><strong>Tier:</strong> Gold</p>
    <p>You’re 550 points away from Platinum.</p>
  `;
}
// Simulated API responses (replace with actual fetch later)
const mockOrders = [
  {
    orderId: 'LV-84392',
    date: '2025-05-28',
    products: [
      {
        name: 'Obsidian Trench Coat',
        size: 'M',
        price: 340.00,
        image: 'images/products/coat1.jpg',
        stockStatus: 'Delivered'
      },
      {
        name: 'Urban Shift Sneakers',
        size: '42',
        price: 170.00,
        image: 'images/products/sneakers1.jpg',
        stockStatus: 'Delivered'
      }
    ]
  }
];

const mockWishlist = [
  {
    name: 'Nocturne Cargo Jacket',
    size: 'L',
    price: 325.00,
    image: 'images/products/jacket1.jpg',
    inStock: true
  },
  {
    name: 'Midnight Flux Trousers',
    size: 'M',
    price: 210.00,
    image: 'images/products/trousers1.jpg',
    inStock: false
  }
];




loadOrderHistory();




loadOrders();
loadWishlist();
