import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { surveyService } from '@/services/surveyService';
import type { SurveyResponseData } from '@/types/survey';
import { IndividualSurveyReport } from '@/features/reports/components/IndividualSurveyReport';
import { Spinner } from '@/components/ui';
import { AlertCircle } from 'lucide-react';

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
          setError(`Survey record not found in database for ID: ${surveyId}`);
        } else {
          setSurvey(data);
        }
      } catch (err: any) {
        console.error('Error fetching survey details:', err);
        setError(err.message || 'Failed to load survey details');
      } finally {
        setLoading(false);
      }
    }
    loadSurvey();
  }, [surveyId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <Spinner size="lg" />
        <span className="text-xs font-semibold text-slate-500 mt-2">Loading hydrated survey collection details...</span>
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-red-50 dark:bg-red-950/30 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-black text-slate-950 dark:text-white">Failed to Load Survey</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {error || 'The requested survey record does not exist or could not be loaded from the database.'}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="w-full py-3 bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold rounded-2xl text-xs transition-all shadow-md"
          >
            Go Back
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
