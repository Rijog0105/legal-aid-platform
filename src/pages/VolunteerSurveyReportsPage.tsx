import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Download, Calendar, MapPin, CheckCircle2, Plus } from 'lucide-react';
import type { SurveyResponseData } from '@/types/survey';
import { ImageWithSignedUrl } from '@/components/ImageWithSignedUrl';
import { surveyService } from '@/services/surveyService';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { IndividualSurveyReport } from '@/features/reports/components/IndividualSurveyReport';
import { ROUTES } from '@/constants';
import { Spinner } from '@/components/ui';

export const VolunteerSurveyReportsPage: React.FC = () => {
  const { userId } = useAuth();
  const navigate = useNavigate();

  const [surveys, setSurveys] = useState<SurveyResponseData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyResponseData | null>(null);

  const loadSurveys = async () => {
    setLoading(true);
    const data = await surveyService.fetchAllSurveys();
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
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-12">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(ROUTES.VOLUNTEER_HOME)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Back to Field Portal</span>
        </button>

        <button
          onClick={() => navigate(ROUTES.VOLUNTEER_SURVEY)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
        >
          <Plus size={14} />
          <span>Conduct New Survey</span>
        </button>
      </div>

      {/* Title Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-2">
        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wider">
          Individual Survey Repository
        </span>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          My Household Survey Reports
        </h1>
        <p className="text-xs text-slate-500">
          Access, verify, and export PDF reports for surveys collected during the field assessment phase.
        </p>
      </div>

      {/* Submitted Surveys List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : surveys.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <FileText size={24} />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No Surveys Recorded Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Surveys recorded on the field will generate auto-formatted individual legal assessment reports here.
          </p>
          <button
            onClick={() => navigate(ROUTES.VOLUNTEER_SURVEY)}
            className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 shadow-xs mt-2 cursor-pointer"
          >
            <Plus size={14} />
            <span>Start Survey</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {surveys.map((survey) => (
            <div
              key={survey.surveyReferenceId}
              className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4">
                {survey.proofPhotoUrl ? (
                  <ImageWithSignedUrl
                    src={survey.proofPhotoUrl}
                    alt="Proof"
                    className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <FileText size={22} />
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-indigo-600">
                      {survey.surveyReferenceId}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 size={11} className="text-emerald-600" />
                      <span>Ready</span>
                    </span>
                  </div>

                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <MapPin size={13} className="text-slate-400" />
                    <span>{survey.villageDistrict || 'Village'}</span>
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center gap-2 font-medium">
                    <Calendar size={12} className="text-slate-400" />
                    <span>{survey.dateOfDataCollection || survey.submittedAt?.split('T')[0]}</span>
                    <span>•</span>
                    <span>Surveyor: {survey.nameOfDataCollector}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <button
                onClick={() => setSelectedSurvey(survey)}
                className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <Download size={14} />
                <span>View & Export Report</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
