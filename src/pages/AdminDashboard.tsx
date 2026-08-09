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
  aspectRatio: null,
  summary: '',
};

// sessionStorage key the form auto-saves a draft to. Text fields
// only — File/Blob objects can't survive JSON.stringify or a page
// reload, so they're never part of the draft (see the restore
// banner in the JSX for how that limitation is communicated).
const DRAFT_KEY = 'iqads_admin_draft_v1';

type UploadStage = 'media' | 'poster' | 'saving' | null;

export default function AdminDashboard() {
  const { items, loading, error, createItem, updateItem, deleteItem } = usePortfolioAdmin();
  const navigate = useNavigate();

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PortfolioInput>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);

  // New file picked for the main media. null means "keep the
  // existing mediaUrl" (only relevant when editing).
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  // Real width/height ratio of whatever's currently in mediaFile,
  // read off the actual video/image element once it loads. Null
  // until then (or when editing without picking a new file).
  const [mediaAspectRatio, setMediaAspectRatio] = useState<number | null>(null);

  // Poster/thumbnail for a video item — either a frame captured from
  // the video preview, or an image uploaded directly. Either way it
  // ends up here and is uploaded the same way at submit time.
  const [posterSource, setPosterSource] = useState<File | Blob | null>(null);
  const [posterPreviewUrl, setPosterPreviewUrl] = useState<string | null>(null);

  const [uploadStage, setUploadStage] = useState<UploadStage>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  // True when the current upload has gone quiet for a while (screen
  // locked, app backgrounded, weak signal). tus-js-client keeps
  // retrying underneath — this only drives the reassurance message so
  // the admin doesn't think progress was lost.
  const [stalled, setStalled] = useState(false);
  // True while we hold an active screen wake lock, so the UI can hint
  // that keeping the tab open/visible actually matters right now.
  const [wakeLockActive, setWakeLockActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

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

  // Restore a draft left over from before the page reloaded. Mobile
  // browsers routinely discard a backgrounded tab and reload it fresh
  // to free memory, which otherwise silently wipes the whole form.
  // Runs once, on mount.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as { editingId: string | null; form: PortfolioInput };
      setEditingId(draft.editingId);
      setForm(draft.form);
      setFormOpen(true);
      setDraftRestored(true);
    } catch {
      // Corrupted or unreadable draft — start fresh rather than block.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the draft up to date while the form is open. Only text
  // fields go in here on purpose (see DRAFT_KEY comment above).
  useEffect(() => {
    if (!formOpen) return;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ editingId, form }));
    } catch {
      // Storage can throw in private browsing / when full — losing
      // draft-recovery silently isn't worth surfacing an error for.
    }
  }, [formOpen, editingId, form]);

  // Warn on an accidental close/refresh mid-upload. This can't stop
  // the OS from discarding a backgrounded tab, but it does catch the
  // more common case of the admin closing the tab themselves.
  useEffect(() => {
    if (!saving) return;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saving]);

  // Keep the screen awake while an upload is in flight. This only
  // stops the screen from auto-dimming/locking due to inactivity while
  // the tab is open and visible — it can't survive the user pressing
  // the power button or switching apps, and the browser silently drops
  // the lock whenever the tab is hidden. We re-acquire on visibility
  // change so a brief app-switch-and-back doesn't leave it off for the
  // rest of the upload. Unsupported browsers (no navigator.wakeLock) no-op.
  useEffect(() => {
    if (!saving || !('wakeLock' in navigator)) return;

    let cancelled = false;

    async function acquire() {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        setWakeLockActive(true);
        wakeLockRef.current.addEventListener('release', () => {
          setWakeLockActive(false);
        });
      } catch {
        // Denied, unsupported mid-flight, or tab hidden at request time —
        // nothing to do; the upload itself is unaffected.
        setWakeLockActive(false);
      }
    }

    acquire();

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible' && !cancelled && !wakeLockRef.current) {
        acquire();
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
      setWakeLockActive(false);
    };
  }, [saving]);

  function clearDraft() {
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      /* see above */
    }
  }

  function resetFileState() {
    setMediaFile(null);
    setMediaPreviewUrl(null);
    setMediaAspectRatio(null);
    setPosterSource(null);
    setPosterPreviewUrl(null);
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setDraftRestored(false);
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
      aspectRatio: item.aspectRatio ?? null,
      summary: item.summary,
    });
    setFormError(null);
    setDraftRestored(false);
    resetFileState();
    setFormOpen(true);
  }

  function closeForm() {
    if (saving) return; // don't let an in-flight upload get orphaned
    setFormOpen(false);
    setEditingId(null);
    setFormError(null);
    setDraftRestored(false);
    resetFileState();
    clearDraft();
  }

  function handleMediaFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
    if (posterPreviewUrl) URL.revokeObjectURL(posterPreviewUrl);

    setPosterSource(null);
    setPosterPreviewUrl(null);
    setMediaAspectRatio(null);
    setMediaFile(file);
    setMediaPreviewUrl(file ? URL.createObjectURL(file) : null);
  }

  function handleMediaTypeChange(mediaType: PortfolioItem['mediaType']) {
    setForm((f) => ({ ...f, mediaType }));
    if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
    if (posterPreviewUrl) URL.revokeObjectURL(posterPreviewUrl);
    setMediaFile(null);
    setMediaPreviewUrl(null);
    setMediaAspectRatio(null);
    setPosterSource(null);
    setPosterPreviewUrl(null);
  }

  // Read the real aspect ratio off the freshly picked video, once
  // its metadata is available.
  function handleVideoMetadata() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;
    setMediaAspectRatio(video.videoWidth / video.videoHeight);
  }

  // Same, for a freshly picked image.
  function handleImageMetadata() {
    const img = imageRef.current;
    if (!img || !img.naturalWidth || !img.naturalHeight) return;
    setMediaAspectRatio(img.naturalWidth / img.naturalHeight);
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
        setPosterSource(blob);
        setPosterPreviewUrl(URL.createObjectURL(blob));
      },
      'image/jpeg',
      0.85,
    );
  }

  function handlePosterFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    if (posterPreviewUrl) URL.revokeObjectURL(posterPreviewUrl);
    setPosterSource(file);
    setPosterPreviewUrl(URL.createObjectURL(file));
  }

  // If the video/image metadata event hasn't fired yet by the time
  // the admin hits submit, give it one more short chance before
  // falling back to whatever ratio the form already had (e.g. when
  // editing without replacing the file).
  function resolveAspectRatio(): Promise<number | null> {
    if (mediaAspectRatio) return Promise.resolve(mediaAspectRatio);
    if (!mediaFile) return Promise.resolve(form.aspectRatio ?? null);

    if (form.mediaType === 'video' && videoRef.current) {
      const video = videoRef.current;
      if (video.videoWidth && video.videoHeight) {
        return Promise.resolve(video.videoWidth / video.videoHeight);
      }
      return new Promise((resolve) => {
        const onLoaded = () => {
          video.removeEventListener('loadedmetadata', onLoaded);
          resolve(video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : null);
        };
        video.addEventListener('loadedmetadata', onLoaded);
        setTimeout(() => {
          video.removeEventListener('loadedmetadata', onLoaded);
          resolve(null);
        }, 3000);
      });
    }

    if (form.mediaType === 'image' && imageRef.current) {
      const img = imageRef.current;
      if (img.naturalWidth && img.naturalHeight) {
        return Promise.resolve(img.naturalWidth / img.naturalHeight);
      }
    }

    return Promise.resolve(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!mediaFile && !form.mediaUrl) {
      setFormError('Choose a media file.');
      return;
    }

    setSaving(true);
    setUploadStage(null);
    setUploadProgress(0);
    setStalled(false);

    const resolvedAspectRatio = await resolveAspectRatio();

    let mediaUrl = form.mediaUrl;
    let posterUrl = form.posterUrl;
    const aspectRatio = resolvedAspectRatio ?? form.aspectRatio ?? null;

    if (mediaFile) {
      setUploadStage('media');
      setUploadProgress(0);
      setStalled(false);
      const result = await uploadPortfolioFile(mediaFile, {
        prefix: 'media',
        onProgress: setUploadProgress,
        onStalled: () => setStalled(true),
      });
      if (result.error || !result.url) {
        setSaving(false);
        setUploadStage(null);
        setFormError(`Media upload failed: ${result.error ?? 'unknown error'}`);
        return;
      }
      mediaUrl = result.url;
    }

    if (posterSource) {
      setUploadStage('poster');
      setUploadProgress(0);
      setStalled(false);
      const result = await uploadPortfolioFile(posterSource, {
        prefix: 'posters',
        contentType: posterSource instanceof File ? posterSource.type : 'image/jpeg',
        onProgress: setUploadProgress,
        onStalled: () => setStalled(true),
      });
      if (result.error || !result.url) {
        setSaving(false);
        setUploadStage(null);
        setFormError(`Thumbnail upload failed: ${result.error ?? 'unknown error'}`);
        return;
      }
      posterUrl = result.url;
    }

    setUploadStage('saving');
    setStalled(false);
    const payload: PortfolioInput = { ...form, mediaUrl, posterUrl, aspectRatio };
    const result = editingId ? await updateItem(editingId, payload) : await createItem(payload);

    setSaving(false);
    setUploadStage(null);
    if (result.error) {
      setFormError(result.error);
      return;
    }
    clearDraft();
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

  const existingIsVideo = form.mediaType === 'video' && !mediaFile && !!form.mediaUrl;

  const progressLabel = stalled
    ? 'Reconnecting… your progress is saved, hang tight.'
    : uploadStage === 'media'
      ? `Uploading media… ${Math.round(uploadProgress * 100)}%`
      : uploadStage === 'poster'
        ? `Uploading thumbnail… ${Math.round(uploadProgress * 100)}%`
        : uploadStage === 'saving'
          ? 'Saving…'
          : 'Preparing…';

  const progressWidth =
    uploadStage === 'media' || uploadStage === 'poster' ? `${Math.round(uploadProgress * 100)}%` : '100%';

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

            {draftRestored && (
              <p className={styles.draftBanner}>
                Recovered your draft text from before the page reloaded. If you'd picked a media
                file or thumbnail, please reselect it — files can't survive a reload.
              </p>
            )}

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

            {/* New video just picked: scrub it, grab a frame, or upload
                a thumbnail image directly. */}
            {form.mediaType === 'video' && mediaPreviewUrl && (
              <div className={styles.mediaPreview}>
                <video
                  ref={videoRef}
                  src={mediaPreviewUrl}
                  controls
                  className={styles.videoPreview}
                  onLoadedMetadata={handleVideoMetadata}
                />
                <div className={styles.captureRow}>
                  <button type="button" className={styles.ghostButton} onClick={captureFrame}>
                    Use this frame as poster
                  </button>
                  <span className={styles.orDivider}>or</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePosterFileChange}
                    aria-label="Upload thumbnail image"
                  />
                  {posterPreviewUrl && (
                    <img src={posterPreviewUrl} alt="Poster preview" className={styles.posterThumb} />
                  )}
                </div>
                <p className={styles.helperText}>
                  Play or scrub to the frame you want and capture it, or upload a thumbnail image
                  directly.
                </p>
              </div>
            )}

            {/* Editing an existing video, no new file chosen yet: still
                let the admin swap just the thumbnail. */}
            {existingIsVideo && (
              <div className={styles.mediaPreview}>
                {(posterPreviewUrl || form.posterUrl) && (
                  <img
                    src={posterPreviewUrl ?? form.posterUrl}
                    alt="Current poster"
                    className={styles.posterThumb}
                  />
                )}
                <div className={styles.captureRow}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePosterFileChange}
                    aria-label="Replace thumbnail image"
                  />
                </div>
                <p className={styles.helperText}>
                  {posterPreviewUrl
                    ? 'New thumbnail selected.'
                    : 'Current poster. Pick a new media file above to re-capture, or upload a replacement thumbnail here.'}
                </p>
              </div>
            )}

            {form.mediaType === 'image' && mediaPreviewUrl && (
              <img
                ref={imageRef}
                src={mediaPreviewUrl}
                alt=""
                className={styles.posterThumb}
                onLoad={handleImageMetadata}
              />
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

            {saving && (
              <div className={styles.progressWrap} aria-live="polite">
                <p className={styles.progressLabel}>{progressLabel}</p>
                <div className={styles.progressTrack}>
                  <div className={styles.progressFill} style={{ width: progressWidth }} />
                </div>
                {wakeLockActive && (
                  <p className={styles.helperText}>
                    Keeping this screen awake until the upload finishes — you can still switch
                    apps, but locking the phone will pause it.
                  </p>
                )}
              </div>
            )}

            <div className={styles.panelActions}>
              <button type="button" className={styles.ghostButton} onClick={closeForm} disabled={saving}>
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
