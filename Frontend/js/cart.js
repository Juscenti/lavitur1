document.addEventListener('DOMContentLoaded', () => {
  const listEl = document.getElementById('cart-items');
  const summaryEl = document.getElementById('cart-summary');
  const emptyMsg = document.getElementById('empty-cart');

  // Load cart array
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  if (!cart.length) {
    emptyMsg.style.display = 'block';
    return;
  }
  emptyMsg.style.display = 'none';

  let total = 0;

  // Render each cart item
  cart.forEach((item, idx) => {
    const li = document.createElement('li');
    li.className = 'cart-item';
    li.innerHTML = `
      <img src="${item.image}" alt="${item.name}" />
      <div class="info">
        <h3>${item.name}</h3>
        <p>${item.price} USD × ${item.quantity}</p>
      </div>
      <div class="actions">
        <button class="decrease" data-index="${idx}" aria-label="Decrease quantity">−</button>
        <button class="increase" data-index="${idx}" aria-label="Increase quantity">+</button>
        <button class="remove"   data-index="${idx}" aria-label="Remove item"><i class="fas fa-trash"></i></button>
      </div>
    `;
    listEl.appendChild(li);
    total += item.price * item.quantity;
  });

  // Render summary
  summaryEl.innerHTML = `
    <p><strong>Total:</strong> ${total.toFixed(2)} USD</p>
    <button class="cta-button">Proceed to Checkout</button>
  `;

  // Handle cart actions
  listEl.addEventListener('click', e => {
    const idx = Number(e.target.closest('button')?.dataset.index);
    if (isNaN(idx)) return;
    if (e.target.closest('.decrease')) {
      if (cart[idx].quantity > 1) cart[idx].quantity--;
      else return;
    } else if (e.target.closest('.increase')) {
      cart[idx].quantity++;
    } else if (e.target.closest('.remove')) {
      cart.splice(idx, 1);
    } else {
      return;
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    location.reload();
  });
});
