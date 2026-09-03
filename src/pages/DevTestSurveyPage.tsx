import React, { useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';
import { surveyService } from '@/services/surveyService';
import type { SurveyResponseData } from '@/types/survey';
import { Terminal, Code, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants';
import { Spinner } from '@/components/ui';

export const DevTestSurveyPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latestSurveyId, setLatestSurveyId] = useState<string | null>(null);
  const [hydratedData, setHydratedData] = useState<SurveyResponseData | null>(null);

  useEffect(() => {
    async function loadLatestSurvey() {
      setLoading(true);
      try {
        const { data: latest, error: fetchErr } = await supabase
          .from('surveys')
          .select('id, survey_reference_id, submitted_at')
          .order('submitted_at', { ascending: false })
          .limit(1);

        if (fetchErr) throw fetchErr;

        if (!latest || latest.length === 0) {
          setError('No survey records found in the database. Please submit a survey first.');
          setLoading(false);
          return;
        }

        const surveyId = latest[0].id;
        setLatestSurveyId(surveyId);

        const completeData = await surveyService.fetchCompleteSurvey(surveyId);
        if (!completeData) {
          setError(`Failed to hydrate survey with ID: ${surveyId}`);
        } else {
          setHydratedData(completeData);
        }
      } catch (err: unknown) {
        console.error('Error in DevTestSurveyPage:', err);
        setError(err instanceof Error ? err.message : 'An error occurred while loading survey details.');
      } finally {
        setLoading(false);
      }
    }

    loadLatestSurvey();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 sm:p-10 font-sans antialiased">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(ROUTES.DASHBOARD)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Back to Dashboard</span>
          </button>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            ENV: Diagnostics
          </span>
        </div>

        <header className="border-b border-slate-800 pb-4 space-y-1">
          <div className="flex items-center gap-2">
            <Terminal size={20} className="text-indigo-400" />
            <h1 className="text-xl font-black tracking-tight text-white">Survey Hydration Inspector</h1>
          </div>
          <p className="text-xs text-slate-400">
            Validates PostgreSQL relation hydration via <code className="bg-slate-900 px-1.5 py-0.5 rounded text-indigo-400 text-[11px]">surveyService.fetchCompleteSurvey()</code>.
          </p>
        </header>

        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
            <Spinner size="lg" />
            <span className="text-xs">Fetching and hydrating database records…</span>
          </div>
        )}

        {error && (
          <div className="bg-red-950/40 border border-red-800 rounded-3xl p-5 text-red-300 text-xs flex items-start gap-3">
            <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && hydratedData && (
          <div className="space-y-4">
            <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 space-y-3 shadow-xl">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Hydrated Survey Metadata</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-1">
                <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Database UUID</span>
                  <span className="font-mono text-indigo-400 text-xs truncate block mt-0.5">{latestSurveyId}</span>
                </div>
                <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Reference ID</span>
                  <span className="font-mono text-emerald-400 text-xs block mt-0.5">{hydratedData.surveyReferenceId}</span>
                </div>
                <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Submission Timestamp</span>
                  <span className="font-mono text-amber-400 text-xs block mt-0.5">{hydratedData.submittedAt}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold">
                <Code size={14} className="text-indigo-400" />
                <span>JSON DATA PAYLOAD</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 overflow-x-auto shadow-xl">
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
