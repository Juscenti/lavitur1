import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import {
  listProductMedia,
  uploadProductMedia,
  deleteProductMedia,
  setPrimaryMedia,
  publicMediaUrl,
} from '../lib/productMedia';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.jsx';
import '../styles/product.css';
import '../styles/productmodal.css';

const MAIN_CATEGORY_NAMES = ["Men's Wear", "Women's Wear", 'Unisex'];
const MAIN_CATEGORY_NORMS = new Set(
  ["men's wear", "mens wear", "menswear", "women's wear", "womens wear", "womenswear", 'unisex'].map((s) =>
    s.replace(/\s+/g, ' ').trim()
  )
);
const nameNorm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').replace(/['']/g, "'").trim();

const ALL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

function toUiProduct(row) {
  const cats = Array.isArray(row.categories) ? row.categories.filter((c) => c && c !== 'Unassigned') : [];
  const catDisplay = cats.length ? cats.join(', ') : (row.category || 'Unassigned');
  return {
    id: row.id,
    name: row.name ?? row.title,
    description: row.description ?? '',
    price: row.price,
    stock: row.stock ?? '',
    status: row.status,
    published: row.published ?? row.status === 'published',
    category: catDisplay,
    categories: cats.length ? cats : [],
    thumbUrl: row.thumbUrl ?? null,
    sizes: row.sizes || null,
  };
}

function formatMoney(n) {
  return `JMD ${Number(n || 0).toFixed(2)}`;
}

function getMainCategories(categories) {
  return (categories || []).filter((c) => MAIN_CATEGORY_NORMS.has(nameNorm(c.name)));
}
function getSubCategories(categories) {
  const mains = getMainCategories(categories);
  const mainIds = new Set(mains.map((c) => c.id));
  return (categories || []).filter((c) => !mainIds.has(c.id));
}

function productInMainView(prod, mainKey) {
  const cats = Array.isArray(prod.categories) ? prod.categories : [prod.category].filter(Boolean);
  const norms = new Set(cats.map((c) => nameNorm(c)));
  if (mainKey === 'general') return true;
  if (mainKey === 'unisex') return norms.has('unisex');
  if (mainKey === "menswear" || mainKey === "men's wear")
    return norms.has("men's wear") || norms.has('menswear') || norms.has('unisex');
  if (mainKey === 'womenswear' || mainKey === "women's wear")
    return norms.has("women's wear") || norms.has('womenswear') || norms.has('unisex');
  return norms.has(nameNorm(mainKey));
}

const MAIN_CAT_BOX_LABELS = { general: 'General', "men's wear": 'Menswear', "women's wear": 'Womenswear', unisex: 'Unisex' };
function getMainCatBoxLabel(name) {
  const n = nameNorm(name || 'general');
  return MAIN_CAT_BOX_LABELS[n] || name || 'General';
}

function statusBadgeClass(status) {
  switch (status) {
    case 'published': return 'badge--live';
    case 'pending': return 'badge--pending';
    case 'draft': return 'badge--draft';
    case 'archived': return 'badge--archived';
    default: return 'badge--draft';
  }
}

function statusDisplayText(status) {
  const s = (status || 'draft').toLowerCase();
  if (s === 'published') return 'Published';
  if (s === 'pending') return 'Pending';
  if (s === 'archived') return 'Archived';
  return 'Draft';
}

