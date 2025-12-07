document.addEventListener('DOMContentLoaded', () => {
  // Sample product data (could be fetched instead)
  const products = [
    { id:1, name:'Leather Jacket', category:'menswear', price:249.99, image:'images/products/jacket.jpg' },
    { id:2, name:'Silk Scarf',     category:'womenswear', price: 79.99, image:'images/products/scarf.jpg' },
    { id:3, name:'Canvas Tote',     category:'niche',      price: 49.99, image:'images/products/tote.jpg' },
    // …add more products as needed
  ];

  const grid = document.getElementById('product-grid');
  const filters = Array.from(document.querySelectorAll('.category-filter'));

  // Render products based on active filters
  function render() {
    const activeCats = filters
      .filter(f => f.checked)
      .map(f => f.value);
    const toShow = activeCats.length
      ? products.filter(p => activeCats.includes(p.category))
      : products;

    grid.innerHTML = toShow.map(p => `
      <div class="product-card">
        <img src="${p.image}" alt="${p.name}" />
        <h3>${p.name}</h3>
        <p>${p.price.toFixed(2)} USD</p>
        <div class="actions">
          <button class="add-cart" data-id="${p.id}">Add to Cart</button>
          <button class="add-wishlist" data-id="${p.id}"><i class="fas fa-heart"></i></button>
        </div>
      </div>
    `).join('');
  }

  // Initial render
  render();

  // Filter change handlers
  filters.forEach(f => f.addEventListener('change', render));

  // Delegate product actions
  grid.addEventListener('click', e => {
    const id = Number(e.target.closest('button')?.dataset.id);
    if (!id) return;

    const product = products.find(p => p.id === id);
    if (e.target.classList.contains('add-cart')) {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      const existing = cart.find(item => item.id === id);
      if (existing) {
        existing.quantity++;
      } else {
        cart.push({ ...product, quantity:1 });
      }
      localStorage.setItem('cart', JSON.stringify(cart));
      alert('Added to cart.');
    }

    if (e.target.closest('.add-wishlist')) {
      const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
      if (!wishlist.some(item => item.id === id)) {
        wishlist.push(product);
        localStorage.setItem('wishlist', JSON.stringify(wishlist));
        alert('Added to wishlist.');
      }
    }
  });
});
