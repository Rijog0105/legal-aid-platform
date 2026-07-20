import { supabase } from '@/services/supabase';
import { APP_CONFIG } from '@/constants';
import type { Photo } from '@/types';

export interface PhotoWithActivityName extends Photo {
  activity: { activity_name: string } | null;
}

export interface UploadPhotoInput {
  campId: string;
  activityId: string;
  uploadedBy: string;
  file: File;
  latitude?: number | null;
  longitude?: number | null;
}

function buildStoragePath(campId: string, activityId: string, file: File): string {
  const ext = file.name.split('.').pop() || 'jpg';
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${campId}/${activityId}/${unique}.${ext}`;
}

/**
 * Uploads a photo file to the private `camp-photos` storage bucket, then
 * records its metadata in the `photos` table. If the metadata insert fails,
 * the uploaded storage object is removed so orphaned files don't accumulate.
 */
export async function uploadPhoto({
  campId,
  activityId,
  uploadedBy,
  file,
  latitude = null,
  longitude = null,
}: UploadPhotoInput): Promise<Photo> {
  const path = buildStoragePath(campId, activityId, file);

  const { error: uploadError } = await supabase.storage
    .from(APP_CONFIG.PHOTO_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw new Error(uploadError.message);

  const { data, error } = await supabase
    .from('photos')
    .insert([
      {
        camp_id: campId,
        activity_id: activityId,
        uploaded_by: uploadedBy,
        file_url: path,
        latitude,
        longitude,
      },
    ])
    .select()
    .single();

  if (error) {
    await supabase.storage.from(APP_CONFIG.PHOTO_BUCKET).remove([path]);
    throw new Error(error.message);
  }

  return data as Photo;
}

/**
 * Photos captured by a specific volunteer for a single activity —
 * used for the per-activity photo counter and capture-flow mini-gallery.
 */
export async function fetchMyPhotosForActivity(
  activityId: string,
  uploadedBy: string
): Promise<Photo[]> {
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('activity_id', activityId)
    .eq('uploaded_by', uploadedBy)
    .order('captured_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Photo[];
}

/**
 * All photos captured by a specific volunteer within one camp, with the
 * activity name embedded — used for the volunteer's Personal Gallery.
 */
export async function fetchMyPhotos(
  campId: string,
  uploadedBy: string
): Promise<PhotoWithActivityName[]> {
  const { data, error } = await supabase
    .from('photos')
    .select('*, activity:activities(activity_name)')
    .eq('camp_id', campId)
    .eq('uploaded_by', uploadedBy)
    .order('captured_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as PhotoWithActivityName[];
}

/**
 * Generates a temporary signed URL for a private storage object, since the
 * `camp-photos` bucket is not public. `file_url` in the `photos` table
 * stores the storage path, not a public URL.
 */
export async function getSignedPhotoUrl(
  path: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(APP_CONFIG.PHOTO_BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error) return null;
  return data.signedUrl;
}
