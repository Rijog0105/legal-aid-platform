import { supabase } from '@/services/supabase';
import { APP_CONFIG } from '@/constants';
import type { Photo } from '@/types';

export interface PhotoWithActivityName extends Photo {
  activity: { activity_name: string; phase: 'survey' | 'camp' } | null;
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
  console.log('[photoService.uploadPhoto] Storage Path:', path);
  console.log('[photoService.uploadPhoto] File type:', file.type, 'File size:', file.size);

  console.log('[photoService.uploadPhoto] Starting Supabase storage upload...');
  const { error: uploadError } = await supabase.storage
    .from(APP_CONFIG.PHOTO_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  
  if (uploadError) {
    console.error('[photoService.uploadPhoto] Supabase Storage upload error:', uploadError);
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }
  console.log('[photoService.uploadPhoto] Supabase Storage upload succeeded!');

  console.log('[photoService.uploadPhoto] Starting Database insert into photos...');
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
    console.error('[photoService.uploadPhoto] Database insert error:', error);
    console.log('[photoService.uploadPhoto] Cleaning up uploaded storage file...');
    await supabase.storage.from(APP_CONFIG.PHOTO_BUCKET).remove([path]);
    throw new Error(`Database insert failed: ${error.message}`);
  }

  console.log('[photoService.uploadPhoto] Database insert succeeded! Data:', data);
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
    .select('*, activity:activities(activity_name, phase), uploader:users(person:persons(full_name))')
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
 * Uploads a survey proof photo (Base64 JPEG string or File/Blob) to the private 'survey-proof-photos' bucket.
 */
export async function uploadSurveyProofPhoto(
  campId: string,
  surveyId: string,
  base64OrFile: string | File | Blob
): Promise<string> {
  let fileBody: Blob | File;
  let contentType = 'image/jpeg';

  if (typeof base64OrFile === 'string' && base64OrFile.startsWith('data:')) {
    // Convert Base64 data URL to Blob
    const arr = base64OrFile.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    fileBody = new Blob([u8arr], { type: mime });
    contentType = mime;
  } else if (typeof base64OrFile !== 'string') {
    fileBody = base64OrFile;
    contentType = (base64OrFile as any).type || 'image/jpeg';
  } else {
    throw new Error('Invalid file format for upload');
  }

  const timestamp = Date.now();
  const path = `camp/${campId}/survey/${surveyId}/verification-${timestamp}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from(APP_CONFIG.SURVEY_PROOF_PHOTO_BUCKET)
    .upload(path, fileBody, { contentType, upsert: true });

  if (uploadError) {
    throw new Error(`Failed to upload survey proof photo to storage: ${uploadError.message}`);
  }

  return path;
}

/**
 * Generates a temporary signed URL for a private survey proof photo.
 */
export async function getSignedSurveyProofPhotoUrl(
  path: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith('data:image/') || path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const { data, error } = await supabase.storage
    .from(APP_CONFIG.SURVEY_PROOF_PHOTO_BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error) {
    console.error('Error generating signed URL for survey proof photo:', error);
    return null;
  }
  return data.signedUrl;
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
