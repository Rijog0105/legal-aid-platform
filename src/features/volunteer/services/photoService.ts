import { supabase } from '@/services/supabase';
import { APP_CONFIG } from '@/constants';
import type { Photo } from '@/types';

export interface PhotoWithActivityName extends Photo {
  activity: { activity_name: string } | null;
  uploader?: { person?: { full_name?: string } } | null;
}

export type PhotoWithDetails = PhotoWithActivityName;

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
 * records its metadata in the `photos` table.
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
 * Photos captured by a specific volunteer for a single activity.
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
 * activity name embedded — used for the volunteer's Personal Gallery (My Works).
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

export async function fetchProjectPhotos(projectId: string): Promise<PhotoWithDetails[]> {
  const { data, error } = await supabase
    .from('photos')
    .select('*, activity:activities(activity_name)')
    .eq('camp_id', projectId)
    .order('captured_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as PhotoWithDetails[];
}

export async function togglePhotoReportSelection(photoId: string, isSelected: boolean): Promise<void> {
  const { error } = await supabase
    .from('photos')
    .update({ is_selected_for_report: isSelected })
    .eq('id', photoId);
  if (error) throw new Error(error.message);
}

/**
 * Record a survey proof photo directly into the photos table so it appears in My Works.
 */
export async function recordSurveyProofPhoto({
  campId,
  uploadedBy,
  fileUrl,
  latitude,
  longitude,
  capturedAt,
}: {
  campId?: string | null;
  uploadedBy: string;
  fileUrl: string;
  latitude?: number | null;
  longitude?: number | null;
  capturedAt?: string;
}): Promise<void> {
  try {
    if (!campId) return;
    const { error } = await supabase.from('photos').insert([
      {
        camp_id: campId,
        uploaded_by: uploadedBy,
        file_url: fileUrl,
        latitude: latitude || null,
        longitude: longitude || null,
        captured_at: capturedAt || new Date().toISOString(),
      },
    ]);
    if (error) {
      console.warn('Could not record survey proof photo to Supabase photos table', error);
    }
  } catch (err) {
    console.error('Error recording survey proof photo', err);
  }
}

/**
 * Generates a temporary signed URL for a private storage object.
 */
export async function getSignedPhotoUrl(
  path: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  if (path.startsWith('data:image/') || path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const { data, error } = await supabase.storage
    .from(APP_CONFIG.PHOTO_BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error) return null;
  return data.signedUrl;
}

export async function deletePhoto(id: string, storagePath: string): Promise<void> {
  if (!storagePath.startsWith('data:')) {
    await supabase.storage.from(APP_CONFIG.PHOTO_BUCKET).remove([storagePath]);
  }
  const { error } = await supabase.from('photos').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
