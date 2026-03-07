import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import SignInRequiredModal from '../components/SignInRequiredModal';
import { api } from '../lib/api';
import '../styles/shop.css';

export default function Shop() {
  const { user } = useAuth();
  const userRef = useRef(user);
  userRef.current = user;
  const wishlistIdsRef = useRef(new Set());
  const [signInModalOpen, setSignInModalOpen] = useState(false);
  const setSignInModalOpenRef = useRef(setSignInModalOpen);
  setSignInModalOpenRef.current = setSignInModalOpen;

  useEffect(() => {
    const PAGE_SIZE = 12;
    const NEW_DAYS = 30;
    const LOW_STOCK_LIMITED = 5;

    const grid = document.getElementById('product-grid');
    const loadMoreWrap = document.getElementById('load-more-wrap');
    const loadMoreBtn = document.getElementById('load-more-btn');
    const shopEmpty = document.getElementById('shop-empty');
    const shopError = document.getElementById('shop-error');
    const retryBtn = document.getElementById('retry-btn');
    const shopSearch = document.getElementById('shop-search');
    const shopSort = document.getElementById('shop-sort');
    const filtersSidebar = document.getElementById('filters-sidebar');
    const filtersToggle = document.getElementById('filters-toggle');
    const filtersClose = document.getElementById('filters-close');
    const filtersBackdrop = document.getElementById('filters-backdrop');
    const filterMainCatList = document.getElementById('filter-main-cat-list');
    const filterSubCatList = document.getElementById('filter-sub-cat-list');
    const filterSize = document.getElementById('filter-size');
    const filterPriceMin = document.getElementById('filter-price-min');
    const filterPriceMax = document.getElementById('filter-price-max');
    const filterInStock = document.getElementById('filter-in-stock');
    const clearFiltersBtn = document.getElementById('clear-filters');
    const clearFiltersInline = document.getElementById('clear-filters-inline');
    const quickViewOverlay = document.getElementById('quick-view-overlay');
    const quickViewModal = document.getElementById('quick-view-modal');
    const quickViewClose = document.getElementById('quick-view-close');
    const quickViewImg = document.getElementById('quick-view-img');
    const quickViewTitle = document.getElementById('quick-view-title');
    const quickViewPrice = document.getElementById('quick-view-price');
    const quickViewDesc = document.getElementById('quick-view-desc');
    const quickViewPdp = document.getElementById('quick-view-pdp');
    const quickViewWishlist = document.getElementById('quick-view-wishlist');

    let allProducts = [];
    let categories = [];
    let displayedCount = 0;
    let loading = false;
    let loadError = false;
    let quickViewProductId = null;

    function track(eventName, detail = {}) {
      try {
        window.dispatchEvent(new CustomEvent('shop_analytics', { detail: { event: eventName, ...detail } }));
      } catch (_) {}
    }

    const slugNorm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '').trim();
    const MAIN_CAT_SLUGS = new Set(['menswear', 'mens', 'womenswear', 'womens', 'unisex']);
    function getMainCategories() {
      return (categories || []).filter((c) => MAIN_CAT_SLUGS.has(slugNorm(c.name)));
    }
    function getSubCategories() {
      const mains = getMainCategories();
      const mainIds = new Set(mains.map((c) => c.id));
      return (categories || []).filter((c) => !mainIds.has(c.id));
    }

    function getUrlParams() {
      const p = new URLSearchParams(window.location.search);
      let mainCat = p.get('mainCat') || '';
      const subCatRaw = p.get('subCat') || p.get('subCats') || '';
      let subCats = subCatRaw ? subCatRaw.split(',').map((s) => s.trim()).filter(Boolean) : [];
      const legacyCategories = (p.get('categories') || '').split(',').filter(Boolean);
      if (legacyCategories.length && !mainCat && !subCats.length) {
        const first = legacyCategories[0];
        mainCat = MAIN_CAT_SLUGS.has(slugNorm(first)) ? first : '';
        if (!mainCat) subCats.push(first);
      }
      const singleCategory = p.get('category');
      if (singleCategory && !mainCat && !legacyCategories.length) {
        const s = slugNorm(singleCategory);
        if (MAIN_CAT_SLUGS.has(s)) mainCat = singleCategory;
        else subCats = [singleCategory];
      }
      return {
        q: p.get('q') || '',
        sort: p.get('sort') || 'newest',
        mainCat,
        subCats,
        size: p.get('size') || '',
        priceMin: p.get('priceMin') || '',
        priceMax: p.get('priceMax') || '',
        inStock: p.get('inStock') === '1',
        page: Math.max(1, parseInt(p.get('page') || '1', 10)),
      };
    }

    function setUrlParams(params) {
      const p = new URLSearchParams(window.location.search);
      if (params.q !== undefined) params.q ? p.set('q', params.q) : p.delete('q');
      if (params.sort !== undefined) params.sort && params.sort !== 'newest' ? p.set('sort', params.sort) : p.delete('sort');
      if (params.mainCat !== undefined) params.mainCat ? p.set('mainCat', params.mainCat) : p.delete('mainCat');
      if (params.subCats !== undefined) {
        if (params.subCats.length) p.set('subCats', params.subCats.join(','));
        else p.delete('subCats');
      }
      if (params.size !== undefined) params.size ? p.set('size', params.size) : p.delete('size');
      if (params.priceMin !== undefined) params.priceMin ? p.set('priceMin', params.priceMin) : p.delete('priceMin');
      if (params.priceMax !== undefined) params.priceMax ? p.set('priceMax', params.priceMax) : p.delete('priceMax');
      if (params.inStock !== undefined) p.set('inStock', params.inStock ? '1' : '0');
      if (params.page !== undefined) p.set('page', String(params.page));
      p.delete('category');
      const qs = p.toString();
      const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
      window.history.replaceState({}, '', url);
    }

    const WISHLIST_KEY = 'lavitur_wishlist';

    function getWishlistProducts() {
      try {
        const raw = localStorage.getItem(WISHLIST_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr.filter((i) => i && typeof i === 'object') : [];
      } catch (_) {
        return [];
      }
    }

    function setWishlistProducts(products) {
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(products));
    }

    function isWishlisted(productId) {
      if (userRef.current) return wishlistIdsRef.current.has(String(productId));
      return getWishlistProducts().some((p) => String(p.id) === String(productId));
    }

    async function toggleWishlist(product) {
      if (!userRef.current) return false;
      const sid = String(product.id);
      if (wishlistIdsRef.current.has(sid)) {
        try {
          await api.delete('/me/wishlist/product/' + encodeURIComponent(product.id));
          wishlistIdsRef.current.delete(sid);
          track('wishlist_toggle', { product_id: product.id, added: false });
          return false;
        } catch (_) { return true; }
      } else {
        try {
          await api.post('/me/wishlist', { product_id: product.id });
          wishlistIdsRef.current.add(sid);
          track('wishlist_toggle', { product_id: product.id, added: true });
          return true;
        } catch (_) { return false; }
      }
    }

    function formatMoney(amount, currency = 'JMD') {
      const n = Number(amount ?? 0);
      try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n);
      } catch (_) {
        return `${currency} ${n.toFixed(2)}`;
      }
    }

    function isNew(product) {
      if (!product.created_at) return false;
      const d = new Date(product.created_at);
      const now = new Date();
      const diff = (now - d) / (1000 * 60 * 60 * 24);
      return diff <= NEW_DAYS;
    }

    function isSoldOut(product) {
      return Number(product.stock ?? 0) <= 0;
    }

    function isLimited(product) {
      const s = Number(product.stock ?? 0);
      return s > 0 && s <= LOW_STOCK_LIMITED;
    }

    function productMatchesSize(product, size) {
      if (!size) return true;
      const s = (product.size || product.sizes || '').toString().toUpperCase();
      if (!s) return true;
      if (Array.isArray(product.sizes)) return product.sizes.some((x) => String(x).toUpperCase() === size);
      return s === size.toUpperCase();
    }

    function productMatchesMainCat(p, mainCatSlug) {
      if (!mainCatSlug) return true;
      const slugs = Array.isArray(p.category_slugs) ? p.category_slugs : (p.category_slug ? [p.category_slug] : []);
      const normSet = new Set(slugs.map((s) => slugNorm(s)));
      const n = slugNorm(mainCatSlug);
      if (n === 'general' || n === 'any') return true;
      if (n === 'unisex') return normSet.has('unisex');
      if (n === 'menswear' || n === 'mens') return normSet.has('menswear') || normSet.has('mens') || normSet.has('unisex');
      if (n === 'womenswear' || n === 'womens') return normSet.has('womenswear') || normSet.has('womens') || normSet.has('unisex');
      return normSet.has(n);
    }

    function getFilteredAndSortedProducts() {
      const params = getUrlParams();
      let list = [...allProducts];

      if (params.q.trim()) {
        const q = params.q.trim().toLowerCase();
        list = list.filter((p) => {
          const names = Array.isArray(p.category_names) ? p.category_names : [p.category_name].filter(Boolean);
          const slugs = Array.isArray(p.category_slugs) ? p.category_slugs : [p.category_slug].filter(Boolean);
          return (
            (p.title || '').toLowerCase().includes(q) ||
            names.some((n) => (n || '').toLowerCase().includes(q)) ||
            slugs.some((s) => (s || '').toLowerCase().includes(q))
          );
        });
      }

      if (params.mainCat) {
        list = list.filter((p) => productMatchesMainCat(p, params.mainCat));
      }
      if (params.subCats && params.subCats.length > 0) {
        const subNormSet = new Set((params.subCats || []).map((s) => slugNorm(s)));
        list = list.filter((p) => {
          const slugs = Array.isArray(p.category_slugs) ? p.category_slugs : (p.category_slug ? [p.category_slug] : []);
          return slugs.some((s) => subNormSet.has(slugNorm(s)));
        });
      }

      if (params.size) {
        list = list.filter((p) => productMatchesSize(p, params.size));
      }

      const min = parseFloat(params.priceMin);
      const max = parseFloat(params.priceMax);
      if (!Number.isNaN(min)) list = list.filter((p) => Number(p.price) >= min);
      if (!Number.isNaN(max)) list = list.filter((p) => Number(p.price) <= max);

      if (params.inStock) {
        list = list.filter((p) => Number(p.stock ?? 0) > 0);
      }

      switch (params.sort) {
        case 'price_asc':
          list.sort((a, b) => Number(a.price) - Number(b.price));
          break;
        case 'price_desc':
          list.sort((a, b) => Number(b.price) - Number(a.price));
          break;
        default:
          list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      }

      return list;
    }

    function renderSkeletons(count) {
      if (!grid) return;
      const frag = document.createDocumentFragment();
      for (let i = 0; i < count; i += 1) {
        const card = document.createElement('div');
        card.className = 'product-card skeleton';
        card.setAttribute('role', 'listitem');
        card.innerHTML = `
      <div class="card-image-wrap"><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E" alt="" /></div>
      <h3 class="card-title">&nbsp;</h3>
      <p class="card-price">&nbsp;</p>
    `;
        frag.appendChild(card);
      }
      grid.innerHTML = '';
      grid.appendChild(frag);
    }

    function getPdpUrl(id) {
      if (id == null || id === '') return '/shop';
      return `/shop/${encodeURIComponent(String(id))}`;
    }

    function renderProductCard(p) {
      const wished = isWishlisted(p.id);
      const badges = [];
      if (isNew(p)) badges.push({ text: 'New', class: 'badge-new' });
      if (isSoldOut(p)) badges.push({ text: 'Sold out', class: 'badge-soldout' });
      else if (isLimited(p)) badges.push({ text: 'Limited', class: 'badge-limited' });

      const badgeHtml =
        badges.length > 0
          ? `<div class="product-badges">${badges.map((b) => `<span class="product-badge ${b.class}">${b.text}</span>`).join('')}</div>`
          : '';

      const card = document.createElement('div');
      card.className = 'product-card';
      card.setAttribute('role', 'listitem');
      card.dataset.productId = p.id;
      card.innerHTML = `
    <a href="${getPdpUrl(p.id)}" class="product-card-link" data-pdp-link>
      <div class="card-image-wrap">
        ${badgeHtml}
        <img loading="lazy" src="${p.image_url || '/images/placeholder.jpg'}" alt="${(p.title || '').replace(/"/g, '&quot;')}" />
      </div>
      <h3 class="card-title">${(p.title || 'Untitled').replace(/</g, '&lt;')}</h3>
      <p class="card-price">${formatMoney(p.price, 'JMD')}</p>
      <div class="card-actions">
        <button type="button" class="quick-view-btn" data-id="${p.id}" aria-label="Quick view"><i class="fas fa-eye"></i></button>
        <button type="button" class="wishlist-btn ${wished ? 'is-wishlisted' : ''}" data-id="${p.id}" aria-label="${
        wished ? 'Remove from wishlist' : 'Add to wishlist'
      }">
          <i class="${wished ? 'fas' : 'far'} fa-heart"></i>
        </button>
      </div>
    </a>
  `;

      const link = card.querySelector('[data-pdp-link]');
      const qvBtn = card.querySelector('.quick-view-btn');
      const wlBtn = card.querySelector('.wishlist-btn');

      if (link) {
        link.addEventListener('click', (e) => {
          if (e.target.closest('.card-actions')) {
            e.preventDefault();
            return;
          }
          track('product_card_click', { product_id: p.id });
        });
      }

      if (qvBtn) {
        qvBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          openQuickView(p);
          track('quick_view_open', { product_id: p.id });
        });
      }

      if (wlBtn) {
        wlBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!userRef.current) {
            setSignInModalOpenRef.current?.(true);
            return;
          }
          const nowWished = await toggleWishlist(p);
          wlBtn.classList.toggle('is-wishlisted', nowWished);
          wlBtn.querySelector('i').className = nowWished ? 'fas fa-heart' : 'far fa-heart';
          wlBtn.setAttribute('aria-label', nowWished ? 'Remove from wishlist' : 'Add to wishlist');
        });
      }

      return card;
    }

    function renderGrid(products, append = false) {
      if (!grid) return;
      const params = getUrlParams();
      const page = params.page;
      const start = append ? displayedCount : 0;
      const end = append ? Math.min(displayedCount + PAGE_SIZE, products.length) : Math.min(page * PAGE_SIZE, products.length);
      const slice = products.slice(start, end);

      if (!append) {
        grid.innerHTML = '';
      }

      slice.forEach((p) => {
        grid.appendChild(renderProductCard(p));
      });

      displayedCount = end;
      const hasMore = end < products.length;

      if (append) {
        setUrlParams({ ...getUrlParams(), page: page + 1 });
      }

      if (loadMoreWrap && loadMoreBtn && shopEmpty) {
        loadMoreWrap.hidden = !hasMore;
        loadMoreBtn.disabled = !hasMore;
        shopEmpty.hidden = true;

        if (products.length === 0) {
          shopEmpty.hidden = false;
          loadMoreWrap.hidden = true;
        }
      }
    }

    function showError() {
      if (!grid || !loadMoreWrap || !shopEmpty || !shopError) return;
      grid.innerHTML = '';
      loadMoreWrap.hidden = true;
      shopEmpty.hidden = true;
      shopError.hidden = false;
    }

    function hideError() {
      if (!shopError) return;
      shopError.hidden = true;
    }

    function openQuickView(product) {
      if (!quickViewOverlay || !quickViewImg || !quickViewTitle || !quickViewPrice || !quickViewDesc || !quickViewPdp) return;
      quickViewProductId = product.id;
      quickViewImg.src = product.image_url || '/images/placeholder.jpg';
      quickViewImg.alt = product.title || '';
      quickViewTitle.textContent = product.title || 'Untitled';
      quickViewPrice.textContent = formatMoney(product.price, 'JMD');
      quickViewDesc.textContent = (product.description || '').trim() || 'No description.';
      quickViewPdp.href = getPdpUrl(product.id);

      const wished = isWishlisted(product.id);
      quickViewWishlist.classList.toggle('is-wishlisted', wished);
      quickViewWishlist.querySelector('i').className = wished ? 'fas fa-heart' : 'far fa-heart';

      quickViewOverlay.hidden = false;
      document.body.style.overflow = 'hidden';
      if (quickViewClose) quickViewClose.focus();
    }

    function closeQuickView() {
      if (!quickViewOverlay) return;
      quickViewOverlay.hidden = true;
      document.body.style.overflow = '';
      quickViewProductId = null;
    }

    if (quickViewClose) {
      quickViewClose.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeQuickView();
      });
    }
    if (quickViewOverlay) {
      quickViewOverlay.addEventListener('click', (e) => {
        if (e.target === quickViewOverlay) closeQuickView();
      });
    }

    if (quickViewWishlist) {
      quickViewWishlist.addEventListener('click', async () => {
        if (!userRef.current) {
          closeQuickView();
          setSignInModalOpenRef.current?.(true);
          return;
        }
        if (!quickViewProductId) return;
        const product = allProducts.find((p) => String(p.id) === String(quickViewProductId));
        if (!product) return;
        const nowWished = await toggleWishlist(product);
        quickViewWishlist.classList.toggle('is-wishlisted', nowWished);
        quickViewWishlist.querySelector('i').className = nowWished ? 'fas fa-heart' : 'far fa-heart';
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && quickViewOverlay && !quickViewOverlay.hidden) closeQuickView();
    });

    async function loadCategories() {
      const data = await api.get('/categories');
      categories = Array.isArray(data) ? data : [];
    }

    async function loadProducts() {
      if (loading) return;
      loading = true;
      loadError = false;
      hideError();
      renderSkeletons(PAGE_SIZE);
      try {
        const [prods] = await Promise.all([api.get('/products'), loadCategories()]);
        allProducts = Array.isArray(prods) ? prods : [];
        loading = false;
        syncControlsFromUrl();
        if (window.location.search.includes('category=')) {
          setUrlParams(getUrlParams());
        }
        applyStateAndRender(false);
        if (userRef.current) {
          api.get('/me/wishlist').then((data) => {
            wishlistIdsRef.current = new Set((data || []).map((w) => w.product_id));
            applyStateAndRender(false);
          }).catch(() => {});
        }
      } catch (err) {
        console.error('Shop load failed:', err);
        loading = false;
        loadError = true;
        showError();
      }
    }

    function applyStateAndRender(append) {
      if (loadError) return;
      const filtered = getFilteredAndSortedProducts();
      if (!grid || !shopEmpty || !loadMoreWrap) return;
      if (!append) {
        displayedCount = 0;
      }
      if (filtered.length === 0) {
        grid.innerHTML = '';
        shopEmpty.hidden = false;
        loadMoreWrap.hidden = true;
        return;
      }
      renderGrid(filtered, append);
    }

    function escapeAttr(s) {
      return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function syncControlsFromUrl() {
      const params = getUrlParams();
      if (shopSearch) shopSearch.value = params.q;
      if (shopSort) shopSort.value = params.sort;
      if (filterSize) filterSize.value = params.size;
      if (filterPriceMin) filterPriceMin.value = params.priceMin;
      if (filterPriceMax) filterPriceMax.value = params.priceMax;
      if (filterInStock) filterInStock.checked = params.inStock;

      if (filterMainCatList && categories.length) {
        const mains = getMainCategories();
        const mainSlug = slugNorm(params.mainCat);
        filterMainCatList.innerHTML =
          '<label class="filter-checkbox-label"><input type="radio" name="filter-main-cat" value="" ' +
          (!params.mainCat ? ' checked' : '') +
          ' /><span>Any</span></label>' +
          mains
            .map((c) => {
              const slug = slugNorm(c.slug || c.name);
              const displayName = c.name || slug;
              const checked = params.mainCat && mainSlug === slug ? ' checked' : '';
              return `<label class="filter-checkbox-label"><input type="radio" name="filter-main-cat" value="${escapeAttr(
                slug,
              )}"${checked} /><span>${escapeAttr(displayName)}</span></label>`;
            })
            .join('');
      }
      if (filterSubCatList && categories.length) {
        const subs = getSubCategories();
        const selectedSubSlugs = new Set((params.subCats || []).map((s) => slugNorm(s)));
        filterSubCatList.innerHTML =
          subs.length > 0
            ? subs
                .map((c) => {
                  const slug = slugNorm(c.slug || c.name);
                  const displayName = c.name || slug;
                  const checked = selectedSubSlugs.has(slug) ? ' checked' : '';
                  return `<label class="filter-checkbox-label"><input type="checkbox" class="filter-sub-cb" data-slug="${escapeAttr(
                    slug,
                  )}"${checked} /><span>${escapeAttr(displayName)}</span></label>`;
                })
                .join('')
            : '<p class="filter-hint">No sub-categories</p>';
      }
    }

    function pushState(updates) {
      const prev = getUrlParams();
      const next = { ...prev, ...updates };
      if (
        updates.page === undefined &&
        (updates.q !== undefined ||
          updates.sort !== undefined ||
          updates.mainCat !== undefined ||
          updates.subCats !== undefined ||
          updates.size !== undefined ||
          updates.priceMin !== undefined ||
          updates.priceMax !== undefined ||
          updates.inStock !== undefined)
      ) {
        next.page = 1;
      }
      setUrlParams(next);
      syncControlsFromUrl();
      displayedCount = 0;
      applyStateAndRender(false);
    }

    function openFiltersDrawer() {
      if (filtersSidebar) filtersSidebar.classList.add('is-open');
      if (filtersBackdrop) {
        filtersBackdrop.classList.add('is-open');
        filtersBackdrop.setAttribute('aria-hidden', 'false');
      }
    }

    function closeFiltersDrawer() {
      if (filtersSidebar) filtersSidebar.classList.remove('is-open');
      if (filtersBackdrop) {
        filtersBackdrop.classList.remove('is-open');
        filtersBackdrop.setAttribute('aria-hidden', 'true');
      }
    }

    function initFilterCollapsibles() {
      const triggers = document.querySelectorAll('.filter-collapse-trigger');
      const STORAGE_KEY = 'lavitur_shop_filter_collapse';
      function getStored() {
        try {
          const raw = sessionStorage.getItem(STORAGE_KEY);
          return raw ? JSON.parse(raw) : {};
        } catch (_) {
          return {};
        }
      }
      function setStored(key, closed) {
        const o = getStored();
        o[key] = closed;
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(o));
      }
      triggers.forEach((btn) => {
        const collapse = btn.closest('.filter-collapse');
        const key = collapse?.dataset.collapse || 'section';
        const content = document.getElementById(btn.getAttribute('aria-controls') || '');
        if (!collapse || !content) return;
        const stored = getStored();
        const initiallyClosed = stored[key] === true;
        if (initiallyClosed) {
          collapse.classList.add('is-closed');
          btn.setAttribute('aria-expanded', 'false');
        }
        btn.addEventListener('click', () => {
          const isClosed = collapse.classList.toggle('is-closed');
          btn.setAttribute('aria-expanded', isClosed ? 'false' : 'true');
          setStored(key, isClosed);
        });
      });
    }

    function clearAllFilters() {
      const current = getUrlParams();
      setUrlParams({
        q: current.q,
        sort: current.sort,
        mainCat: '',
        subCats: [],
        size: '',
        priceMin: '',
        priceMax: '',
        inStock: false,
        page: 1,
      });
      syncControlsFromUrl();
      displayedCount = 0;
      applyStateAndRender(false);
      track('filter_change', { cleared: true });
      closeFiltersDrawer();
    }

    function debounce(fn, ms) {
      let t;
      return function debounced(...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), ms);
      };
    }

    if (shopSearch) {
      shopSearch.addEventListener(
        'input',
        debounce(() => {
          const q = shopSearch.value.trim();
          setUrlParams({ ...getUrlParams(), q, page: 1 });
          syncControlsFromUrl();
          displayedCount = 0;
          applyStateAndRender(false);
          track('search_used', { q });
        }, 300),
      );
    }

    if (shopSort) {
      shopSort.addEventListener('change', () => {
        const sort = shopSort.value;
        setUrlParams({ ...getUrlParams(), sort, page: 1 });
        syncControlsFromUrl();
        displayedCount = 0;
        applyStateAndRender(false);
        track('sort_change', { sort });
      });
    }

    if (filtersToggle) filtersToggle.addEventListener('click', openFiltersDrawer);
    if (filtersClose) filtersClose.addEventListener('click', closeFiltersDrawer);
    if (filtersBackdrop) filtersBackdrop.addEventListener('click', closeFiltersDrawer);

    if (filterMainCatList) {
      filterMainCatList.addEventListener('change', (e) => {
        const radio = e.target.closest('input[name="filter-main-cat"]');
        if (!radio) return;
        const value = radio.value || '';
        pushState({ mainCat: value, subCats: value ? [] : undefined });
        track('filter_change', { mainCat: value });
      });
    }

    if (filterSubCatList) {
      filterSubCatList.addEventListener('change', (e) => {
        if (!e.target.classList.contains('filter-sub-cb')) return;
        const checked = Array.from(filterSubCatList.querySelectorAll('.filter-sub-cb:checked'))
          .map((el) => el.dataset.slug || el.value || '')
          .filter(Boolean);
        pushState({ subCats: checked });
        track('filter_change', { subCats: checked });
      });
    }

    if (filterSize) {
      filterSize.addEventListener('change', () => {
        setUrlParams({ ...getUrlParams(), size: filterSize.value, page: 1 });
        displayedCount = 0;
        applyStateAndRender(false);
        track('filter_change', { size: filterSize.value });
      });
    }

    if (filterPriceMin) {
      filterPriceMin.addEventListener('change', () => {
        setUrlParams({ ...getUrlParams(), priceMin: filterPriceMin.value, page: 1 });
        displayedCount = 0;
        applyStateAndRender(false);
        track('filter_change', { priceMin: filterPriceMin.value });
      });
    }

    if (filterPriceMax) {
      filterPriceMax.addEventListener('change', () => {
        setUrlParams({ ...getUrlParams(), priceMax: filterPriceMax.value, page: 1 });
        displayedCount = 0;
        applyStateAndRender(false);
        track('filter_change', { priceMax: filterPriceMax.value });
      });
    }

    if (filterInStock) {
      filterInStock.addEventListener('change', () => {
        setUrlParams({ ...getUrlParams(), inStock: filterInStock.checked, page: 1 });
        displayedCount = 0;
        applyStateAndRender(false);
        track('filter_change', { inStock: filterInStock.checked });
      });
    }

    if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', clearAllFilters);
    if (clearFiltersInline) clearFiltersInline.addEventListener('click', clearAllFilters);

    if (loadMoreBtn && loadMoreWrap) {
      loadMoreBtn.addEventListener('click', () => {
        loadMoreWrap.classList.add('loading');
        loadMoreBtn.disabled = true;
        track('load_more_clicked', {});
        applyStateAndRender(true);
        loadMoreWrap.classList.remove('loading');
      });
    }

    if (retryBtn) retryBtn.addEventListener('click', () => loadProducts());

    if (quickViewOverlay) quickViewOverlay.hidden = true;
    initFilterCollapsibles();
    syncControlsFromUrl();
    loadProducts();

    return () => {
      // best-effort cleanup; full removal of all event listeners would require tracking handlers
      if (quickViewOverlay) quickViewOverlay.hidden = true;
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="shop-page">
      <div className="shop-layout">
        <header className="shop-toolbar">
          <div className="shop-toolbar-inner">
            <div className="search-wrap">
              <i className="fas fa-search" />
              <input type="search" id="shop-search" className="shop-search" placeholder="Search products…" autoComplete="off" />
            </div>
            <div className="toolbar-right">
              <select id="shop-sort" className="shop-sort" aria-label="Sort by">
                <option value="newest">Newest</option>
                <option value="price_asc">Price: low → high</option>
                <option value="price_desc">Price: high → low</option>
              </select>
              <button type="button" className="filters-toggle" id="filters-toggle" aria-label="Open filters">
                <i className="fas fa-sliders-h" /> Filters
              </button>
            </div>
          </div>
        </header>

        <div className="filters-drawer-backdrop" id="filters-backdrop" aria-hidden="true" />

        <aside className="filters-sidebar" id="filters-sidebar">
          <div className="filters-header">
            <h2>Filters</h2>
            <button type="button" className="filters-close" id="filters-close" aria-label="Close filters">
              <i className="fas fa-times" />
            </button>
          </div>

          <div className="filter-collapse" data-collapse="main-cat">
            <button
              type="button"
              className="filter-collapse-trigger"
              aria-expanded="true"
              aria-controls="filter-main-cat-content"
              id="filter-main-cat-trigger"
            >
              <span>Main category</span>
              <i className="filter-collapse-chevron fas fa-chevron-down" aria-hidden="true" />
            </button>
            <div className="filter-collapse-content" id="filter-main-cat-content">
              <div className="filter-checkboxes" id="filter-main-cat-list" />
            </div>
          </div>

          <div className="filter-collapse" data-collapse="sub-cat">
            <button
              type="button"
              className="filter-collapse-trigger"
              aria-expanded="true"
              aria-controls="filter-sub-cat-content"
              id="filter-sub-cat-trigger"
            >
              <span>Sub-Cats</span>
              <i className="filter-collapse-chevron fas fa-chevron-down" aria-hidden="true" />
            </button>
            <div className="filter-collapse-content" id="filter-sub-cat-content">
              <div className="filter-checkboxes filter-subcats-list" id="filter-sub-cat-list" />
            </div>
          </div>

          <div className="filter-collapse" data-collapse="size">
            <button
              type="button"
              className="filter-collapse-trigger"
              aria-expanded="true"
              aria-controls="filter-size-content"
              id="filter-size-trigger"
            >
              <span>Size</span>
              <i className="filter-collapse-chevron fas fa-chevron-down" aria-hidden="true" />
            </button>
            <div className="filter-collapse-content" id="filter-size-content">
              <select id="filter-size" className="filter-select">
                <option value="">Any</option>
                <option value="XS">XS</option>
                <option value="S">S</option>
                <option value="M">M</option>
                <option value="L">L</option>
                <option value="XL">XL</option>
              </select>
            </div>
          </div>

          <div className="filter-group">
            <h3>Price range</h3>
            <div className="price-range">
              <input type="number" id="filter-price-min" className="filter-input" placeholder="Min" min={0} step={1} />
              <span>–</span>
              <input type="number" id="filter-price-max" className="filter-input" placeholder="Max" min={0} step={1} />
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-checkbox-label">
              <input type="checkbox" id="filter-in-stock" />
              <span>In stock only</span>
            </label>
          </div>

          <button type="button" className="clear-filters" id="clear-filters">Clear filters</button>
        </aside>

        <main className="shop-main">
          <div className="product-grid" id="product-grid" role="list" />
          <div className="load-more-wrap" id="load-more-wrap" hidden>
            <button type="button" className="load-more-btn" id="load-more-btn">Load more</button>
          </div>
          <div className="shop-empty" id="shop-empty" hidden>
            <p>No results</p>
            <p className="shop-empty-hint">Try adjusting or clearing your filters.</p>
            <button type="button" className="clear-filters-inline" id="clear-filters-inline">Clear filters</button>
          </div>
          <div className="shop-error" id="shop-error" hidden>
            <p>Something went wrong loading products.</p>
            <button type="button" className="retry-btn" id="retry-btn">Try again</button>
          </div>
        </main>
      </div>

      <div className="quick-view-overlay" id="quick-view-overlay" hidden>
        <div
          className="quick-view-modal"
          id="quick-view-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-view-title"
        >
          <button type="button" className="quick-view-close" id="quick-view-close" aria-label="Close">
            <i className="fas fa-times" />
          </button>
          <div className="quick-view-content">
            <div className="quick-view-image-wrap">
              <img id="quick-view-img" src="" alt="" loading="lazy" />
            </div>
            <div className="quick-view-details">
              <h2 id="quick-view-title" />
              <p className="quick-view-price" id="quick-view-price" />
              <p className="quick-view-desc" id="quick-view-desc" />
              <div className="quick-view-actions">
                <a id="quick-view-pdp" className="btn-view-details" href="#">
                  View details
                </a>
                <button
                  type="button"
                  className="quick-view-wishlist"
                  id="quick-view-wishlist"
                  aria-label="Add to wishlist"
                >
                  <i className="far fa-heart" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SignInRequiredModal open={signInModalOpen} onClose={() => setSignInModalOpen(false)} />
    </div>
  );
}