export default function Products() {
  const [productData, setProductData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [viewerStatus, setViewerStatus] = useState('');
  const [viewerCategory, setViewerCategory] = useState('');
  const [viewerSearch, setViewerSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleteIds, setBulkDeleteIds] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [editorialMode, setEditorialMode] = useState(false);
  const [editorialFilter, setEditorialFilter] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalProductId, setModalProductId] = useState(null);
  const [modalCategory, setModalCategory] = useState(null);

  // Core product fields
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formMainCat, setFormMainCat] = useState('');
  const [formSubCats, setFormSubCats] = useState([]);

  // Sizes
  const [formSizesEnabled, setFormSizesEnabled] = useState(false);
  const [formSizes, setFormSizes] = useState([]);

  // Colour variants
  const [colorVariantsEnabled, setColorVariantsEnabled] = useState(false);
  const [colorVariants, setColorVariants] = useState([]);
  const [addVariantOpen, setAddVariantOpen] = useState(false);
  const [newVariantName, setNewVariantName] = useState('');
  const [newVariantHex, setNewVariantHex] = useState('#000000');
  const [newVariantFiles, setNewVariantFiles] = useState([]);
  const [variantSaving, setVariantSaving] = useState(false);

  // Media
  const [mediaList, setMediaList] = useState([]);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [uploadTargetVariantId, setUploadTargetVariantId] = useState(null);
  /** Add mode: which colour to assign new uploads to (null/'' = Main, or variant _tempId) */
  const [uploadTargetTempId, setUploadTargetTempId] = useState(null);

  // Delete
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const showToast = useCallback((msg, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2500);
  }, []);

  const loadProducts = useCallback(async (noCache = false) => {
    try {
      const productsPath = noCache ? `/admin/products?_=${Date.now()}` : '/admin/products';
      const [productsRes, catRes] = await Promise.all([
        api.get(productsPath),
        api.get('/categories').catch(() => []),
      ]);
      if (!Array.isArray(productsRes)) {
        alert('Failed to load products');
        return;
      }
      setCategories(Array.isArray(catRes) ? catRes : []);
      setProductData(productsRes.map((r) => toUiProduct(r)));
    } catch (err) {
      console.error(err);
      alert('Failed to load products');
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const viewerFiltered = productData.filter((p) => {
    const status = (p.status || (p.published ? 'published' : 'draft')).toLowerCase();
    if (viewerStatus === 'published' && status !== 'published') return false;
    if (viewerStatus === 'draft' && status !== 'draft') return false;
    if (viewerStatus === 'archived' && status !== 'archived') return false;
    if (viewerStatus === 'pending' && status !== 'pending') return false;
    if (viewerCategory) {
      const cats = Array.isArray(p.categories) ? p.categories : [p.category].filter(Boolean);
      if (!cats.some((c) => String(c).trim() === viewerCategory)) return false;
    }
    if (viewerSearch.trim()) {
      const q = viewerSearch.trim().toLowerCase();
      const name = String(p.name ?? '').toLowerCase();
      const desc = String(p.description ?? '').toLowerCase();
      if (!name.includes(q) && !desc.includes(q)) return false;
    }
    return true;
  });

  const categoryOptions = [...new Set(productData.flatMap((p) => (Array.isArray(p.categories) ? p.categories : [p.category]).filter(Boolean)))].filter((c) => c && c !== 'Unassigned').sort((a, b) => String(a).localeCompare(b));

  const mains = getMainCategories(categories);
  const subs = getSubCategories(categories);

  const editorialFiltered =
    !editorialFilter
      ? []
      : editorialFilter.type === 'main'
        ? editorialFilter.value === 'general'
          ? productData
          : productData.filter((p) => productInMainView(p, editorialFilter.value))
        : productData.filter((p) => {
            const cats = Array.isArray(p.categories) ? p.categories : [];
            return cats.some((c) => nameNorm(c) === nameNorm(editorialFilter.value));
          });

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/admin/products/${id}/status`, { status });
      await loadProducts();
      showToast('Status updated', 'success');
    } catch (err) {
      alert(err?.data?.error || err?.message || 'Failed to update product status.');
    }
  };

  const bulkUpdateStatus = async (status) => {
    const ids = viewerFiltered.filter((p) => selectedIds.has(p.id)).map((p) => p.id);
    if (!ids.length) return;
    try {
      for (const id of ids) {
        await api.patch(`/admin/products/${id}/status`, { status });
      }
      setSelectedIds(new Set());
      await loadProducts();
      showToast(ids.length === 1 ? 'Status updated' : `${ids.length} products updated`, 'success');
    } catch (err) {
      alert(err?.data?.error || err?.message || 'Failed to update status.');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size >= viewerFiltered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(viewerFiltered.map((p) => p.id)));
    }
  };

  const toggleRowSelection = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetVariantForm = () => {
    setAddVariantOpen(false);
    setNewVariantName('');
    setNewVariantHex('#000000');
    setNewVariantFiles([]);
  };

  const openModal = (categoryName, productId) => {
    setModalCategory(categoryName || null);
    setModalProductId(productId || null);
    if (productId) {
      const existing = productData.find((p) => p.id === productId);
      if (existing) {
        setFormTitle(existing.name ?? '');
        setFormDescription(existing.description ?? '');
        setFormPrice(Number(existing.price ?? 0));
        setFormStock(Number(existing.stock ?? 0));
        setFormMainCat((existing.categories && existing.categories[0]) || '');
        setFormSubCats(existing.categories || []);
        const hasSizes = Array.isArray(existing.sizes) && existing.sizes.length > 0;
        setFormSizesEnabled(hasSizes);
        setFormSizes(hasSizes ? existing.sizes : []);
      }
      listProductMedia(productId).then(setMediaList);
      // Load colour variants for this product
      api.get(`/admin/products/${productId}/color-variants`)
        .then((variants) => {
          const list = Array.isArray(variants) ? variants : [];
          setColorVariantsEnabled(list.length > 0);
          setColorVariants(list);
        })
        .catch(() => {
          setColorVariants([]);
        });
    } else {
      setFormTitle('');
      setFormDescription('');
      setFormPrice('');
      setFormStock('');
      setFormMainCat(categoryName || '');
      setFormSubCats([]);
      setMediaList([]);
      setMediaFiles([]);
      setFormSizesEnabled(false);
      setFormSizes([]);
      setColorVariantsEnabled(false);
      setColorVariants([]);
    }
    resetVariantForm();
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalProductId(null);
    setMediaFiles([]);
    setUploadTargetVariantId(null);
    setUploadTargetTempId(null);
    setFormSizesEnabled(false);
    setFormSizes([]);
    setColorVariantsEnabled(false);
    setColorVariants([]);
    resetVariantForm();
  };

  const toggleSize = (s) => {
    setFormSizes((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const title = formTitle.trim();
    const mainCat = formMainCat;
    const categoryNames = [mainCat, ...formSubCats].filter(Boolean);
    if (!title) {
      alert('Name is required.');
      return;
    }
    if (!mainCat) {
      alert("Please select a main category (Men's Wear, Women's Wear, or Unisex).");
      return;
    }
    const price = Number(formPrice);
    const stock = Number(formStock);
    if (!Number.isFinite(price) || price < 0) {
      alert('Price must be 0 or greater.');
      return;
    }
    if (!Number.isFinite(stock) || stock < 0) {
      alert('Stock must be 0 or greater.');
      return;
    }

    const sizes = formSizesEnabled && formSizes.length > 0 ? formSizes : null;

    try {
      if (modalProductId) {
        await api.patch(`/admin/products/${modalProductId}`, {
          title,
          description: formDescription.trim() || null,
          price,
          stock,
          categoryNames,
          sizes,
        });
      } else {
        const res = await api.post('/admin/products', {
          title,
          description: formDescription.trim() || null,
          price,
          stock,
          categoryNames,
          sizes,
        });
        const newId = res.id;
        if (mediaFiles.length) {
          await uploadProductMedia(newId, mediaFiles, { makeFirstImagePrimary: true });
        }
        // Create queued colour variants for new product
        if (colorVariantsEnabled && colorVariants.length > 0) {
          for (let i = 0; i < colorVariants.length; i++) {
            const v = colorVariants[i];
            const variantRes = await api.post(`/admin/products/${newId}/color-variants`, {
              color_name: v.color_name,
              color_hex: v.color_hex || null,
              is_default: i === 0,
              position: i,
            });
            if (v.files && v.files.length && variantRes.id) {
              await uploadProductMedia(newId, v.files, { color_variant_id: variantRes.id });
            }
          }
        }
      }
      closeModal();
      await loadProducts();
    } catch (err) {
      alert(err?.message || 'Failed to save product.');
    }
  };

  const handleMediaInput = (e) => {
    const files = [...(e.target.files || [])];
    if (!files.length) return;
    if (uploadTargetTempId) {
      const variant = colorVariants.find((v) => v._tempId === uploadTargetTempId);
      if (variant) handleAddTempVariantFiles(variant, files);
    } else {
      setMediaFiles((prev) => [...prev, ...files]);
    }
    e.target.value = '';
  };

  useEffect(() => {
    if (!modalProductId || !modalOpen) return;
    listProductMedia(modalProductId).then(setMediaList);
  }, [modalProductId, modalOpen]);

  const handleUploadForEdit = async (e) => {
    const files = [...(e.target.files || [])];
    if (!files.length || !modalProductId) return;
    await uploadProductMedia(modalProductId, files, {
      color_variant_id: uploadTargetVariantId || null,
      makeFirstImagePrimary: !uploadTargetVariantId && mediaList.filter((m) => !m.color_variant_id).length === 0,
    });
    const list = await listProductMedia(modalProductId);
    setMediaList(list);
    if (uploadTargetVariantId) await reloadVariants();
    e.target.value = '';
  };

  const handleMediaReassign = async (mediaRow, newVariantId) => {
    if (!modalProductId) return;
    try {
      await api.patch(`/admin/products/${modalProductId}/media/${mediaRow.id}/color`, {
        color_variant_id: newVariantId || null,
      });
      const list = await listProductMedia(modalProductId);
      setMediaList(list);
      if (colorVariantsEnabled) await reloadVariants();
    } catch (err) {
      console.error('handleMediaReassign:', err);
      alert(err?.data?.error || err?.message || 'Failed to change photo colour.');
      const list = await listProductMedia(modalProductId);
      setMediaList(list);
    }
  };

  const handleDeleteMedia = async (m) => {
    await deleteProductMedia(m);
    setMediaList(await listProductMedia(modalProductId));
  };

  const handleSetPrimary = async (m) => {
    await setPrimaryMedia(modalProductId, m.id);
    setMediaList(await listProductMedia(modalProductId));
  };

  const reloadVariants = async () => {
    const updated = await api.get(`/admin/products/${modalProductId}/color-variants`);
    setColorVariants(Array.isArray(updated) ? updated : []);
  };

  const handleSetVariantDefault = async (variantId) => {
    await api.patch(`/admin/products/${modalProductId}/color-variants/${variantId}`, { is_default: true });
    await reloadVariants();
  };

  const handleVariantMediaUpload = async (variantId, files) => {
    if (!files || !files.length || !modalProductId) return;
    await uploadProductMedia(modalProductId, [...files], { color_variant_id: variantId });
    await reloadVariants();
  };

  const handleVariantMediaDelete = async (mediaRow) => {
    await deleteProductMedia(mediaRow);
    await reloadVariants();
  };

  const handleAddVariant = async () => {
    if (!newVariantName.trim()) {
      alert('Colour name is required.');
      return;
    }
    setVariantSaving(true);
    try {
      if (modalProductId) {
        // Edit mode: save to API immediately
        const variantRes = await api.post(`/admin/products/${modalProductId}/color-variants`, {
          color_name: newVariantName.trim(),
          color_hex: newVariantHex || null,
          is_default: colorVariants.length === 0,
          position: colorVariants.length,
        });
        if (newVariantFiles.length && variantRes.id) {
          await uploadProductMedia(modalProductId, newVariantFiles, { color_variant_id: variantRes.id });
        }
        const updated = await api.get(`/admin/products/${modalProductId}/color-variants`);
        setColorVariants(Array.isArray(updated) ? updated : []);
      } else {
        // New product: queue for creation after product save
        const tempId = `temp_${Date.now()}_${Math.random()}`;
        setColorVariants((prev) => [
          ...prev,
          {
            _tempId: tempId,
            color_name: newVariantName.trim(),
            color_hex: newVariantHex || null,
            is_default: prev.length === 0,
            files: newVariantFiles,
          },
        ]);
      }
      resetVariantForm();
    } catch (err) {
      alert(err?.message || 'Failed to add colour.');
    } finally {
      setVariantSaving(false);
    }
  };

  const handleDeleteVariant = async (variant) => {
    if (variant.id && modalProductId) {
      try {
        await api.delete(`/admin/products/${modalProductId}/color-variants/${variant.id}`);
        setColorVariants((prev) => prev.filter((v) => v.id !== variant.id));
      } catch (err) {
        alert(err?.message || 'Failed to remove colour.');
      }
    } else {
      setColorVariants((prev) => prev.filter((v) => v._tempId !== variant._tempId));
    }
  };

  /** Add files to a queued (temp) colour variant when adding a new product — so user can assign images before save. */
  const handleAddTempVariantFiles = (variant, files) => {
    if (!files?.length || !variant._tempId) return;
    const list = Array.from(files);
    setColorVariants((prev) =>
      prev.map((vv) =>
        vv._tempId === variant._tempId ? { ...vv, files: [...(vv.files || []), ...list] } : vv
      )
    );
  };

  const removeTempVariantFile = (variant, index) => {
    setColorVariants((prev) =>
      prev.map((vv) => {
        if (vv._tempId !== variant._tempId || !Array.isArray(vv.files)) return vv;
        const next = [...vv.files];
        next.splice(index, 1);
        return { ...vv, files: next };
      })
    );
  };

  const removeMainFile = (index) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const openDeleteModal = (prod) => {
    setProductToDelete(prod || null);
    setBulkDeleteIds(null);
    setDeleteModalOpen(true);
  };

  const openBulkDeleteModal = () => {
    const ids = viewerFiltered.filter((p) => selectedIds.has(p.id)).map((p) => p.id);
    if (!ids.length) return;
    setProductToDelete(null);
    setBulkDeleteIds(ids);
    setDeleteModalOpen(true);
  };

  const handleDeleteProduct = async (payload) => {
    const ids = Array.isArray(payload) ? payload : [payload ?? productToDelete?.id];
    if (!ids.length || ids.every((x) => !x)) {
      alert('No product selected.');
      return;
    }
    setDeleting(true);
    try {
      for (const productId of ids) {
        await api.delete(`/admin/products/${productId}?confirm=DELETE`);
      }
      setDeleteModalOpen(false);
      setProductToDelete(null);
      setBulkDeleteIds(null);
      setSelectedIds(new Set());
      await loadProducts(true);
      showToast(ids.length === 1 ? 'Product deleted' : `${ids.length} products deleted`, 'success');
    } catch (err) {
      alert(err?.data?.error || err?.message || 'Failed to delete product.');
    } finally {
      setDeleting(false);
    }
  };

  const selectedCount = viewerFiltered.filter((p) => selectedIds.has(p.id)).length;

  return (
    <div className="products-page">
      <header>
        <div>
          <h1>Product Management</h1>
          <p className="products-page-subtitle">{productData.length} product{productData.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="header-actions">
          <div className="mode-toggle">
            <label htmlFor="modeSwitch">Editorial Mode</label>
            <input
              type="checkbox"
              id="modeSwitch"
              checked={editorialMode}
              onChange={(e) => setEditorialMode(e.target.checked)}
            />
          </div>
          <button type="button" className="btn-add-product" onClick={() => openModal(null, null)}>
            + Add Product
          </button>
        </div>
      </header>

      <main>
        <section id="viewerModeSection" className={editorialMode ? 'hidden' : ''}>
          <div className="viewer-filters" id="viewerFilters">
            <div className="viewer-filter-group">
              <label htmlFor="viewerFilterStatus">Status</label>
              <select
                id="viewerFilterStatus"
                className="viewer-filter-select"
                value={viewerStatus}
                onChange={(e) => setViewerStatus(e.target.value)}
              >
                <option value="">All</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="viewer-filter-group">
              <label htmlFor="viewerFilterCategory">Category</label>
              <select
                id="viewerFilterCategory"
                className="viewer-filter-select"
                value={viewerCategory}
                onChange={(e) => setViewerCategory(e.target.value)}
              >
                <option value="">All</option>
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="viewer-filter-group search-wrap">
              <label htmlFor="viewerSearch">Search</label>
              <input
                id="viewerSearch"
                type="text"
                className="viewer-search-input"
                placeholder="Search products…"
                value={viewerSearch}
                onChange={(e) => setViewerSearch(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="viewer-filter-clear"
              onClick={() => {
                setViewerStatus('');
                setViewerCategory('');
                setViewerSearch('');
                setSelectedIds(new Set());
                showToast('Filters cleared', 'success');
              }}
            >
              Clear filters
            </button>
          </div>

          {selectedCount > 0 && (
            <div className="bulk-bar">
              <span className="bulk-count">{selectedCount} selected</span>
              <div className="bulk-actions">
                <button type="button" className="btn-bulk" onClick={() => bulkUpdateStatus('published')}>
                  Publish all
                </button>
                <button type="button" className="btn-bulk" onClick={() => bulkUpdateStatus('draft')}>
                  Set as draft
                </button>
                <button type="button" className="btn-bulk btn-bulk-danger" onClick={openBulkDeleteModal}>
                  Delete selected
                </button>
              </div>
            </div>
          )}

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="check-col">
                    <input
                      type="checkbox"
                      checked={viewerFiltered.length > 0 && selectedCount >= viewerFiltered.length}
                      onChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </th>
                  <th>Name</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Categories</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="viewerTableBody">
                {viewerFiltered.map((prod) => {
                  const status = (prod.status || (prod.published ? 'published' : 'draft')).toLowerCase();
                  const stockNum = Number(prod.stock) || 0;
                  const stockPct = stockNum > 40 ? 100 : stockNum > 20 ? 50 : stockNum > 0 ? 25 : 0;
                  return (
                    <tr key={prod.id} className={selectedIds.has(prod.id) ? 'selected' : ''}>
                      <td className="check-col">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(prod.id)}
                          onChange={() => toggleRowSelection(prod.id)}
                          aria-label={`Select ${prod.name}`}
                        />
                      </td>
                      <td>
                        <div className="product-name-cell">{prod.name}</div>
                        <div className="product-id-cell">#{String(prod.id).slice(0, 8)}</div>
                      </td>
                      <td className="price-cell">{formatMoney(prod.price)}</td>
                      <td>
                        <div className="stock-cell">
                          <span>{stockNum}</span>
                          <div className="stock-bar">
                            <div className={`stock-fill ${stockPct >= 50 ? '' : stockPct >= 25 ? 'mid' : 'low'}`} style={{ width: `${Math.min(100, stockPct)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`table-badge ${statusBadgeClass(status)}`}>{statusDisplayText(status)}</span>
                      </td>
                      <td>
                        <div className="cat-pills">
                          {(Array.isArray(prod.categories) ? prod.categories : [prod.category].filter(Boolean)).map((c) => (
                            <span key={c} className="cat-pill">{c}</span>
                          ))}
                          {(!prod.categories?.length && !prod.category) && <span className="cat-pill muted">—</span>}
                        </div>
                      </td>
                      <td>
                        <button type="button" className="btn-edit" onClick={() => openModal(null, prod.id)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn-delete"
                          onClick={() => openDeleteModal(prod)}
                          disabled={deleting}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section id="editorialModeSection" className={editorialMode ? '' : 'hidden'}>
          <div id="categoryContainer">
            {!editorialFilter ? (
              <div className="editorial-boxes-wrap">
                <div className="editorial-main-cats" id="editorialMainCats">
                  <div
                    className="editorial-cat-box"
                    role="button"
                    tabIndex={0}
                    onClick={() => setEditorialFilter({ type: 'main', value: 'general' })}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setEditorialFilter({ type: 'main', value: 'general' })}
                  >
                    <span className="editorial-cat-box-label">General</span>
                  </div>
                  {mains.map((c) => (
                    <div
                      key={c.id}
                      className="editorial-cat-box"
                      role="button"
                      tabIndex={0}
                      onClick={() => setEditorialFilter({ type: 'main', value: c.name })}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setEditorialFilter({ type: 'main', value: c.name })}
                    >
                      <span className="editorial-cat-box-label">{getMainCatBoxLabel(c.name)}</span>
                    </div>
                  ))}
                </div>
                <div className="editorial-subcats-row">
                  <span className="editorial-subcats-title">Sub-Cats</span>
                  <div className="editorial-subcats-inner">
                    {subs.length
                      ? subs.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            className="editorial-subcat-chip"
                            onClick={() => setEditorialFilter({ type: 'sub', value: s.name })}
                          >
                            {s.name}
                          </button>
                        ))
                      : <span style={{ fontSize: 13, color: 'var(--muted)' }}>No sub-categories</span>}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="editorial-filtered-header">
                  <button type="button" className="editorial-back-to-cats" onClick={() => setEditorialFilter(null)}>
                    ← Back to categories
                  </button>
                  <h3>
                    {editorialFilter.type === 'main'
                      ? getMainCatBoxLabel(editorialFilter.value)
                      : editorialFilter.value}
                  </h3>
                  <button
                    type="button"
                    className="addInCategoryBtn"
                    onClick={() => openModal(editorialFilter.type === 'sub' ? editorialFilter.value : editorialFilter.value === 'general' ? null : editorialFilter.value, null)}
                  >
                    + Add Product
                  </button>
                </div>
                <div id="editorialFilteredGrid" className="product-grid">
                  {editorialFiltered.map((p) => {
                    const status = (p.status || 'draft').toLowerCase();
                    const statusText = status === 'published' ? 'Live' : status === 'pending' ? 'Pending' : status === 'archived' ? 'Archived' : 'Draft';
                    return (
                      <div key={p.id} className="product-card">
                        <div className="pcard-top">
                          <div className="pcard-thumb">
                            {p.thumbUrl ? (
                              <img src={p.thumbUrl} alt={p.name} />
                            ) : (
                              <div className="pcard-thumb--empty">No Image</div>
                            )}
                            <div className={`pcard-badge ${statusBadgeClass(p.status)}`}>{statusText}</div>
                          </div>
                          <div className="pcard-meta">
                            <div className="pcard-title">{p.name}</div>
                            <div className="pcard-price">{formatMoney(p.price)}</div>
                            <div className="pcard-sub">{String(p.stock ?? '—')} in stock</div>
                          </div>
                        </div>
                        <div className="pcard-actions">
                          {status === 'published' && (
                            <button className="pbtn2 pbtn2--primary" onClick={() => updateStatus(p.id, 'archived')}>
                              Archive
                            </button>
                          )}
                          {status === 'archived' && (
                            <button className="pbtn2 pbtn2--primary" onClick={() => updateStatus(p.id, 'pending')}>
                              Restore to pending
                            </button>
                          )}
                          {status === 'pending' && (
                            <button className="pbtn2 pbtn2--primary" onClick={() => updateStatus(p.id, 'published')}>
                              Publish
                            </button>
                          )}
                          {(status === 'draft' || !status) && (
                            <>
                              <button className="pbtn2 pbtn2--ghost" onClick={() => updateStatus(p.id, 'pending')}>
                                Submit
                              </button>
                              <button className="pbtn2 pbtn2--primary" onClick={() => updateStatus(p.id, 'published')}>
                                Publish
                              </button>
                            </>
                          )}
                          <button className="pbtn2 pbtn2--ghost editBtn" onClick={() => openModal(null, p.id)}>
                            Edit
                          </button>
                          <button
                            type="button"
                            className="pbtn2 pbtn2--danger"
                            onClick={() => openDeleteModal(p)}
                            disabled={deleting}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </section>
      </main>

      <ConfirmDeleteModal
        open={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setProductToDelete(null); setBulkDeleteIds(null); }}
        onConfirm={handleDeleteProduct}
        confirmPayload={bulkDeleteIds || (productToDelete?.id ?? null)}
        title={bulkDeleteIds ? `Delete ${bulkDeleteIds.length} products?` : (productToDelete ? `Delete product "${productToDelete.name}"?` : 'Delete product?')}
        bodyLabel="Product"
        deleting={deleting}
      />

      {toasts.length > 0 && (
        <div className="toast-container" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className={`toast toast--${t.type}`}>
              {t.msg}
            </div>
          ))}
        </div>
      )}

      <div id="productFormModal" className={`pmodal ${modalOpen ? '' : 'hidden'}`}>
        <div className="pmodal__overlay" onClick={closeModal} aria-hidden="true" />
        <div className="pmodal__dialog" role="dialog" aria-modal="true" aria-labelledby="productFormTitle">
          <div className="pmodal__header">
            <h2 id="productFormTitle">{modalProductId ? `Edit Product` : 'Add Product'}</h2>
            <button type="button" className="pmodal__iconbtn" onClick={closeModal} aria-label="Close">
              ✕
            </button>
          </div>
          <div className="pmodal__body">
            <form id="productForm" className="pmodal__left" onSubmit={handleSubmit}>
              <div className="pfield">
                <label htmlFor="title">Name</label>
                <input id="title" name="title" type="text" placeholder="Product name" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
              </div>
              <div className="pfield">
                <label htmlFor="description">Description</label>
                <textarea id="description" name="description" rows={5} placeholder="Short product description" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
              </div>
              <div className="pgrid2">
                <div className="pfield">
                  <label htmlFor="price">Price (JMD)</label>
                  <input id="price" name="price" type="number" min={0} step={0.01} placeholder="0.00" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} />
                </div>
                <div className="pfield">
                  <label htmlFor="stock">Stock</label>
                  <input id="stock" name="stock" type="number" min={0} step={1} placeholder="0" value={formStock} onChange={(e) => setFormStock(e.target.value)} />
                </div>
              </div>
              <div className="pfield">
                <label htmlFor="productMainCategory">Main category</label>
                <select id="productMainCategory" name="mainCategory" required value={formMainCat} onChange={(e) => setFormMainCat(e.target.value)}>
                  <option value="">— Select —</option>
                  {mains.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="pfield">
                <label htmlFor="productSubCategories">Sub-categories (add-ons)</label>
                <select
                  id="productSubCategories"
                  multiple
                  className="category-multiselect"
                  value={formSubCats}
                  onChange={(e) => setFormSubCats(Array.from(e.target.selectedOptions, (o) => o.value))}
                >
                  {subs.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <span className="pfield-hint">Hold Ctrl/Cmd to select multiple. Optional.</span>
              </div>

              {/* Custom Sizes */}
              <div className="pfield">
                <div className="ptoggle-row">
                  <label className="ptoggle-label">Custom sizes</label>
                  <label className="ptoggle">
                    <input
                      type="checkbox"
                      checked={formSizesEnabled}
                      onChange={(e) => setFormSizesEnabled(e.target.checked)}
                    />
                    <span className="ptoggle__track" />
                  </label>
                </div>
                {formSizesEnabled && (
                  <>
                    <div className="psize-btns">
                      {ALL_SIZES.map((s) => (
                        <button
                          key={s}
                          type="button"
                          className={'psize-btn' + (formSizes.includes(s) ? ' active' : '')}
                          onClick={() => toggleSize(s)}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    {formSizes.length === 0 && (
                      <span className="pfield-hint" style={{ color: 'rgba(255,200,100,.8)' }}>
                        Select at least one size, or turn off to use default sizes (XS – XL).
                      </span>
                    )}
                  </>
                )}
                {!formSizesEnabled && (
                  <span className="pfield-hint">Off — shop will show default sizes (XS, S, M, L, XL).</span>
                )}
              </div>

              {/* Colour Variants */}
              <div className="pfield">
                <div className="ptoggle-row">
                  <label className="ptoggle-label">Colour variants</label>
                  <label className="ptoggle">
                    <input
                      type="checkbox"
                      checked={colorVariantsEnabled}
                      onChange={(e) => {
                        const on = e.target.checked;
                        setColorVariantsEnabled(on);
                        // Re-fetch variants when toggling on in edit mode in case initial load failed
                        if (on && modalProductId && colorVariants.length === 0) {
                          api.get(`/admin/products/${modalProductId}/color-variants`)
                            .then((v) => setColorVariants(Array.isArray(v) ? v : []))
                            .catch(() => {});
                        }
                      }}
                    />
                    <span className="ptoggle__track" />
                  </label>
                </div>
                {!colorVariantsEnabled && (
                  <span className="pfield-hint">Off — product will not show colour options on the shop.</span>
                )}
                {colorVariantsEnabled && (
                  <div className="pvariant-section">
                    <p className="pfield-hint" style={{ marginBottom: 6 }}>
                      Each colour gets its own photos. The main product photos above show when no colour is selected.
                    </p>
                    {colorVariants.map((v) => (
                      <div key={v.id || v._tempId} className="pvariant-card">
                        {/* Header row */}
                        <div className="pvariant-row">
                          <span
                            className="pvariant-swatch"
                            style={{ background: v.color_hex || '#888' }}
                          />
                          <span className="pvariant-name">{v.color_name}</span>
                          {v.is_default ? (
                            <span className="pvariant-default-badge">Default</span>
                          ) : (
                            v.id && (
                              <button
                                type="button"
                                className="pvariant-set-default"
                                onClick={() => handleSetVariantDefault(v.id)}
                              >
                                Set default
                              </button>
                            )
                          )}
                          <button
                            type="button"
                            className="pvariant-delete"
                            onClick={() => handleDeleteVariant(v)}
                          >
                            Remove
                          </button>
                        </div>
                        {/* Image strip — saved variants (edit mode) */}
                        {v.id && (
                          <div className="pvariant-images">
                            {(v.media || []).map((m) => (
                              <div key={m.id} className="pvariant-image-thumb">
                                <img src={m.public_url} alt={v.color_name} />
                                <button
                                  type="button"
                                  className="pvariant-image-remove"
                                  onClick={() => handleVariantMediaDelete(m)}
                                  title="Remove image"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                            <label className="pvariant-upload-btn" title="Add images for this colour">
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                  handleVariantMediaUpload(v.id, e.target.files);
                                  e.target.value = '';
                                }}
                              />
                              <span>+ Add</span>
                            </label>
                          </div>
                        )}
                        {/* Pending files preview — new product mode: queue images before save */}
                        {!v.id && (
                          <div className="pvariant-images">
                            {Array.isArray(v.files) &&
                              v.files.length > 0 &&
                              v.files.map((f, fi) => (
                                <div key={fi} className="pvariant-image-thumb">
                                  <img src={URL.createObjectURL(f)} alt={`preview ${fi}`} />
                                  <button
                                    type="button"
                                    className="pvariant-image-remove"
                                    onClick={() => removeTempVariantFile(v, fi)}
                                    title="Remove"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            <label className="pvariant-upload-btn" title="Add images for this colour">
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                  handleAddTempVariantFiles(v, e.target.files);
                                  e.target.value = '';
                                }}
                              />
                              <span>+ Add</span>
                            </label>
                          </div>
                        )}
                        {!v.id && (!v.files || v.files.length === 0) && (
                          <p className="pfield-hint" style={{ marginTop: 4 }}>
                            No images queued — use + Add to assign photos to this colour before saving.
                          </p>
                        )}
                      </div>
                    ))}

                    {addVariantOpen ? (
                      <div className="pvariant-add-form">
                        <div className="pgrid2">
                          <div className="pfield">
                            <label>Colour name</label>
                            <input
                              type="text"
                              placeholder="e.g. Navy Blue"
                              value={newVariantName}
                              onChange={(e) => setNewVariantName(e.target.value)}
                            />
                          </div>
                          <div className="pfield">
                            <label>Colour picker</label>
                            <input
                              type="color"
                              value={newVariantHex}
                              onChange={(e) => setNewVariantHex(e.target.value)}
                              className="pcolor-input"
                            />
                          </div>
                        </div>
                        <div className="pfield">
                          <label>Images for this colour</label>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => setNewVariantFiles([...(e.target.files || [])])}
                            className="pfile-input"
                          />
                          {newVariantFiles.length > 0 && (
                            <span className="pfield-hint">{newVariantFiles.length} file{newVariantFiles.length !== 1 ? 's' : ''} selected</span>
                          )}
                        </div>
                        <div className="pvariant-add-actions">
                          <button
                            type="button"
                            className="pbtn pbtn--ghost"
                            onClick={resetVariantForm}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="pbtn pbtn--primary"
                            onClick={handleAddVariant}
                            disabled={variantSaving}
                          >
                            {variantSaving ? 'Adding…' : 'Add colour'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="pbtn pbtn--ghost pvariant-add-btn"
                        onClick={() => setAddVariantOpen(true)}
                      >
                        + Add colour
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="pmodal__footer">
                <button type="button" className="pbtn pbtn--ghost" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="pbtn pbtn--primary">
                  Save
                </button>
              </div>
            </form>
            <aside className="pmodal__right">
              <div className="pmedia">
                <div className="pmedia__header">
                  <div>
                    <div className="pmedia__title">Photos</div>
                    <div className="pmedia__sub">
                      Upload photos here. The primary photo shows first on the shop.
                      {colorVariantsEnabled && ' Assign each photo to a colour below.'}
                    </div>
                  </div>
                </div>

                {/* Upload target picker — Edit: saved variant ids; Add: temp variants so uploads assign to colour before save */}
                {colorVariantsEnabled && colorVariants.length > 0 && (
                  <div className="pmedia-target-row">
                    <span className="pmedia-target-label">Upload to</span>
                    {modalProductId ? (
                      <select
                        className="pmedia-target-select"
                        value={uploadTargetVariantId || ''}
                        onChange={(e) => setUploadTargetVariantId(e.target.value || null)}
                      >
                        <option value="">Main (no colour)</option>
                        {colorVariants.filter((v) => v.id).map((v) => (
                          <option key={v.id} value={v.id}>{v.color_name}</option>
                        ))}
                      </select>
                    ) : (
                      <select
                        className="pmedia-target-select"
                        value={uploadTargetTempId || ''}
                        onChange={(e) => setUploadTargetTempId(e.target.value || null)}
                      >
                        <option value="">Main (no colour)</option>
                        {colorVariants.filter((v) => v._tempId).map((v) => (
                          <option key={v._tempId} value={v._tempId}>{v.color_name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                <label className="pupload">
                  <input id="productMediaInput" type="file" accept="image/*,video/mp4" multiple onChange={modalProductId ? handleUploadForEdit : handleMediaInput} />
                  <div className="pupload__box">
                    <div className="pupload__icon">⬆</div>
                    <div className="pupload__text">
                      <div className="pupload__headline">Drop files here or click to upload</div>
                      <div className="pupload__meta">PNG, JPG, MP4</div>
                    </div>
                  </div>
                </label>

                <div id="productMediaGrid" className="media-grid">
                  {modalProductId
                    ? mediaList.map((m) => {
                        const variantInfo = m.color_variant_id
                          ? colorVariants.find((v) => v.id === m.color_variant_id)
                          : null;
                        return (
                          <div key={m.id} className="media-card">
                            {m.media_type === 'video' ? (
                              <video src={m.public_url || publicMediaUrl(m.file_path)} controls />
                            ) : (
                              <img src={m.public_url || publicMediaUrl(m.file_path)} alt="product media" />
                            )}
                            {/* Colour assignment row */}
                            {colorVariantsEnabled && colorVariants.some((v) => v.id) && (
                              <div className="media-color-row">
                                <span
                                  className="media-color-dot"
                                  style={{ background: variantInfo?.color_hex || (variantInfo ? '#888' : 'transparent'), border: variantInfo ? 'none' : '1.5px solid rgba(255,255,255,.3)' }}
                                />
                                <select
                                  className="media-color-select"
                                  value={m.color_variant_id ? String(m.color_variant_id) : ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    handleMediaReassign(m, val === '' ? null : val);
                                  }}
                                >
                                  <option value="">Main</option>
                                  {colorVariants.filter((v) => v.id).map((v) => (
                                    <option key={v.id} value={String(v.id)}>{v.color_name}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                            <div className="media-actions">
                              <button type="button" className="primary" onClick={() => handleSetPrimary(m)}>
                                {m.is_primary ? 'Primary ✓' : 'Set Primary'}
                              </button>
                              <button type="button" className="delete" onClick={() => handleDeleteMedia(m)}>
                                Delete
                              </button>
                            </div>
                          </div>
                        );
                      })
                    : (() => {
                        const hasMain = mediaFiles.length > 0;
                        const variantEntries = colorVariants.filter((v) => v._tempId && Array.isArray(v.files) && v.files.length > 0);
                        const hasAny = hasMain || variantEntries.length > 0;
                        if (!hasAny) {
                          return <div style={{ opacity: 0.7 }}>Select images, then click Save to upload them. Use &quot;Upload to&quot; above to assign photos to a colour.</div>;
                        }
                        return (
                          <>
                            {mediaFiles.map((f, i) => (
                              <div key={`main-${i}`} className="media-card">
                                {f.type.startsWith('video/') ? (
                                  <video src={URL.createObjectURL(f)} controls />
                                ) : (
                                  <img src={URL.createObjectURL(f)} alt="preview" />
                                )}
                                {colorVariantsEnabled && (
                                  <div className="media-color-row">
                                    <span className="media-color-dot" style={{ border: '1.5px solid rgba(255,255,255,.3)', background: 'transparent' }} />
                                    <span className="media-color-select" style={{ cursor: 'default' }}>Main</span>
                                  </div>
                                )}
                                <div className="media-actions">
                                  <button type="button" className="delete" onClick={() => removeMainFile(i)}>Delete</button>
                                </div>
                              </div>
                            ))}
                            {variantEntries.map((v) =>
                              (v.files || []).map((f, fi) => (
                                <div key={`${v._tempId}-${fi}`} className="media-card">
                                  {f.type.startsWith('video/') ? (
                                    <video src={URL.createObjectURL(f)} controls />
                                  ) : (
                                    <img src={URL.createObjectURL(f)} alt={v.color_name} />
                                  )}
                                  {colorVariantsEnabled && (
                                    <div className="media-color-row">
                                      <span className="media-color-dot" style={{ background: v.color_hex || '#888' }} />
                                      <span className="media-color-select" style={{ cursor: 'default' }}>{v.color_name}</span>
                                    </div>
                                  )}
                                  <div className="media-actions">
                                    <button type="button" className="delete" onClick={() => removeTempVariantFile(v, fi)}>Delete</button>
                                  </div>
                                </div>
                              ))
                            )}
                          </>
                        );
                      })()}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
