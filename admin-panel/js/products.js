const token = localStorage.getItem('adminToken');
const response = await fetch('/api/admin/users', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
const role = localStorage.getItem('adminRole');

const viewerSection = document.getElementById('viewerModeSection');
const editorialSection = document.getElementById('editorialModeSection');
const modeSwitch = document.getElementById('modeSwitch');
const viewerTableBody = document.getElementById('viewerTableBody');
const categoryContainer = document.getElementById('categoryContainer');

// Only Senior Employee and higher can access editorial mode
const privilegedRoles = ['admin', 'representative', 'senior'];
if (privilegedRoles.includes(role)) {
  modeSwitch.disabled = false;
}

// Handle toggle switch
modeSwitch.addEventListener('change', () => {
  const isEditorial = modeSwitch.checked;
  viewerSection.classList.toggle('hidden', isEditorial);
  editorialSection.classList.toggle('hidden', !isEditorial);
});

// Load product data on page load
let productData = [];

function loadProducts() {
  fetch('http://localhost:5000/api/admin/products', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
    .then(res => res.json())
    .then(data => {
      productData = data;
      renderViewerTable(data);
      renderEditorialView(data);
    })
    .catch(err => {
      console.error(err);
      alert('Failed to load products');
    });
}

// Render viewer table
function renderViewerTable(products) {
  viewerTableBody.innerHTML = '';
  products.forEach(prod => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${prod.name}</td>
      <td>$${prod.price}</td>
      <td>${prod.stock}</td>
      <td>${prod.published ? 'Published' : 'Unpublished'}</td>
      <td>${prod.category}</td>
      <td><button>Edit</button></td>
    `;
    viewerTableBody.appendChild(row);
  });
}

// Render editorial category view
function renderEditorialView(products) {
  categoryContainer.innerHTML = '';
  const categoryMap = {};

  // Group products by category
  products.forEach((prod) => {
    if (!categoryMap[prod.category]) {
      categoryMap[prod.category] = [];
    }
    categoryMap[prod.category].push(prod);
  });

  for (const category in categoryMap) {
    const block = document.createElement('div');
    block.className = 'category-block';
    block.dataset.category = category;

    block.innerHTML = `
      <div class="category-header">
        <h3>${category}</h3>
        <button class="addInCategoryBtn">+ Add Product</button>
      </div>
      <div class="product-grid">
        ${categoryMap[category].map(p => `
          <div class="product-card">
            <h4>${p.name}</h4>
            <p>$${p.price}</p>
            <p>${p.stock} in stock</p>
            <p>Status: ${p.published ? 'Live' : 'Pending'}</p>
          </div>
        `).join('')}
      </div>
    `;

    categoryContainer.appendChild(block);
  }

  // Bind Add buttons in category blocks
  document.querySelectorAll('.addInCategoryBtn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const category = e.target.closest('.category-block').dataset.category;
      openProductForm(category); // stub
    });
  });
}

// Global "Add Product" button (outside any category)
document.getElementById('addGeneralProductBtn').addEventListener('click', () => {
  openProductForm(null); // category = null → user chooses during flow
});

// Stub for product form (to be implemented)
function openProductForm(category) {
  console.log('Opening product form for category:', category || 'Unassigned');
  // Will open product submission modal or page with category context
}

loadProducts();
