import { useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { offlineDb } from '@/db/offlineDb';
import { surveySubmissionService } from '@/features/survey/services/surveySubmissionService';
import { uploadSurveyProofPhoto } from '@/features/volunteer/services/photoService';
import { surveyService } from '@/services/surveyService';
import { makeDraftKey } from '@/utils/draftKey';
import { useSyncStore } from '@/store/syncStore';
import { countMutations, processPendingMutations, resetFailedMutations } from '@/services/mutationQueue';
import { notifyOfflineSyncComplete } from '@/services/offlineCache';

const MAX_AUTO_ATTEMPTS = 5;

// Shared across every component that mounts this hook, so only one sync runs at a time.
const syncLock = { current: false };

export function useSyncEngine() {
  const { userId, isAuthenticated } = useAuth();

  const { setSyncState, setCounts, setLastErrorMessage } = useSyncStore();

  const refreshSyncCounts = async () => {
    if (!isAuthenticated || !userId) {
      setCounts(0, 0);
      setLastErrorMessage(null);
      return;
    }
    try {
      const pending = await offlineDb.pendingSurveySubmissions
        .where('userId')
        .equals(userId)
        .filter(item => item.sync_status === 'pending')
        .count();

      const failedItems = await offlineDb.pendingSurveySubmissions
        .where('userId')
        .equals(userId)
        .filter(item => item.sync_status === 'failed')
        .toArray();

      const mutations = await countMutations(userId);

      setCounts(pending + mutations.pending, failedItems.length + mutations.failed);

      if (failedItems.length > 0) {
        setLastErrorMessage(failedItems[0].error_message || 'Submission failed');
      } else if (mutations.failed > 0) {
        setLastErrorMessage(mutations.lastError || 'Saved change failed to sync');
      } else {
        setLastErrorMessage(null);
      }
    } catch (err) {
      console.warn('[SyncEngine] Error refreshing sync counts:', err);
    }
  };

  const updateStoreState = async (forcedState?: 'syncing' | 'success' | 'failed') => {
    if (!navigator.onLine) {
      setSyncState('offline');
      await refreshSyncCounts();
      return;
    }

    if (forcedState) {
      setSyncState(forcedState);
      await refreshSyncCounts();
      return;
    }

    await refreshSyncCounts();
    const currentCounts = useSyncStore.getState();
    
    if (syncLock.current) {
      setSyncState('syncing');
    } else if (currentCounts.failedCount > 0) {
      setSyncState('failed');
    } else {
      if (useSyncStore.getState().syncState !== 'success') {
        setSyncState('idle');
      }
    }
  };

  const syncQueue = async () => {
    if (!navigator.onLine || !isAuthenticated || !userId) {
      await updateStoreState();
      return;
    }
    if (syncLock.current) {
      console.log('[SyncEngine] Sync is already in progress, skipping overlapping run.');
      return;
    }

    syncLock.current = true;
    await updateStoreState('syncing');
    console.log('[SyncEngine] Starting offline survey synchronization sequence...');

    let hadItems = false;
    let anyErrors = false;

    try {
      // 0. Replay photos and expenses saved while offline
      const mutationResult = await processPendingMutations(userId);
      if (mutationResult.processed > 0) {
        hadItems = true;
        notifyOfflineSyncComplete();
      }
      if (mutationResult.remaining > 0) {
        anyErrors = true;
      }

      // 1. Fetch pending submissions for current user
      const pendingItems = await offlineDb.pendingSurveySubmissions
        .where('userId')
        .equals(userId)
        .filter(item => item.sync_status === 'pending')
        .toArray();

      // Sort by created_at ASC
      pendingItems.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      if (pendingItems.length > 0) {
        hadItems = true;
      } else {
        syncLock.current = false;
        if (hadItems && !anyErrors) {
          await updateStoreState('success');
          setTimeout(() => updateStoreState(), 3000);
        } else {
          await updateStoreState();
        }
        return;
      }

      console.log(`[SyncEngine] Found ${pendingItems.length} surveys in the queue. Processing...`);

      for (const item of pendingItems) {
        // Double check status again from DB
        const freshItem = await offlineDb.pendingSurveySubmissions.get(item.localId!);
        if (!freshItem || freshItem.sync_status !== 'pending') continue;

        // Skip if max attempts exceeded
        if (freshItem.attempt_count >= MAX_AUTO_ATTEMPTS) {
          await offlineDb.pendingSurveySubmissions.update(item.localId!, {
            sync_status: 'failed',
            error_message: 'Max automatic attempts reached. Requires manual retry.'
          });
          await refreshSyncCounts();
          continue;
        }

        const nextAttemptCount = (freshItem.attempt_count || 0) + 1;
        await offlineDb.pendingSurveySubmissions.update(item.localId!, {
          last_attempt_at: new Date().toISOString(),
          attempt_count: nextAttemptCount
        });

        try {
          const payload = freshItem.payload;
          let currentPhotoUrl = payload.proof_photo_url;

          // 2. Upload photo if still base64
          if (!currentPhotoUrl && payload.answers) {
            const photoAnswerIndex = payload.answers.findIndex(
              (ans: any) => typeof ans.answer_value === 'string' && ans.answer_value.startsWith('data:image/')
            );

            if (photoAnswerIndex !== -1) {
              const base64Data = payload.answers[photoAnswerIndex].answer_value;
              console.log(`[SyncEngine] Uploading verification photo for Ref ID: ${item.surveyReferenceId}`);
              
              const uploadedPath = await uploadSurveyProofPhoto(
                item.campId,
                item.surveyReferenceId,
                base64Data
              );
              
              console.log(`[SyncEngine] Verification photo uploaded successfully: ${uploadedPath}`);
              
              // Persist the uploaded photo path inside the IndexedDB payload immediately
              // This ensures if subsequent survey submission fails, we do NOT re-upload it on retry
              payload.proof_photo_url = uploadedPath;
              payload.answers[photoAnswerIndex].answer_value = uploadedPath;
              
              await offlineDb.pendingSurveySubmissions.update(item.localId!, { payload });
              currentPhotoUrl = uploadedPath;
            }
          }

          // 3. Submit survey payload to Supabase
          console.log(`[SyncEngine] Submitting survey to database for Ref ID: ${item.surveyReferenceId}`);
          
          // Re-map sync_status to 'synced' for Supabase insert
          payload.sync_status = 'synced';
          
          const res = await surveySubmissionService.submitSurvey(payload);
          
          if (res.success) {
            console.log(`[SyncEngine] Survey successfully submitted to database for Ref ID: ${item.surveyReferenceId}`);
            
            // Mark IndexedDB queue record as synced
            await offlineDb.pendingSurveySubmissions.update(item.localId!, {
              sync_status: 'synced',
              error_message: null
            });

            // Clear corresponding localStorage recovery draft
            const draftKey = makeDraftKey(userId, item.campId, item.templateId);
            if (draftKey) {
              surveyService.clearDraft(draftKey);
            }
          } else {
            throw new Error(res.error || 'Unknown submission error');
          }

        } catch (syncErr: any) {
          console.error(`[SyncEngine] Failed sync attempt for Ref ID: ${item.surveyReferenceId}:`, syncErr);
          
          // Check for unique constraint violation (idempotency: error code 23505)
          const isUniqueViolation = 
            syncErr.message?.includes('23505') || 
            syncErr.code === '23505' || 
            (syncErr.details && syncErr.details.includes('23505'));

          if (isUniqueViolation) {
            console.warn(`[SyncEngine] Idempotency hit: Survey already exists in Supabase. Marking synced: ${item.surveyReferenceId}`);
            await offlineDb.pendingSurveySubmissions.update(item.localId!, {
              sync_status: 'synced',
              error_message: null
            });
            const draftKey = makeDraftKey(userId, item.campId, item.templateId);
            if (draftKey) {
              surveyService.clearDraft(draftKey);
            }
            await refreshSyncCounts();
            continue;
          }

          // Check for permanent errors (RLS authorization, validation errors, bad request)
          const isPermanentError = 
            syncErr.status === 400 || 
            syncErr.status === 403 || 
            syncErr.message?.includes('violates Row Level Security') || 
            syncErr.message?.includes('authorization') ||
            syncErr.message?.includes('permission');

          if (isPermanentError) {
            console.error('[SyncEngine] Permanent error encountered. Stopping retries and marking failed.');
            await offlineDb.pendingSurveySubmissions.update(item.localId!, {
              sync_status: 'failed',
              error_message: `Permanent error: ${syncErr.message || 'Validation/Authorization failure'}`
            });
          } else {
            // Transient network error
            const errMsg = syncErr.message || 'Transient network or server timeout error';
            await offlineDb.pendingSurveySubmissions.update(item.localId!, {
              error_message: errMsg
            });
            
            if (nextAttemptCount >= MAX_AUTO_ATTEMPTS) {
              await offlineDb.pendingSurveySubmissions.update(item.localId!, {
                sync_status: 'failed',
                error_message: `Failed after ${MAX_AUTO_ATTEMPTS} attempts: ${errMsg}`
              });
            }
          }
        }
        await refreshSyncCounts();
      }

      // After loop ends, verify if there are failed items left
      const remainingPending = await offlineDb.pendingSurveySubmissions
        .where('userId')
        .equals(userId)
        .filter(item => item.sync_status === 'pending')
        .count();

      const remainingFailed = await offlineDb.pendingSurveySubmissions
        .where('userId')
        .equals(userId)
        .filter(item => item.sync_status === 'failed')
        .count();

      if (remainingFailed > 0 || remainingPending > 0) {
        anyErrors = true;
      }
    } catch (globalErr) {
      console.error('[SyncEngine] Global error in synchronization loop:', globalErr);
      anyErrors = true;
    } finally {
      syncLock.current = false;
      
      if (hadItems && !anyErrors) {
        await updateStoreState('success');
        // Automatically hide success message after 3 seconds
        setTimeout(() => {
          updateStoreState();
        }, 3000);
      } else if (anyErrors) {
        await updateStoreState('failed');
      } else {
        await updateStoreState();
      }
      console.log('[SyncEngine] Offline survey synchronization sequence ended.');
    }
  };

  // Manual retry function exposed to window/custom triggers
  const triggerManualRetry = async () => {
    if (!navigator.onLine || !isAuthenticated || !userId) return;
    
    console.log('[SyncEngine] Manual sync retry triggered. Resetting failed items...');
    try {
      // Find failed items for the current user and reset them back to pending
      const failedItems = await offlineDb.pendingSurveySubmissions
        .where('userId')
        .equals(userId)
        .filter(item => item.sync_status === 'failed')
        .toArray();

      for (const item of failedItems) {
        await offlineDb.pendingSurveySubmissions.update(item.localId!, {
          sync_status: 'pending',
          attempt_count: 0,
          error_message: null
        });
      }
      await resetFailedMutations(userId);
      await refreshSyncCounts();
    } catch (err) {
      console.error('[SyncEngine] Error resetting failed items:', err);
    }
    
    // Trigger sync run
    await syncQueue();
  };

  useEffect(() => {
    // Register manual retry helper on window for manual retries and debug verification
    (window as any).__triggerPwaSyncManualRetry = triggerManualRetry;

    // Refresh counts and store state on startup
    updateStoreState();

    // Trigger sync on startup if online
    if (navigator.onLine && isAuthenticated && userId) {
      syncQueue();
    }

    // Trigger sync on online event listener
    const handleOnline = () => {
      console.log('[SyncEngine] Network connection detected. Triggering sync...');
      syncQueue();
    };

    const handleOffline = () => {
      console.log('[SyncEngine] Network offline.');
      updateStoreState();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Poll counts every 2 seconds to keep in sync with local database writes
    const pollInterval = setInterval(() => {
      updateStoreState();
    }, 2000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(pollInterval);
      delete (window as any).__triggerPwaSyncManualRetry;
    };
  }, [userId, isAuthenticated]);

  return { syncQueue, triggerManualRetry };
}
