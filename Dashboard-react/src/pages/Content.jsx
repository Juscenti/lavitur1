import { useEffect, useState, useCallback, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  listContentBlocks,
  getContentBlock,
  createContentBlock,
  updateContentBlock,
  deleteContentBlock,
  reorderContentBlocks,
  uploadContentImage,
} from '../lib/contentBlocks.js';
import { api } from '../lib/api.js';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.jsx';
import '../styles/content.css';

const BLOCK_TYPES = [
  { value: 'hero', label: 'Hero' },
  { value: 'homepage_section', label: 'Homepage section' },
  { value: 'banner', label: 'Banner' },
  { value: 'collections', label: 'Collections' },
  { value: 'split', label: 'Split (e.g. Women / Men)' },
  { value: 'top_picks', label: 'Top Picks heading' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'faq', label: 'FAQ' },
  { value: 'guide', label: 'Guide' },
];

const BLOCK_PAGES = [
  { value: '', label: 'Any / Global' },
  { value: 'home', label: 'Home' },
  { value: 'shop', label: 'Shop' },
];

const CONTENT_PAGES = [
  { value: 'home', label: 'Home' },
  { value: 'shop', label: 'Shop' },
];

function slugify(text) {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || '';
}

function Status({ loading, error }) {
  if (loading) return <p className="content-status">Loading content…</p>;
  if (error) return <p className="content-status content-status--error">{error}</p>;
  return null;
}

function SortableRow({ item, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <tr ref={setNodeRef} style={style} className={isDragging ? 'content-table-row--dragging' : ''}>
      <td className="content-page-td-drag">
        <span className="content-drag-handle" {...attributes} {...listeners} aria-label="Drag to reorder">
          ⋮⋮
        </span>
      </td>
      <td className="content-page-td-thumb">
        {item.media_url ? (
          <img src={item.media_url} alt="" className="content-thumb" />
        ) : (
          <span className="content-thumb-placeholder">—</span>
        )}
      </td>
      <td><span className="content-type-badge">{item.type}</span></td>
      <td><code className="content-slug">{item.slug}</code></td>
      <td><strong className="content-title-cell">{item.title}</strong></td>
      <td><span className="content-page-page">{item.page || '—'}</span></td>
      <td><span className="content-page-variant">{item.variant || '—'}</span></td>
      <td><span className={`content-active-pill ${item.is_active ? 'content-active-pill--on' : ''}`}>{item.is_active ? 'Active' : 'Off'}</span></td>
      <td>{item.updated_at ? new Date(item.updated_at).toLocaleString() : '—'}</td>
      <td className="content-page-actions">
        <button type="button" className="btn btn-small content-btn-edit" onClick={() => onEdit(item)}>Edit</button>
        <button type="button" className="btn btn-small btn-danger content-btn-delete" onClick={() => onDelete(item)}>Delete</button>
      </td>
    </tr>
  );
}

