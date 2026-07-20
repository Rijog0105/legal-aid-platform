import { useState } from 'react';
import { NARRATIVE_SECTION_TYPE, NARRATIVE_SECTION_LABELS, type NarrativeSectionType } from '@/constants';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useNarratives } from '../hooks/useNarratives';
import { Card, Spinner, Button } from '@/components/ui';
import { CheckCircle2, AlertCircle, Save } from 'lucide-react';

interface NarrativesTabProps {
  campId: string;
}

const SECTION_DESCRIPTIONS: Record<NarrativeSectionType, string> = {
  [NARRATIVE_SECTION_TYPE.SYNOPSIS]: 'Executive summary of the legal aid camp, background context, and overall execution.',
  [NARRATIVE_SECTION_TYPE.OBJECTIVES]: 'Key legal literacy, consultation, and institutional goals established for the camp.',
  [NARRATIVE_SECTION_TYPE.OBSERVATIONS]: 'On-field observations regarding legal queries, community awareness, and field dynamics.',
  [NARRATIVE_SECTION_TYPE.RECOMMENDATIONS]: 'Actionable suggestions for future camps, legal clinic improvements, and authority follow-ups.',
  [NARRATIVE_SECTION_TYPE.CONCLUSION]: 'Concluding summary of camp achievements, beneficiary engagement, and final remarks.',
};

const SECTION_TYPES: NarrativeSectionType[] = [
  NARRATIVE_SECTION_TYPE.SYNOPSIS,
  NARRATIVE_SECTION_TYPE.OBJECTIVES,
  NARRATIVE_SECTION_TYPE.OBSERVATIONS,
  NARRATIVE_SECTION_TYPE.RECOMMENDATIONS,
  NARRATIVE_SECTION_TYPE.CONCLUSION,
];

export function NarrativesTab({ campId }: NarrativesTabProps) {
  const { userId } = useAuth();
  const { narratives, isLoading, error, saveSection } = useNarratives(campId);

  const [localContent, setLocalContent] = useState<Record<string, string>>({});
  const [savingState, setSavingState] = useState<Record<string, boolean>>({});
  const [savedStatus, setSavedStatus] = useState<Record<string, boolean>>({});
  const [saveErrors, setSaveErrors] = useState<Record<string, string | null>>({});

  const getContent = (type: NarrativeSectionType): string => {
    if (localContent[type] !== undefined) return localContent[type];
    const existing = narratives.find((n) => n.section_type === type);
    return existing ? existing.content : '';
  };

  const handleBlurOrSave = async (type: NarrativeSectionType) => {
    const text = getContent(type);
    setSavingState((prev) => ({ ...prev, [type]: true }));
    setSaveErrors((prev) => ({ ...prev, [type]: null }));

    try {
      await saveSection(type, text, userId ?? '');
      setSavedStatus((prev) => ({ ...prev, [type]: true }));
      setTimeout(() => {
        setSavedStatus((prev) => ({ ...prev, [type]: false }));
      }, 3000);
    } catch (err) {
      setSaveErrors((prev) => ({
        ...prev,
        [type]: err instanceof Error ? err.message : 'Failed to save section',
      }));
    } finally {
      setSavingState((prev) => ({ ...prev, [type]: false }));
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-lg font-bold text-surface-900">Report Narrative Sections</h2>
        <p className="text-xs text-surface-500 mt-0.5">
          Curate textual narratives for final report generation. Content saves automatically when you exit an editor.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-5">
        {SECTION_TYPES.map((type) => {
          const content = getContent(type);
          const isSaving = savingState[type];
          const isJustSaved = savedStatus[type];
          const sectionError = saveErrors[type];

          return (
            <Card key={type} className="p-5 space-y-3 border-surface-200">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-surface-100">
                <div>
                  <h3 className="text-base font-bold text-surface-900">
                    {NARRATIVE_SECTION_LABELS[type]}
                  </h3>
                  <p className="text-xs text-surface-500 mt-0.5">
                    {SECTION_DESCRIPTIONS[type]}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  {isSaving && (
                    <span className="flex items-center gap-1.5 text-surface-500">
                      <Spinner size="sm" />
                      Saving...
                    </span>
                  )}
                  {isJustSaved && !isSaving && (
                    <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                      <CheckCircle2 size={14} />
                      Saved
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    isLoading={isSaving}
                    leftIcon={<Save size={13} />}
                    onClick={() => handleBlurOrSave(type)}
                  >
                    Save Section
                  </Button>
                </div>
              </div>

              {sectionError && (
                <div className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle size={13} />
                  {sectionError}
                </div>
              )}

              <textarea
                value={content}
                onChange={(e) =>
                  setLocalContent((prev) => ({ ...prev, [type]: e.target.value }))
                }
                onBlur={() => handleBlurOrSave(type)}
                rows={4}
                placeholder={`Enter ${NARRATIVE_SECTION_LABELS[type].toLowerCase()} content for the report...`}
                className="w-full p-3 rounded-xl border border-surface-200 text-sm text-surface-900 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all resize-y"
              />

              <div className="flex justify-end text-[11px] text-surface-400 font-medium">
                {content.length} characters
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
