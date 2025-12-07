document.addEventListener('DOMContentLoaded', () => {
  const listEl = document.getElementById('wishlist-items');
  const emptyMsg = document.getElementById('empty-msg');

  // Load wishlist array
  const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');

  if (!wishlist.length) {
    emptyMsg.style.display = 'block';
    return;
  }
  emptyMsg.style.display = 'none';

  // Render each item
  wishlist.forEach((item, idx) => {
    const li = document.createElement('li');
    li.className = 'wishlist-item';
    li.innerHTML = `
      <img src="${item.image}" alt="${item.name}" />
      <div class="info">
        <h3>${item.name}</h3>
        <p>${item.price} USD</p>
      </div>
      <button class="remove-btn" data-index="${idx}" aria-label="Remove from wishlist">
        <i class="fas fa-trash"></i>
      </button>
    `;
    listEl.appendChild(li);
  });

  // Remove handler
  listEl.addEventListener('click', e => {
    if (!e.target.closest('.remove-btn')) return;
    const btn = e.target.closest('.remove-btn');
    const idx = Number(btn.dataset.index);
    wishlist.splice(idx, 1);
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
    location.reload();
  });
});
