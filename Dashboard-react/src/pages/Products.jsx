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

export default function Products() {
  const [productData, setProductData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [viewerStatus, setViewerStatus] = useState('');
  const [viewerCategory, setViewerCategory] = useState('');
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

  // Delete
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

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
    if (viewerStatus === 'published' && !p.published) return false;
    if (viewerStatus === 'unpublished' && p.published) return false;
    if (viewerCategory) {
      const cats = Array.isArray(p.categories) ? p.categories : [p.category].filter(Boolean);
      if (!cats.some((c) => String(c).trim() === viewerCategory)) return false;
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
    } catch (err) {
      alert(err?.data?.error || err?.message || 'Failed to update product status.');
    }
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
    setMediaFiles((prev) => [...prev, ...files]);
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
    await api.patch(`/admin/products/${modalProductId}/media/${mediaRow.id}/color`, {
      color_variant_id: newVariantId || null,
    });
    const list = await listProductMedia(modalProductId);
    setMediaList(list);
    if (colorVariantsEnabled) await reloadVariants();
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

  const openDeleteModal = (prod) => {
    setProductToDelete(prod);
    setDeleteModalOpen(true);
  };

  const handleDeleteProduct = async (id) => {
    const productId = id ?? productToDelete?.id;
    if (!productId) {
      alert('No product selected.');
      return;
    }
    setDeleting(true);
    try {
      await api.delete(`/admin/products/${productId}?confirm=DELETE`);
      setDeleteModalOpen(false);
      setProductToDelete(null);
      await loadProducts(true);
    } catch (err) {
      alert(err?.data?.error || err?.message || 'Failed to delete product.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="products-page">
      <header>
        <h1>Product Management</h1>
        <div className="mode-toggle">
          <label htmlFor="modeSwitch">Editorial Mode</label>
          <input
            type="checkbox"
            id="modeSwitch"
            checked={editorialMode}
            onChange={(e) => setEditorialMode(e.target.checked)}
          />
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
                <option value="unpublished">Unpublished</option>
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
            <button
              type="button"
              className="viewer-filter-clear"
              onClick={() => {
                setViewerStatus('');
                setViewerCategory('');
              }}
            >
              Clear filters
            </button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Category</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="viewerTableBody">
              {viewerFiltered.map((prod) => (
                <tr key={prod.id}>
                  <td>{prod.name}</td>
                  <td>{formatMoney(prod.price)}</td>
                  <td>{String(prod.stock ?? '')}</td>
                  <td>{prod.published ? 'Published' : 'Unpublished'}</td>
                  <td>{prod.category}</td>
                  <td>
                    <button type="button" data-action="edit" onClick={() => openModal(null, prod.id)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      style={{ marginLeft: '0.5rem' }}
                      onClick={() => openDeleteModal(prod)}
                      disabled={deleting}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section id="editorialModeSection" className={editorialMode ? '' : 'hidden'}>
          <div className="editorial-header">
            <h2>Editorial View</h2>
            <button type="button" id="addGeneralProductBtn" onClick={() => openModal(null, null)}>
              + Add Product
            </button>
          </div>

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
        onClose={() => { setDeleteModalOpen(false); setProductToDelete(null); }}
        onConfirm={handleDeleteProduct}
        confirmPayload={productToDelete?.id}
        title={productToDelete ? `Delete product "${productToDelete.name}"?` : 'Delete product?'}
        bodyLabel="Product"
        deleting={deleting}
      />

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
                        {/* Pending files preview — new product mode */}
                        {!v.id && Array.isArray(v.files) && v.files.length > 0 && (
                          <div className="pvariant-images">
                            {v.files.map((f, fi) => (
                              <div key={fi} className="pvariant-image-thumb">
                                <img src={URL.createObjectURL(f)} alt={`preview ${fi}`} />
                              </div>
                            ))}
                          </div>
                        )}
                        {!v.id && (!v.files || v.files.length === 0) && (
                          <p className="pfield-hint" style={{ marginTop: 4 }}>No images queued — add them after saving.</p>
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

                {/* Upload target picker — only in edit mode when saved colour variants exist */}
                {modalProductId && colorVariantsEnabled && colorVariants.some((v) => v.id) && (
                  <div className="pmedia-target-row">
                    <span className="pmedia-target-label">Upload to</span>
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
                                  value={m.color_variant_id || ''}
                                  onChange={(e) => handleMediaReassign(m, e.target.value || null)}
                                >
                                  <option value="">Main</option>
                                  {colorVariants.filter((v) => v.id).map((v) => (
                                    <option key={v.id} value={v.id}>{v.color_name}</option>
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
                    : mediaFiles.length
                      ? mediaFiles.map((f, i) => (
                          <div key={i} className="media-card">
                            {f.type.startsWith('video/') ? (
                              <video src={URL.createObjectURL(f)} controls />
                            ) : (
                              <img src={URL.createObjectURL(f)} alt="preview" />
                            )}
                          </div>
                        ))
                      : <div style={{ opacity: 0.7 }}>Select images, then click Save to upload them.</div>}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
