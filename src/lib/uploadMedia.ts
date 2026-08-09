// PLACE AT: src/lib/uploadMedia.ts
import { supabase } from './supabase';

const BUCKET = 'portfolio-media';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// If no upload-progress event fires for this long, treat the request
// as stuck — e.g. the tab was backgrounded and the OS suspended its
// network stack — and fail it loudly instead of leaving the admin
// staring at an infinite "Uploading…" spinner with no way to retry.
const STALL_TIMEOUT_MS = 25_000;

function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function extensionFor(fileName: string | undefined, contentType: string | undefined): string {
  if (fileName) {
    const dot = fileName.lastIndexOf('.');
    if (dot !== -1) {
      const ext = fileName
        .slice(dot + 1)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      if (ext) return ext;
    }
  }
  if (contentType?.includes('/')) return contentType.split('/')[1];
  return 'bin';
}

interface UploadOptions {
  // Folder within the bucket, e.g. 'media' or 'posters'.
  prefix: string;
  fileName?: string;
  contentType?: string;
  // Called with a 0..1 fraction as the upload progresses, and once
  // more with 1 on success. Also drives stall detection internally.
  onProgress?: (fraction: number) => void;
}

interface UploadResult {
  url: string | null;
  error: string | null;
}

// Uploads a File (from an <input type="file">) or a Blob (e.g. a
// captured video frame) to Supabase Storage and returns its public
// URL. Requires the admin write policies in portfolio_media_bucket.sql.
//
// Built on raw XMLHttpRequest rather than the supabase-js storage
// client: the SDK's fetch-based upload has no progress events, so
// there's no way to drive a progress bar or notice a stalled request
// through it — both of which matter for large video files on mobile.
export async function uploadPortfolioFile(
  file: File | Blob,
  { prefix, fileName, contentType, onProgress }: UploadOptions,
): Promise<UploadResult> {
  const resolvedContentType =
    contentType ?? (file instanceof File ? file.type : undefined) ?? 'application/octet-stream';
  const resolvedFileName = fileName ?? (file instanceof File ? file.name : undefined);
  const ext = extensionFor(resolvedFileName, resolvedContentType);
  const path = `${prefix}/${generateId()}.${ext}`;

  // Storage RLS checks the caller's session, so send the current
  // access token (falling back to the anon key, though the admin
  // write policies require a signed-in user to actually succeed).
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token ?? SUPABASE_ANON_KEY;
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`;

  const uploadError = await new Promise<string | null>((resolve) => {
    const xhr = new XMLHttpRequest();
    let settled = false;
    let stallTimer: ReturnType<typeof setTimeout> | null = null;

    const finish = (result: string | null) => {
      if (settled) return;
      settled = true;
      if (stallTimer) clearTimeout(stallTimer);
      resolve(result);
    };

    const armStallTimer = () => {
      if (stallTimer) clearTimeout(stallTimer);
      stallTimer = setTimeout(() => {
        finish(
          'Upload stalled — no progress for a while. This can happen if you switched apps or lost connection mid-upload. Please try again.',
        );
        xhr.abort();
      }, STALL_TIMEOUT_MS);
    };

    xhr.open('POST', uploadUrl, true);
    xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('Content-Type', resolvedContentType);
    xhr.setRequestHeader('x-upsert', 'false');

    xhr.upload.onprogress = (event) => {
      armStallTimer();
      if (event.lengthComputable && onProgress) {
        onProgress(event.loaded / event.total);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(1);
        finish(null);
        return;
      }
      let message = `Upload failed (status ${xhr.status})`;
      try {
        const parsed = JSON.parse(xhr.responseText);
        if (parsed?.message) message = parsed.message;
      } catch {
        // Response wasn't JSON — keep the generic message.
      }
      finish(message);
    };

    xhr.onerror = () => finish('Network error during upload. Check your connection and try again.');
    xhr.onabort = () => finish('Upload cancelled.');
    xhr.ontimeout = () => finish('Upload timed out. Please try again.');

    armStallTimer(); // also covers the request never starting at all
    xhr.send(file);
  });

  if (uploadError) {
    return { url: null, error: uploadError };
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}