export default function Content() {
  const [items, setItems] = useState([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formType, setFormType] = useState('hero');
  const [formSlug, setFormSlug] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formMediaUrl, setFormMediaUrl] = useState('');
  const [formCtaLabel, setFormCtaLabel] = useState('');
  const [formCtaUrl, setFormCtaUrl] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [formPage, setFormPage] = useState('');
  const [formVariant, setFormVariant] = useState('');
  const [formSortOrder, setFormSortOrder] = useState('');
  const [activeVariants, setActiveVariants] = useState({ home: 'default', shop: 'default' });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [formHeroTagline, setFormHeroTagline] = useState('');
  const [formSlideUrls, setFormSlideUrls] = useState([]);
  const [formSplitTiles, setFormSplitTiles] = useState([]);
  const [formCollectionsItems, setFormCollectionsItems] = useState([]);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [blockToDelete, setBlockToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef(null);
  const heroSlidesInputRef = useRef(null);
  const tileImageInputRef = useRef(null);
  const collectionImageInputRef = useRef(null);
  const pendingTileIndexRef = useRef(null);
  const pendingCollectionIndexRef = useRef(null);
  const [uploadingTileIndex, setUploadingTileIndex] = useState(null);
  const [uploadingCollectionIndex, setUploadingCollectionIndex] = useState(null);

  const fetchList = useCallback(() => {
    setLoading(true);
    setError('');
    listContentBlocks({ type: typeFilter || undefined, search: search.trim() || undefined })
      .then(setItems)
      .catch((err) => setError(err?.message || 'Failed to load content.'))
      .finally(() => setLoading(false));
  }, [typeFilter, search]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    let cancelled = false;
    api.get('/admin/settings')
      .then((data) => {
        if (cancelled) return;
        const v = data?.content?.variants;
        if (v && typeof v === 'object') setActiveVariants((prev) => ({ ...prev, ...v }));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(items, oldIndex, newIndex).map((i) => i.id);
    reorderContentBlocks(newOrder)
      .then(() => setItems((prev) => arrayMove(prev, oldIndex, newIndex)))
      .catch((err) => setError(err?.message || 'Failed to reorder'));
  };

  const openCreate = () => {
    setEditingId(null);
    setFormType('hero');
    setFormSlug('');
    setFormTitle('');
    setFormBody('');
    setFormMediaUrl('');
    setFormCtaLabel('');
    setFormCtaUrl('');
    setFormActive(true);
    setFormPage('');
    setFormVariant('');
    setFormSortOrder('');
    setFormHeroTagline('');
    setFormSlideUrls([]);
    setFormSplitTiles([]);
    setFormCollectionsItems([]);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setFormError('');
    setModalOpen(true);
    getContentBlock(item.id)
      .then((block) => {
        setFormType(block.type || 'hero');
        setFormSlug(block.slug || '');
        setFormTitle(block.title || '');
        setFormBody(block.body || '');
        setFormMediaUrl(block.media_url || '');
        setFormCtaLabel(block.cta_label || '');
        setFormCtaUrl(block.cta_url || '');
        setFormActive(block.is_active !== false);
        setFormPage(block.page != null ? String(block.page) : '');
        setFormVariant(block.variant != null ? String(block.variant) : '');
        setFormSortOrder(block.sort_order != null ? String(block.sort_order) : '');
        if (block.type === 'hero' && block.body) {
          try {
            const parsed = JSON.parse(block.body);
            setFormHeroTagline(parsed.tagline != null ? String(parsed.tagline) : '');
            setFormSlideUrls(Array.isArray(parsed.slides) ? parsed.slides : []);
          } catch {
            setFormHeroTagline('');
            setFormSlideUrls([]);
          }
        } else {
          setFormHeroTagline('');
          setFormSlideUrls([]);
        }
        if (block.type === 'split' && block.body) {
          try {
            const parsed = JSON.parse(block.body);
            setFormSplitTiles(Array.isArray(parsed) ? parsed : []);
          } catch {
            setFormSplitTiles([]);
          }
        } else {
          setFormSplitTiles([]);
        }
        if (block.type === 'collections' && block.body) {
          try {
            const parsed = JSON.parse(block.body);
            setFormCollectionsItems(Array.isArray(parsed) ? parsed : []);
          } catch {
            setFormCollectionsItems([]);
          }
        } else {
          setFormCollectionsItems([]);
        }
      })
      .catch((err) => setFormError(err?.message || 'Failed to load block'));
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setFormError('');
  };

  const handleTitleBlur = () => {
    if (!editingId && formTitle && !formSlug) setFormSlug(slugify(formTitle));
  };

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    const ok = file.type.startsWith('image/') || file.type.startsWith('video/');
    if (!ok) return;
    setImageUploading(true);
    try {
      const url = await uploadContentImage(file);
      if (url) setFormMediaUrl(url);
    } catch (err) {
      setFormError(err?.message || 'Upload failed');
    } finally {
      setImageUploading(false);
    }
  }, []);

  const handleHeroSlidesUpload = useCallback(async (files) => {
    const imageFiles = Array.from(files || []).filter((f) => f.type.startsWith('image/'));
    if (!imageFiles.length) return;
    setImageUploading(true);
    setFormError('');
    try {
      const urls = [];
      for (const file of imageFiles) {
        const url = await uploadContentImage(file);
        if (url) urls.push(url);
      }
      if (urls.length) setFormSlideUrls((prev) => [...prev, ...urls]);
    } catch (err) {
      setFormError(err?.message || 'Image upload failed');
    } finally {
      setImageUploading(false);
    }
  }, []);

  const removeSlide = (index) => {
    setFormSlideUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const moveSlide = (index, direction) => {
    setFormSlideUrls((prev) => {
      const next = [...prev];
      const to = index + direction;
      if (to < 0 || to >= next.length) return prev;
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });
  };

  const addSplitTile = () => setFormSplitTiles((prev) => [...prev, { img: '', label: '', url: '' }]);
  const removeSplitTile = (index) => setFormSplitTiles((prev) => prev.filter((_, i) => i !== index));
  const updateSplitTile = (index, field, value) => {
    setFormSplitTiles((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  };

  const addCollectionsItem = () => setFormCollectionsItems((prev) => [...prev, { slug: '', label: '', img: '' }]);
  const removeCollectionsItem = (index) => setFormCollectionsItems((prev) => prev.filter((_, i) => i !== index));
  const updateCollectionsItem = (index, field, value) => {
    setFormCollectionsItems((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  };

  const handleTileImageUpload = useCallback(async (file, index) => {
    if (!file || (!file.type.startsWith('image/') && !file.type.startsWith('video/'))) return;
    setImageUploading(true);
    setUploadingTileIndex(index);
    setFormError('');
    try {
      const url = await uploadContentImage(file);
      if (url) setFormSplitTiles((prev) => prev.map((t, i) => (i === index ? { ...t, img: url } : t)));
    } catch (err) {
      setFormError(err?.message || 'Upload failed');
    } finally {
      setImageUploading(false);
      setUploadingTileIndex(null);
    }
  }, []);

  const handleCollectionImageUpload = useCallback(async (file, index) => {
    if (!file || (!file.type.startsWith('image/') && !file.type.startsWith('video/'))) return;
    setImageUploading(true);
    setUploadingCollectionIndex(index);
    setFormError('');
    try {
      const url = await uploadContentImage(file);
      if (url) setFormCollectionsItems((prev) => prev.map((c, i) => (i === index ? { ...c, img: url } : c)));
    } catch (err) {
      setFormError(err?.message || 'Upload failed');
    } finally {
      setImageUploading(false);
      setUploadingCollectionIndex(null);
    }
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onPaste = useCallback((e) => {
    const item = e.clipboardData?.items?.[0];
    if (item?.kind === 'file' && item.type.startsWith('image/')) {
      e.preventDefault();
      const file = item.getAsFile();
      if (file) handleFile(file);
    }
  }, [handleFile]);

  useEffect(() => {
    if (!modalOpen) return;
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [modalOpen, onPaste]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!formSlug.trim() || !formTitle.trim() || !formType) {
      setFormError('Type, slug, and title are required.');
      return;
    }
    setFormSubmitting(true);
    try {
      const isHero = formType === 'hero';
      const isSplit = formType === 'split';
      const isCollections = formType === 'collections';
      let body = formBody.trim() || null;
      let mediaUrl = formMediaUrl.trim() || null;
      if (isHero) {
        body = JSON.stringify({ tagline: formHeroTagline.trim(), slides: formSlideUrls });
        mediaUrl = formSlideUrls[0] || null;
      } else if (isSplit) {
        body = JSON.stringify(formSplitTiles.filter((t) => t && (t.img || t.label || t.url)));
        mediaUrl = formSplitTiles[0]?.img || null;
      } else if (isCollections) {
        body = JSON.stringify(formCollectionsItems.filter((c) => c && (c.slug || c.label || c.img)));
        mediaUrl = formCollectionsItems[0]?.img || null;
      }
      const payload = {
        slug: formSlug.trim(),
        title: formTitle.trim(),
        type: formType,
        body,
        media_url: mediaUrl,
        cta_label: formCtaLabel.trim() || null,
        cta_url: formCtaUrl.trim() || null,
        is_active: formActive,
        sort_order: formSortOrder.trim() && Number.isFinite(Number(formSortOrder)) ? parseInt(formSortOrder, 10) : undefined,
        page: formPage.trim() || null,
        variant: formVariant.trim() || null,
      };
      if (editingId) {
        await updateContentBlock(editingId, payload);
      } else {
        await createContentBlock(payload);
      }
      closeModal();
      fetchList();
    } catch (err) {
      setFormError(err?.message || 'Failed to save block');
    } finally {
      setFormSubmitting(false);
    }
  };

  const openDeleteModal = (item) => {
    setBlockToDelete(item);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!blockToDelete) return;
    setDeleting(true);
    try {
      await deleteContentBlock(blockToDelete.id);
      setDeleteModalOpen(false);
      setBlockToDelete(null);
      fetchList();
    } catch (err) {
      setError(err?.message || 'Failed to delete block');
    } finally {
      setDeleting(false);
    }
  };

  const getVariantOptionsForPage = (pageKey) => {
    const opts = new Set(['default']);
    (items || []).filter((b) => b.page === pageKey).forEach((b) => opts.add(b.variant || 'default'));
    return Array.from(opts).sort();
  };

  const setActiveVariantForPage = async (pageKey, variant) => {
    const next = { ...activeVariants, [pageKey]: variant };
    setActiveVariants(next);
    setSettingsLoading(true);
    try {
      await api.patch('/admin/settings', { content: { variants: next } });
    } catch (err) {
      setError(err?.message || 'Failed to save active variant');
      setActiveVariants(activeVariants);
    } finally {
      setSettingsLoading(false);
    }
  };

  return (
    <section className="panel content-page">
      <header className="content-page-header">
        <div className="content-page-header-text">
          <h1>Content Management</h1>
          <p className="content-page-subtitle">
            Hero banners, homepage sections, FAQs and other reusable content blocks.
          </p>
        </div>
        <button type="button" className="btn primary content-page-cta" onClick={openCreate}>
          + New block
        </button>
      </header>

      <div className="content-active-variants">
        <h3 className="content-active-variants-title">Active variant (what the site shows)</h3>
        <p className="content-active-variants-desc">Choose which version of each page is live. Blocks with a matching variant (or no variant) are shown.</p>
        <div className="content-active-variants-grid">
          {CONTENT_PAGES.map(({ value: pageKey, label }) => (
            <label key={pageKey} className="content-active-variants-item">
              <span className="content-active-variants-label">{label}</span>
              <select
                value={activeVariants[pageKey] ?? 'default'}
                onChange={(e) => setActiveVariantForPage(pageKey, e.target.value)}
                disabled={settingsLoading}
              >
                {getVariantOptionsForPage(pageKey).map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </div>

      <div className="content-page-filters">
        <label>
          Type
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All</option>
            {BLOCK_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Search
          <input
            type="search"
            placeholder="Title or slug…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>

      <Status loading={loading} error={error} />

      {!loading && !error && (
        <div className="content-page-table-wrap">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <table className="content-page-table">
              <thead>
                <tr>
                  <th className="content-page-th-drag" aria-label="Reorder" />
                  <th className="content-page-th-thumb">Image</th>
                  <th>Type</th>
                  <th>Slug</th>
                  <th>Title</th>
                  <th>Page</th>
                  <th>Variant</th>
                  <th>Active</th>
                  <th>Last updated</th>
                  <th className="content-page-th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center' }}>
                      No content blocks found.
                    </td>
                  </tr>
                ) : (
                  <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                    {items.map((item) => (
                      <SortableRow
                        key={item.id}
                        item={item}
                        onEdit={openEdit}
                        onDelete={openDeleteModal}
                      />
                    ))}
                  </SortableContext>
                )}
              </tbody>
            </table>
          </DndContext>
        </div>
      )}

      {modalOpen && (
        <div className="content-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="content-modal-title">
          <div className="content-modal-backdrop" onClick={closeModal} aria-hidden="true" />
          <div className="content-modal">
            <header className="content-modal-header">
              <h2 id="content-modal-title">{editingId ? 'Edit content block' : 'New content block'}</h2>
              <button type="button" className="content-modal-close" onClick={closeModal} aria-label="Close">
                ×
              </button>
            </header>
            <form onSubmit={handleSubmit} className="content-modal-form">
              <div className="content-modal-body">
                {formError && <p className="content-form-error">{formError}</p>}
                <div className="content-form-row">
                  <label htmlFor="content-type">Type *</label>
                  <select
                    id="content-type"
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    required
                  >
                    {BLOCK_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="content-form-row">
                  <label htmlFor="content-slug">Slug *</label>
                  <input
                    id="content-slug"
                    type="text"
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    placeholder="e.g. hero-main"
                    required
                  />
                </div>
                <div className="content-form-row">
                  <label htmlFor="content-title">Title *</label>
                  <input
                    id="content-title"
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    onBlur={handleTitleBlur}
                    placeholder="Block title"
                    required
                  />
                  <span className="content-form-hint">Leave slug empty to auto-generate from title.</span>
                </div>
                {formType === 'hero' ? (
                  <>
                    <div className="content-form-row">
                      <label htmlFor="content-hero-tagline">Tagline</label>
                      <input
                        id="content-hero-tagline"
                        type="text"
                        value={formHeroTagline}
                        onChange={(e) => setFormHeroTagline(e.target.value)}
                        placeholder="e.g. Grace in Grit"
                      />
                    </div>
                    <div className="content-form-row">
                      <label>Slideshow images</label>
                      <div className="content-slides-list">
                        {formSlideUrls.map((url, index) => (
                          <div key={index} className="content-slide-item">
                            <img src={url} alt="" className="content-slide-thumb" />
                            <div className="content-slide-actions">
                              <button type="button" className="btn btn-small" onClick={() => moveSlide(index, -1)} disabled={index === 0} title="Move left">
                                ←
                              </button>
                              <button type="button" className="btn btn-small" onClick={() => moveSlide(index, 1)} disabled={index === formSlideUrls.length - 1} title="Move right">
                                →
                              </button>
                              <button type="button" className="btn btn-small btn-danger" onClick={() => removeSlide(index)}>
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                        <div
                          className={`content-dropzone content-dropzone--compact ${imageUploading ? 'content-dropzone--busy' : ''}`}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => { e.preventDefault(); handleHeroSlidesUpload(e.dataTransfer?.files); }}
                          onClick={() => heroSlidesInputRef.current?.click()}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => e.key === 'Enter' && heroSlidesInputRef.current?.click()}
                          aria-label="Add slideshow images"
                        >
                          <input
                            ref={heroSlidesInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="content-dropzone-input"
                            onChange={(e) => {
                              handleHeroSlidesUpload(e.target.files);
                              e.target.value = '';
                            }}
                            aria-hidden="true"
                          />
                          {imageUploading ? <span className="content-dropzone-status">Uploading…</span> : <span className="content-dropzone-text">+ Add image(s)</span>}
                        </div>
                      </div>
                      <span className="content-form-hint">Add multiple images; order is the slideshow order. Drag order with arrows.</span>
                    </div>
                  </>
                ) : formType === 'split' ? (
                  <div className="content-form-row">
                    <label>Tiles (e.g. Women / Men)</label>
                    <input type="file" ref={tileImageInputRef} accept="image/*" className="content-dropzone-input" style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} onChange={(e) => { const f = e.target.files?.[0]; if (f && pendingTileIndexRef.current != null) { handleTileImageUpload(f, pendingTileIndexRef.current); pendingTileIndexRef.current = null; } e.target.value = ''; }} aria-hidden="true" />
                    {formSplitTiles.map((tile, index) => (
                      <div key={index} className="content-tile-row">
                        <div className="content-tile-preview">
                          {tile.img ? <img src={tile.img} alt="" /> : <span>No image</span>}
                          <button type="button" className="btn btn-small" onClick={() => { pendingTileIndexRef.current = index; tileImageInputRef.current?.click(); }} disabled={imageUploading}>{uploadingTileIndex === index ? 'Uploading…' : 'Upload'}</button>
                        </div>
                        <input type="text" placeholder="Label (e.g. Women)" value={tile.label || ''} onChange={(e) => updateSplitTile(index, 'label', e.target.value)} />
                        <input type="text" placeholder="URL (e.g. /shop?category=womenswear)" value={tile.url || ''} onChange={(e) => updateSplitTile(index, 'url', e.target.value)} />
                        <button type="button" className="btn btn-small btn-danger" onClick={() => removeSplitTile(index)}>Remove</button>
                      </div>
                    ))}
                    <button type="button" className="btn btn-small" onClick={addSplitTile}>+ Add tile</button>
                    <span className="content-form-hint">Each tile: image, label, and link URL. Order = display order.</span>
                  </div>
                ) : formType === 'collections' ? (
                  <div className="content-form-row">
                    <label>Collection items</label>
                    <input type="file" ref={collectionImageInputRef} accept="image/*" className="content-dropzone-input" style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} onChange={(e) => { const f = e.target.files?.[0]; if (f && pendingCollectionIndexRef.current != null) { handleCollectionImageUpload(f, pendingCollectionIndexRef.current); pendingCollectionIndexRef.current = null; } e.target.value = ''; }} aria-hidden="true" />
                    {formCollectionsItems.map((item, index) => (
                      <div key={index} className="content-tile-row">
                        <div className="content-tile-preview">
                          {item.img ? <img src={item.img} alt="" /> : <span>No image</span>}
                          <button type="button" className="btn btn-small" onClick={() => { pendingCollectionIndexRef.current = index; collectionImageInputRef.current?.click(); }} disabled={imageUploading}>{uploadingCollectionIndex === index ? 'Uploading…' : 'Upload'}</button>
                        </div>
                        <input type="text" placeholder="Slug (e.g. womenswear)" value={item.slug || ''} onChange={(e) => updateCollectionsItem(index, 'slug', e.target.value)} />
                        <input type="text" placeholder="Label (e.g. Women's wear)" value={item.label || ''} onChange={(e) => updateCollectionsItem(index, 'label', e.target.value)} />
                        <button type="button" className="btn btn-small btn-danger" onClick={() => removeCollectionsItem(index)}>Remove</button>
                      </div>
                    ))}
                    <button type="button" className="btn btn-small" onClick={addCollectionsItem}>+ Add item</button>
                    <span className="content-form-hint">Each item: image, slug (URL param), and label. Links to /shop?category=slug.</span>
                  </div>
                ) : (
                  <>
                    <div className="content-form-row">
                      <label>Body</label>
                      <textarea
                        id="content-body"
                        rows={5}
                        value={formBody}
                        onChange={(e) => setFormBody(e.target.value)}
                        placeholder="Markdown or plain text…"
                      />
                      <span className="content-form-hint">Supports markdown.</span>
                    </div>
                    <div className="content-form-row">
                      <label>{formType === 'banner' ? 'Image or video' : 'Image'}</label>
                      <div
                        className={`content-dropzone ${imageUploading ? 'content-dropzone--busy' : ''} ${formMediaUrl ? 'content-dropzone--has-image' : ''}`}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={onDrop}
                        onClick={() => !formMediaUrl && fileInputRef.current?.click()}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && !formMediaUrl && fileInputRef.current?.click()}
                        aria-label="Add or replace media"
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept={formType === 'banner' ? 'image/*,video/mp4,video/webm,video/ogg' : 'image/*'}
                          className="content-dropzone-input"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleFile(f);
                            e.target.value = '';
                          }}
                          aria-hidden="true"
                        />
                        {imageUploading && <span className="content-dropzone-status">Uploading…</span>}
                        {!imageUploading && formMediaUrl && (
                          <div className="content-dropzone-preview">
                            {formMediaUrl.match(/\.(mp4|webm|ogg)(\?|$)/i) ? <video src={formMediaUrl} muted style={{ maxHeight: 120 }} /> : <img src={formMediaUrl} alt="" />}
                            <div className="content-dropzone-actions">
                              <button type="button" className="btn btn-small" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>Replace</button>
                              <button type="button" className="btn btn-small btn-danger" onClick={(e) => { e.stopPropagation(); setFormMediaUrl(''); }}>Remove</button>
                            </div>
                          </div>
                        )}
                        {!imageUploading && !formMediaUrl && (
                          <span className="content-dropzone-text">{formType === 'banner' ? 'Drop image or video (mp4), or click' : 'Drop image, paste, or click to upload'}</span>
                        )}
                      </div>
                    </div>
                  </>
                )}
                <div className="content-form-row">
                  <label htmlFor="content-cta-label">CTA label</label>
                  <input
                    id="content-cta-label"
                    type="text"
                    value={formCtaLabel}
                    onChange={(e) => setFormCtaLabel(e.target.value)}
                    placeholder="Button text"
                  />
                </div>
                <div className="content-form-row">
                  <label htmlFor="content-cta-url">CTA URL</label>
                  <input
                    id="content-cta-url"
                    type="url"
                    value={formCtaUrl}
                    onChange={(e) => setFormCtaUrl(e.target.value)}
                    placeholder="https://…"
                  />
                </div>
                <div className="content-form-row content-form-row--inline">
                  <label className="content-checkbox-label">
                    <input
                      type="checkbox"
                      checked={formActive}
                      onChange={(e) => setFormActive(e.target.checked)}
                    />
                    <span>Active</span>
                  </label>
                </div>
                <div className="content-form-row">
                  <label htmlFor="content-page">Page</label>
                  <select
                    id="content-page"
                    value={formPage}
                    onChange={(e) => setFormPage(e.target.value)}
                  >
                    {BLOCK_PAGES.map((p) => (
                      <option key={p.value || 'any'} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <span className="content-form-hint">e.g. Home or Shop. Storefront requests blocks by page.</span>
                </div>
                <div className="content-form-row">
                  <label htmlFor="content-variant">Variant</label>
                  <input
                    id="content-variant"
                    type="text"
                    value={formVariant}
                    onChange={(e) => setFormVariant(e.target.value)}
                    placeholder="e.g. default, summer, sale"
                  />
                  <span className="content-form-hint">Optional. Use with Active variant above to switch page versions.</span>
                </div>
                <div className="content-form-row">
                  <label htmlFor="content-sort">Sort order</label>
                  <input
                    id="content-sort"
                    type="number"
                    min={0}
                    value={formSortOrder}
                    onChange={(e) => setFormSortOrder(e.target.value)}
                    placeholder="Auto"
                  />
                </div>
              </div>
              <footer className="content-modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn primary" disabled={formSubmitting}>
                  {formSubmitting ? 'Saving…' : 'Save'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        open={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setBlockToDelete(null); }}
        onConfirm={handleConfirmDelete}
        title="Delete content block?"
        bodyLabel={blockToDelete ? `"${blockToDelete.title}"` : ''}
        deleting={deleting}
        confirmPayload={blockToDelete}
      />
    </section>
  );
}
