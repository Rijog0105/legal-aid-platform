// src/utils/draftKey.ts
/**
 * Generate a scoped LocalStorage key for survey drafts.
 * Format: legal_aid_draft_<userId>_<campId>_<templateId>
 * Returns null if any identifier is missing.
 */
export function makeDraftKey(
  userId: string | null | undefined,
  campId: string | null | undefined,
  templateId: string | null | undefined,
): string | null {
  if (!userId || !campId || !templateId) {
    console.info('[makeDraftKey] Missing identifier(s)', { userId, campId, templateId });
    return null;
  }
  return `legal_aid_draft_${userId}_${campId}_${templateId}`;
}
