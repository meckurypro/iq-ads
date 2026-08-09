// PLACE AT: src/lib/uploadMedia.ts
import * as tus from 'tus-js-client';
import { supabase } from './supabase';

const BUCKET = 'portfolio-media';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Supabase's TUS endpoint requires exactly this chunk size — anything
// else causes uploads to silently stall past the first chunk.
const CHUNK_SIZE = 6 * 1024 * 1024;

// Purely informational: if no bytes have moved in this long, let the
// caller show a "still reconnecting" message. tus-js-client keeps
// retrying underneath regardless — this doesn't fail the upload.
const STALL_NOTICE_MS = 15_000;

function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function extensionFor(fileName: string | undefined, contentType: string | undefined): string {
  if (fileName) {
    const dot = fileName.lastIndexOf('.');
    if (dot !== -1) {
      const ext = fileName.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '');
      if (ext) return ext;
    }
  }
  if (contentType?.includes('/')) return contentType.split('/')[1];
  return 'bin';
}

interface UploadOptions {
  prefix: string;
  fileName?: string;
  contentType?: string;
  onProgress?: (fraction: number) => void;
  // Fires (possibly more than once) if the upload seems stuck. Purely a
  // UI hint — tus keeps retrying in the background either way.
  onStalled?: () => void;
}

interface UploadResult {
  url: string | null;
  error: string | null;
  path?: string;
}

// Uploads a File or Blob to Supabase Storage using the TUS resumable
// protocol instead of a single-shot XHR/fetch.
//
// Why this fixes "upload disappears on screen lock": a plain upload is
// one long HTTP request — if the tab gets suspended mid-flight (screen
// lock, app switch, dropped signal), that request dies and there's no
// way to pick it back up; the whole file has to be sent again from
// byte zero. TUS instead sends the file in 6MB chunks and tracks how
// many bytes the server has actually received. tus-js-client persists
// that state (fingerprinted by file name/size/type/last-modified) in
// localStorage, so when this code runs again — after unlocking the
// phone, switching back to the tab, or even a reload — it finds the
// interrupted upload and resumes from the last acknowledged chunk
// instead of starting over.
//
// What this does NOT do: keep sending bytes while the tab is fully
// suspended and the screen is locked. No browser API allows arbitrary
// authenticated background uploads from a website — that's what native
// apps use OS-level background sessions for. What changes here is that
// coming back to an interrupted upload is a resume, not a restart,
// which is the part that actually matters for "don't lose my progress."
export async function uploadPortfolioFile(
  file: File | Blob,
  { prefix, fileName, contentType, onProgress, onStalled }: UploadOptions,
): Promise<UploadResult> {
  const resolvedContentType =
    contentType ?? (file instanceof File ? file.type : undefined) ?? 'application/octet-stream';
  const resolvedFileName = fileName ?? (file instanceof File ? file.name : undefined);
  const ext = extensionFor(resolvedFileName, resolvedContentType);
  const path = `${prefix}/${generateId()}.${ext}`;

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token ?? SUPABASE_ANON_KEY;

  const uploadError = await new Promise<string | null>((resolve) => {
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
      stallTimer = setTimeout(() => onStalled?.(), STALL_NOTICE_MS);
    };

    const upload = new tus.Upload(file, {
      endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000, 30000],
      headers: {
        authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
        'x-upsert': 'false',
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: CHUNK_SIZE,
      metadata: {
        bucketName: BUCKET,
        objectName: path,
        contentType: resolvedContentType,
        cacheControl: '3600',
      },
      onError: (err) => {
        finish(err instanceof Error ? err.message : 'Upload failed. Please try again.');
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        armStallTimer();
        if (onProgress && bytesTotal > 0) {
          onProgress(bytesUploaded / bytesTotal);
        }
      },
      onSuccess: () => {
        onProgress?.(1);
        finish(null);
      },
    });

    // Look for a matching interrupted upload (same file fingerprint)
    // before starting — this is what makes "screen locked mid-upload"
    // resume instead of restart.
    upload.findPreviousUploads().then((previousUploads) => {
      if (previousUploads.length > 0) {
        upload.resumeFromPreviousUpload(previousUploads[0]);
      }
      armStallTimer();
      upload.start();
    });
  });

  if (uploadError) {
    return { url: null, error: uploadError };
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, error: null, path };
}
