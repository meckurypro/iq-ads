// PLACE AT: src/lib/uploadMedia.ts
import { supabase } from './supabase';

const BUCKET = 'portfolio-media';

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
}

interface UploadResult {
  url: string | null;
  error: string | null;
}

// Uploads a File (from an <input type="file">) or a Blob (e.g. a
// captured video frame) to Supabase Storage and returns its public
// URL. Requires the admin write policies in portfolio_media_bucket.sql.
export async function uploadPortfolioFile(
  file: File | Blob,
  { prefix, fileName, contentType }: UploadOptions,
): Promise<UploadResult> {
  const resolvedContentType = contentType ?? (file instanceof File ? file.type : undefined);
  const ext = extensionFor(fileName, resolvedContentType);
  const path = `${prefix}/${generateId()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: resolvedContentType,
    upsert: false,
  });

  if (uploadError) {
    return { url: null, error: uploadError.message };
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}
