import { supabase } from '@/services/supabase';
import { APP_CONFIG } from '@/constants';
import type { Photo } from '@/types';
import { offlineDb, type PendingMutation } from '@/db/offlineDb';
import { isNetworkError, isOffline, makeTempId, withOfflineCache } from '@/services/offlineCache';
import { getPendingMutations, queueMutation } from '@/services/mutationQueue';

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
  /** Shown in galleries while the photo is waiting to sync. */
  activityName?: string;
  activityPhase?: 'survey' | 'camp';
}

const LOCAL_PHOTO_PREFIX = 'local:';

function buildStoragePath(projectId: string, activityId: string, file: File): string {
  const ext = file.name.split('.').pop() || 'jpg';
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${projectId}/${activityId}/${unique}.${ext}`;
}

/** Converts a queued photo upload into the Photo shape the UI renders. */
function pendingToPhoto(m: PendingMutation): PhotoWithActivityName {
  const p = m.payload;
  return {
    id: m.tempId!,
    camp_id: p.camp_id,
    activity_id: p.activity_id,
    uploaded_by: p.uploaded_by,
    file_url: `${LOCAL_PHOTO_PREFIX}${m.tempId}`,
    latitude: p.latitude,
    longitude: p.longitude,
    captured_at: p.captured_at,
    is_selected_for_report: false,
    created_at: m.created_at,
    activity: p.activity_name ? { activity_name: p.activity_name, phase: p.activity_phase ?? 'camp' } : null,
    uploader: null,
  };
}

async function pendingPhotos(filter: (p: any) => boolean): Promise<PhotoWithActivityName[]> {
  const items = await getPendingMutations((m) => m.type === 'photo_upload' && filter(m.payload));
  return items.map(pendingToPhoto).reverse();
}

/**
 * Uploads a photo file to the private `camp-photos` storage bucket, then
 * records its metadata in the `photos` table. When offline the photo is kept
 * on the device and uploaded automatically once the connection returns.
 */
export async function uploadPhoto({
  projectId,
  activityId,
  uploadedBy,
  file,
  latitude = null,
  longitude = null,
  activityName,
  activityPhase,
}: UploadPhotoInput): Promise<Photo> {
  const path = buildStoragePath(projectId, activityId, file);

  const queueForLater = async (): Promise<Photo> => {
    const tempId = makeTempId();
    await queueMutation({
      type: 'photo_upload',
      userId: uploadedBy,
      campId: projectId,
      tempId,
      payload: {
        path,
        blob: file,
        camp_id: projectId,
        activity_id: activityId,
        uploaded_by: uploadedBy,
        latitude,
        longitude,
        captured_at: new Date().toISOString(),
        activity_name: activityName,
        activity_phase: activityPhase,
      },
    });
    const [queued] = await getPendingMutations((m) => m.tempId === tempId);
    return pendingToPhoto(queued);
  };

  if (isOffline()) return queueForLater();

  const { error: uploadError } = await supabase.storage
    .from(APP_CONFIG.PHOTO_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    if (isNetworkError(uploadError.message)) return queueForLater();
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

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
    if (isNetworkError(error.message)) return queueForLater();
    throw new Error(`Database insert failed: ${error.message}`);
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
  const remote = await withOfflineCache(`photos:activity:${activityId}:${uploadedBy}`, async () => {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('activity_id', activityId)
      .eq('uploaded_by', uploadedBy)
      .order('captured_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Photo[];
  }).catch(() => [] as Photo[]);

  const local = await pendingPhotos((p) => p.activity_id === activityId && p.uploaded_by === uploadedBy);
  return [...local, ...remote];
}

/**
 * All photos captured by a specific volunteer within one project, with the
 * activity name embedded — used for the volunteer's Personal Gallery (My Works).
 */
export async function fetchMyPhotos(
  projectId: string,
  uploadedBy: string
): Promise<PhotoWithActivityName[]> {
  const remote = await withOfflineCache(`photos:mine:${projectId}:${uploadedBy}`, async () => {
    const { data, error } = await supabase
      .from('photos')
      .select('*, activity:activities(activity_name)')
      .eq('camp_id', projectId)
      .eq('uploaded_by', uploadedBy)
      .order('captured_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as PhotoWithActivityName[];
  });

  const local = await pendingPhotos((p) => p.camp_id === projectId && p.uploaded_by === uploadedBy);
  return [...local, ...remote];
}

export async function fetchProjectPhotos(projectId: string): Promise<PhotoWithDetails[]> {
  const remote = await withOfflineCache(`photos:project:${projectId}`, async () => {
    const { data, error } = await supabase
      .from('photos')
      .select('*, activity:activities(activity_name, phase), uploader:users(person:persons(full_name))')
      .eq('camp_id', projectId)
      .order('captured_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as PhotoWithDetails[];
  });

  const local = await pendingPhotos((p) => p.camp_id === projectId);
  return [...local, ...remote];
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
 * Creates a signed URL and remembers it, so the image (cached by the service
 * worker) can still be shown when the device is offline.
 */
async function signedUrlWithFallback(bucket: string, path: string, expiresInSeconds: number): Promise<string | null> {
  const cacheKey = `${bucket}/${path}`;
  if (!isOffline()) {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
    if (!error && data?.signedUrl) {
      offlineDb.signedUrlCache
        .put({ path: cacheKey, url: data.signedUrl, cached_at: new Date().toISOString() })
        .catch(() => undefined);
      return data.signedUrl;
    }
    if (error && !isNetworkError(error.message)) {
      console.error(`Error generating signed URL for ${cacheKey}:`, error);
    }
  }
  const cached = await offlineDb.signedUrlCache.get(cacheKey).catch(() => undefined);
  return cached?.url ?? null;
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
  return signedUrlWithFallback(APP_CONFIG.SURVEY_PROOF_PHOTO_BUCKET, path, expiresInSeconds);
}

/**
 * Generates a temporary signed URL for a private storage object. Photos still
 * waiting to sync are read straight from the device.
 */
export async function getSignedPhotoUrl(
  path: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  if (path.startsWith('data:image/') || path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  if (path.startsWith(LOCAL_PHOTO_PREFIX)) {
    const tempId = path.slice(LOCAL_PHOTO_PREFIX.length);
    const [queued] = await getPendingMutations((m) => m.tempId === tempId);
    return queued?.payload?.blob ? URL.createObjectURL(queued.payload.blob) : null;
  }
  return signedUrlWithFallback(APP_CONFIG.PHOTO_BUCKET, path, expiresInSeconds);
}

export async function deletePhoto(id: string, storagePath: string): Promise<void> {
  if (storagePath.startsWith(LOCAL_PHOTO_PREFIX)) {
    const queued = await getPendingMutations((m) => m.tempId === id);
    await Promise.all(queued.map((m) => offlineDb.pendingMutations.delete(m.localId!)));
    return;
  }
  if (!storagePath.startsWith('data:')) {
    await supabase.storage.from(APP_CONFIG.PHOTO_BUCKET).remove([storagePath]);
  }
  const { error } = await supabase.from('photos').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
