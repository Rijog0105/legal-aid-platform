import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, FileText, Download, Calendar, MapPin, CheckCircle2, Scale, Plus } from 'lucide-react';
import type { SurveyResponseData } from '@/types/survey';
import { ImageWithSignedUrl } from '@/components/ImageWithSignedUrl';
import { surveyService } from '@/services/surveyService';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { IndividualSurveyReport } from '@/features/reports/components/IndividualSurveyReport';
import { ROUTES } from '@/constants';

export const VolunteerSurveyReportsPage: React.FC = () => {
  const { userId } = useAuth();
  const navigate = useNavigate();

  const [surveys, setSurveys] = useState<SurveyResponseData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyResponseData | null>(null);

  const loadSurveys = async () => {
    setLoading(true);
    const data = await surveyService.fetchAllSurveys();
    // Filter surveys submitted by this volunteer (or all local responses)
    const mySurveys = data.filter((s) => !userId || s.submittedBy === userId || true);
    setSurveys(mySurveys);
    setLoading(false);
  };

  useEffect(() => {
    loadSurveys();
  }, [userId]);

  if (selectedSurvey) {
    return (
      <IndividualSurveyReport
        survey={selectedSurvey}
        onBack={() => setSelectedSurvey(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(ROUTES.VOLUNTEER_HOME)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Volunteer Workspace
          </button>

          <button
            onClick={() => navigate(ROUTES.VOLUNTEER_SURVEY)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            New Survey
          </button>
        </div>

        {/* Title Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-indigo-600" />
              Volunteer Survey Portal
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            My Submitted Individual Survey Reports
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            View, print, and download PDF individual reports for your submitted legal aid surveys.
          </p>
        </div>

        {/* Submitted Surveys List */}
        {loading ? (
          <div className="text-center py-16 text-xs text-slate-400">Loading submitted reports...</div>
        ) : surveys.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
            <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Submitted Survey Reports Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You have not submitted any surveys yet. Conduct a survey to auto-generate individual reports.
            </p>
            <button
              onClick={() => navigate(ROUTES.VOLUNTEER_SURVEY)}
              className="px-5 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl inline-flex items-center gap-2 shadow"
            >
              <Plus className="w-4 h-4" />
              Conduct First Survey
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {surveys.map((survey) => (
              <div
                key={survey.surveyReferenceId}
                className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  {/* Proof Photo Thumbnail if available */}
                  {survey.proofPhotoUrl ? (
                    <ImageWithSignedUrl
                      src={survey.proofPhotoUrl}
                      alt="Proof"
                      className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900 flex items-center justify-center text-indigo-600 shrink-0">
                      <FileText className="w-8 h-8" />
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400">
                        {survey.surveyReferenceId}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        Report Ready
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {survey.villageDistrict || 'Village'}
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {survey.dateOfDataCollection || survey.submittedAt?.split('T')[0]}
                      </span>
                      <span>•</span>
                      <span>Surveyor: {survey.nameOfDataCollector}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setSelectedSurvey(survey)}
                    className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    View & Download Individual Report
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
