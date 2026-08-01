import { supabase } from '@/services/supabase';
import { APP_CONFIG } from '@/constants';
import type { Photo } from '@/types';

export interface PhotoWithActivityName extends Photo {
  activity: { activity_name: string } | null;
}

export interface UploadPhotoInput {
  projectId: string;
  activityId: string;
  uploadedBy: string;
  file: File;
  latitude?: number | null;
  longitude?: number | null;
}

function buildStoragePath(projectId: string, activityId: string, file: File): string {
  const ext = file.name.split('.').pop() || 'jpg';
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${projectId}/${activityId}/${unique}.${ext}`;
}

/**
 * Uploads a photo file to the private `camp-photos` storage bucket, then
 * records its metadata in the `photos` table. If the metadata insert fails,
 * the uploaded storage object is removed so orphaned files don't accumulate.
 */
export async function uploadPhoto({
  projectId,
  activityId,
  uploadedBy,
  file,
  latitude = null,
  longitude = null,
}: UploadPhotoInput): Promise<Photo> {
  const path = buildStoragePath(projectId, activityId, file);

  const { error: uploadError } = await supabase.storage
    .from(APP_CONFIG.PHOTO_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw new Error(uploadError.message);

  const { data, error } = await supabase
    .from('photos')
    .insert([
      {
        camp_id: projectId,
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
 * All photos captured by a specific volunteer within one project, with the
 * activity name embedded — used for the volunteer's Personal Gallery.
 */
export async function fetchMyPhotos(
  projectId: string,
  uploadedBy: string
): Promise<PhotoWithActivityName[]> {
  const { data, error } = await supabase
    .from('photos')
    .select('*, activity:activities(activity_name)')
    .eq('camp_id', projectId)
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

export interface PhotoWithDetails extends Photo {
  activity: { activity_name: string } | null;
  uploader?: {
    person: { full_name: string } | null;
  } | null;
}

/**
 * All photos captured for a project — used by faculty to review, toggle report selection,
 * and manage photos.
 */
export async function fetchProjectPhotos(projectId: string): Promise<PhotoWithDetails[]> {
  const { data, error } = await supabase
    .from('photos')
    .select(`
      *,
      activity:activities(activity_name),
      uploader:users(
        person:persons(full_name)
      )
    `)
    .eq('camp_id', projectId)
    .order('captured_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as PhotoWithDetails[];
}

/**
 * Toggles whether a photo is selected for inclusion in institutional reports.
 */
export async function togglePhotoReportSelection(
  photoId: string,
  isSelected: boolean
): Promise<Photo> {
  const { data, error } = await supabase
    .from('photos')
    .update({ is_selected_for_report: isSelected })
    .eq('id', photoId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Photo;
}

/**
 * Deletes a photo from both Supabase Storage and the database.
 */
export async function deletePhoto(photoId: string, filePath: string): Promise<void> {
  const { error: dbError } = await supabase
    .from('photos')
    .delete()
    .eq('id', photoId);

  if (dbError) throw new Error(dbError.message);

  const { error: storageError } = await supabase.storage
    .from(APP_CONFIG.PHOTO_BUCKET)
    .remove([filePath]);

  if (storageError) {
    console.warn(`Failed to delete storage file ${filePath}: ${storageError.message}`);
  }
}
