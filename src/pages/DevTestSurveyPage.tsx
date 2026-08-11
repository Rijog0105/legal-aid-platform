import React, { useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';
import { surveyService } from '@/services/surveyService';
import type { SurveyResponseData } from '@/types/survey';

export const DevTestSurveyPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latestSurveyId, setLatestSurveyId] = useState<string | null>(null);
  const [hydratedData, setHydratedData] = useState<SurveyResponseData | null>(null);

  useEffect(() => {
    async function loadLatestSurvey() {
      setLoading(true);
      try {
        // 1. Fetch latest survey header record
        const { data: latest, error: fetchErr } = await supabase
          .from('surveys')
          .select('id, survey_reference_id, submitted_at')
          .order('submitted_at', { ascending: false })
          .limit(1);

        if (fetchErr) {
          throw fetchErr;
        }

        if (!latest || latest.length === 0) {
          setError('No survey records found in the database. Please submit a survey first.');
          setLoading(false);
          return;
        }

        const surveyId = latest[0].id;
        setLatestSurveyId(surveyId);

        // 2. Fetch complete hydrated survey data
        const completeData = await surveyService.fetchCompleteSurvey(surveyId);
        if (!completeData) {
          setError(`Failed to hydrate survey with ID: ${surveyId}`);
        } else {
          setHydratedData(completeData);
        }
      } catch (err: any) {
        console.error('Error in DevTestSurveyPage:', err);
        setError(err.message || 'An error occurred while loading survey details.');
      } finally {
        setLoading(false);
      }
    }

    loadLatestSurvey();
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="border-b border-slate-700 pb-4">
          <h1 className="text-2xl font-black tracking-tight text-white">Developer Hydration Diagnostics</h1>
          <p className="text-sm text-slate-400 mt-1">
            Loads the latest survey from PostgreSQL and runs <code className="bg-slate-800 px-1.5 py-0.5 rounded text-indigo-400">surveyService.fetchCompleteSurvey()</code>.
          </p>
        </header>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            <span className="ml-3 text-sm text-slate-400">Fetching and hydrating survey data...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-950/30 border border-red-800 rounded-2xl p-6 text-red-400 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        {!loading && !error && hydratedData && (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 space-y-2">
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Loaded Survey Target</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs mt-2">
                <div>
                  <span className="text-slate-500 block">Database ID (survey_id)</span>
                  <span className="font-mono text-indigo-400">{latestSurveyId}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Reference Code</span>
                  <span className="font-mono text-emerald-400">{hydratedData.surveyReferenceId}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Submitted At</span>
                  <span className="font-mono text-amber-400">{hydratedData.submittedAt}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Hydrated Object Representation (JSON)</h3>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 overflow-x-auto">
                <pre className="text-xs font-mono text-indigo-300 whitespace-pre-wrap leading-relaxed">
                  {JSON.stringify(hydratedData, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
