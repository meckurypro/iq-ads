// PLACE AT: src/pages/AdminDashboard.tsx (overwrite existing)
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePortfolioAdmin, type PortfolioInput } from '../lib/usePortfolioAdmin';
import { uploadPortfolioFile } from '../lib/uploadMedia';
import { signOutAdmin } from '../lib/useAdminAuth';
import type { PortfolioItem } from '../types/portfolio';
import styles from './AdminDashboard.module.css';

const CATEGORIES: PortfolioItem['category'][] = ['commercial', 'brand-film', 'campaign', 'jingle'];
const MEDIA_TYPES: PortfolioItem['mediaType'][] = ['video', 'image'];

const EMPTY_FORM: PortfolioInput = {
  title: '',
  client: '',
  category: 'commercial',
  mediaUrl: '',
  mediaType: 'video',
  posterUrl: '',
  summary: '',
};

export default function AdminDashboard() {
  const { items, loading, error, createItem, updateItem, deleteItem } = usePortfolioAdmin();
  const navigate = useNavigate();

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PortfolioInput>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // New file picked for the main media. null means "keep the
  // existing mediaUrl" (only relevant when editing).
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);

  // Frame captured from the video preview, to upload as the poster.
  const [posterBlob, setPosterBlob] = useState<Blob | null>(null);
  const [posterPreviewUrl, setPosterPreviewUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Revoke object URLs when they're replaced or the form closes, so
  // we don't leak memory across multiple opens.
  useEffect(() => {
    return () => {
      if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
    };
  }, [mediaPreviewUrl]);

  useEffect(() => {
    return () => {
      if (posterPreviewUrl) URL.revokeObjectURL(posterPreviewUrl);
    };
  }, [posterPreviewUrl]);

  function resetFileState() {
    setMediaFile(null);
    setMediaPreviewUrl(null);
    setPosterBlob(null);
    setPosterPreviewUrl(null);
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    resetFileState();
    setFormOpen(true);
  }

  function openEdit(item: PortfolioItem) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      client: item.client,
      category: item.category,
      mediaUrl: item.mediaUrl,
      mediaType: item.mediaType,
      posterUrl: item.posterUrl ?? '',
      summary: item.summary,
    });
    setFormError(null);
    resetFileState();
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setFormError(null);
    resetFileState();
  }

  function handleMediaFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
    setPosterBlob(null);
    if (posterPreviewUrl) URL.revokeObjectURL(posterPreviewUrl);
    setPosterPreviewUrl(null);

    setMediaFile(file);
    setMediaPreviewUrl(file ? URL.createObjectURL(file) : null);
  }

  function handleMediaTypeChange(mediaType: PortfolioItem['mediaType']) {
    setForm((f) => ({ ...f, mediaType }));
    if (mediaFile) {
      if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
      setMediaFile(null);
      setMediaPreviewUrl(null);
    }
    setPosterBlob(null);
    if (posterPreviewUrl) URL.revokeObjectURL(posterPreviewUrl);
    setPosterPreviewUrl(null);
  }

  function captureFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        if (posterPreviewUrl) URL.revokeObjectURL(posterPreviewUrl);
        setPosterBlob(blob);
        setPosterPreviewUrl(URL.createObjectURL(blob));
      },
      'image/jpeg',
      0.85,
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!mediaFile && !form.mediaUrl) {
      setFormError('Choose a media file.');
      return;
    }

    setSaving(true);

    let mediaUrl = form.mediaUrl;
    let posterUrl = form.posterUrl;

    if (mediaFile) {
      const result = await uploadPortfolioFile(mediaFile, { prefix: 'media' });
      if (result.error || !result.url) {
        setSaving(false);
        setFormError(`Media upload failed: ${result.error ?? 'unknown error'}`);
        return;
      }
      mediaUrl = result.url;
    }

    if (posterBlob) {
      const result = await uploadPortfolioFile(posterBlob, {
        prefix: 'posters',
        contentType: 'image/jpeg',
      });
      if (result.error || !result.url) {
        setSaving(false);
        setFormError(`Poster upload failed: ${result.error ?? 'unknown error'}`);
        return;
      }
      posterUrl = result.url;
    }

    const payload: PortfolioInput = { ...form, mediaUrl, posterUrl };
    const result = editingId ? await updateItem(editingId, payload) : await createItem(payload);

    setSaving(false);
    if (result.error) {
      setFormError(result.error);
      return;
    }
    closeForm();
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this portfolio item? This cannot be undone.')) return;
    setDeletingId(id);
    const result = await deleteItem(id);
    setDeletingId(null);
    if (result.error) {
      window.alert(`Couldn't delete: ${result.error}`);
    }
  }

  async function handleSignOut() {
    await signOutAdmin();
    navigate('/admin/login', { replace: true });
  }

  const existingIsVideo = form.mediaType === 'video' && !mediaFile && form.mediaUrl;

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <div>
          <p className="eyebrow">IQ Ads Admin</p>
          <h1 className={styles.heading}>Portfolio</h1>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.primaryButton} onClick={openCreate}>
            Add item
          </button>
          <button type="button" className={styles.ghostButton} onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </header>

      {loading && <p className={styles.status}>Loading portfolio…</p>}
      {error && <p className={styles.statusError}>Couldn't load the portfolio: {error}</p>}

      {!loading && !error && items.length === 0 && (
        <div className={styles.empty}>
          <p>No portfolio items yet.</p>
          <p className={styles.emptySub}>Add the first one to show it on the public feed.</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <ul className={styles.list}>
          {items.map((item) => (
            <li key={item.id} className={styles.row}>
              <div className={styles.thumb}>
                {item.mediaType === 'video' && item.posterUrl ? (
                  <img src={item.posterUrl} alt="" />
                ) : item.mediaType === 'image' ? (
                  <img src={item.mediaUrl} alt="" />
                ) : (
                  <span className={styles.thumbFallback}>{item.mediaType}</span>
                )}
              </div>

              <div className={styles.rowBody}>
                <p className={styles.rowTitle}>{item.title}</p>
                <p className={styles.rowMeta}>
                  {item.client} · <span className={styles.badge}>{item.category}</span> ·{' '}
                  {item.mediaType}
                </p>
                <p className={styles.rowSummary}>{item.summary}</p>
              </div>

              <div className={styles.rowActions}>
                <button type="button" className={styles.ghostButton} onClick={() => openEdit(item)}>
                  Edit
                </button>
                <button
                  type="button"
                  className={styles.dangerButton}
                  disabled={deletingId === item.id}
                  onClick={() => handleDelete(item.id)}
                >
                  {deletingId === item.id ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {formOpen && (
        <div className={styles.overlay} onClick={closeForm}>
          <form
            className={styles.panel}
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSubmit}
          >
            <h2 className={styles.panelHeading}>
              {editingId ? 'Edit portfolio item' : 'Add portfolio item'}
            </h2>

            <label htmlFor="title">Title</label>
            <input
              id="title"
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />

            <label htmlFor="client">Client</label>
            <input
              id="client"
              required
              value={form.client}
              onChange={(e) => setForm((f) => ({ ...f, client: e.target.value }))}
            />

            <div className={styles.formGrid}>
              <div>
                <label htmlFor="category">Category</label>
                <select
                  id="category"
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value as PortfolioItem['category'] }))
                  }
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="mediaType">Media type</label>
                <select
                  id="mediaType"
                  value={form.mediaType}
                  onChange={(e) => handleMediaTypeChange(e.target.value as PortfolioItem['mediaType'])}
                >
                  {MEDIA_TYPES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label htmlFor="mediaFile">
              Media file{editingId && !mediaFile ? ' (leave empty to keep the current one)' : ''}
            </label>
            <input
              id="mediaFile"
              type="file"
              accept={form.mediaType === 'video' ? 'video/*' : 'image/*'}
              onChange={handleMediaFileChange}
            />

            {/* New video just picked: scrub it and grab a frame. */}
            {form.mediaType === 'video' && mediaPreviewUrl && (
              <div className={styles.mediaPreview}>
                <video
                  ref={videoRef}
                  src={mediaPreviewUrl}
                  controls
                  className={styles.videoPreview}
                />
                <div className={styles.captureRow}>
                  <button type="button" className={styles.ghostButton} onClick={captureFrame}>
                    Use this frame as poster
                  </button>
                  {posterPreviewUrl && (
                    <img src={posterPreviewUrl} alt="Captured poster frame" className={styles.posterThumb} />
                  )}
                </div>
                <p className={styles.helperText}>
                  Play or scrub to the frame you want, pause, then capture it.
                </p>
              </div>
            )}

            {/* Editing an existing video, no new file chosen yet: show
                the current poster so it's clear one already exists. */}
            {existingIsVideo && form.posterUrl && !posterPreviewUrl && (
              <div className={styles.mediaPreview}>
                <img src={form.posterUrl} alt="Current poster" className={styles.posterThumb} />
                <p className={styles.helperText}>Current poster. Pick a new media file to replace it.</p>
              </div>
            )}

            {form.mediaType === 'image' && mediaPreviewUrl && (
              <img src={mediaPreviewUrl} alt="" className={styles.posterThumb} />
            )}

            <canvas ref={canvasRef} className={styles.hiddenCanvas} />

            <label htmlFor="summary">Summary</label>
            <textarea
              id="summary"
              required
              rows={3}
              value={form.summary}
              onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
            />

            {formError && <p className={styles.statusError}>{formError}</p>}

            <div className={styles.panelActions}>
              <button type="button" className={styles.ghostButton} onClick={closeForm}>
                Cancel
              </button>
              <button type="submit" className={styles.primaryButton} disabled={saving}>
                {saving ? 'Uploading…' : editingId ? 'Save changes' : 'Add item'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
