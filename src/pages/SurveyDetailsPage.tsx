import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { surveyService } from '@/services/surveyService';
import type { SurveyResponseData } from '@/types/survey';
import { IndividualSurveyReport } from '@/features/reports/components/IndividualSurveyReport';
import { Spinner } from '@/components/ui';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export const SurveyDetailsPage: React.FC = () => {
  const { surveyId } = useParams<{ surveyId: string }>();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState<SurveyResponseData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSurvey() {
      if (!surveyId) return;
      setLoading(true);
      setError(null);
      try {
        const data = await surveyService.fetchCompleteSurvey(surveyId);
        if (!data) {
          setError(`Survey record not found for ID: ${surveyId}`);
        } else {
          setSurvey(data);
        }
      } catch (err: unknown) {
        console.error('Error fetching survey details:', err);
        setError(err instanceof Error ? err.message : 'Failed to load survey details');
      } finally {
        setLoading(false);
      }
    }
    loadSurvey();
  }, [surveyId]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
        <Spinner size="lg" />
        <span className="text-xs font-semibold text-slate-500 mt-3">Loading survey record details…</span>
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full shadow-xl text-center space-y-4 animate-fade-in">
          <div className="mx-auto w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center">
            <AlertCircle size={26} />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Survey Record Not Found</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {error || 'The requested survey record does not exist or has been removed.'}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all cursor-pointer inline-flex items-center justify-center gap-2"
          >
            <ArrowLeft size={14} />
            <span>Go Back</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <IndividualSurveyReport
      survey={survey}
      onBack={() => navigate(-1)}
    />
  );
};
