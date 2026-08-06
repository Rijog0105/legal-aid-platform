import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  FileText,
  PieChart,
  Building2,
  Eye,
  Plus,
  ShieldAlert,
  Scale
} from 'lucide-react';
import type { SurveyResponseData } from '@/types/survey';
import { surveyService } from '@/services/surveyService';
import { reportCalculationService } from '@/services/reportCalculationService';
import { IndividualSurveyReport } from './IndividualSurveyReport';
import { ConsolidatedSurveyReport } from './ConsolidatedSurveyReport';
import { LegalAidCampReport } from './LegalAidCampReport';
import { SurveyEngine } from '@/features/survey/components/SurveyEngine';
import { useAuth } from '@/features/auth/hooks/useAuth';

export const FacultySurveyDashboard: React.FC = () => {
  const { roleName } = useAuth();
  const [surveys, setSurveys] = useState<SurveyResponseData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterDispute, setFilterDispute] = useState<string>('all');
  const [filterVillage, setFilterVillage] = useState<string>('all');

  const [viewMode, setViewMode] = useState<'dashboard' | 'individual' | 'consolidated' | 'camp_report' | 'conduct_survey'>('dashboard');
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyResponseData | null>(null);

  const loadSurveys = async () => {
    setLoading(true);
    const data = await surveyService.fetchAllSurveys();
    setSurveys(data);
    setLoading(false);
  };

  useEffect(() => {
    loadSurveys();
  }, []);

  const villages = useMemo(() => {
    const set = new Set<string>();
    surveys.forEach((s) => {
      if (s.villageDistrict) set.add(s.villageDistrict);
    });
    return Array.from(set);
  }, [surveys]);

  const filteredSurveys = useMemo(() => {
    return surveys.filter((s) => {
      const matchSearch =
        !searchQuery ||
        (s.nameOfDataCollector && s.nameOfDataCollector.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.surveyReferenceId && s.surveyReferenceId.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.villageDistrict && s.villageDistrict.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.addressOfFamily && s.addressOfFamily.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchDispute =
        filterDispute === 'all' ||
        (filterDispute === 'yes' && s.q7PendingLitigation === 'Yes') ||
        (filterDispute === 'no' && s.q7PendingLitigation !== 'Yes');

      const matchVillage = filterVillage === 'all' || s.villageDistrict === filterVillage;

      return matchSearch && matchDispute && matchVillage;
    });
  }, [surveys, searchQuery, filterDispute, filterVillage]);

  const stats = useMemo(() => {
    return reportCalculationService.calculateConsolidatedStats(surveys);
  }, [surveys]);

  const handleViewIndividual = (survey: SurveyResponseData) => {
    setSelectedSurvey(survey);
    setViewMode('individual');
  };

  if (viewMode === 'individual' && selectedSurvey) {
    return <IndividualSurveyReport survey={selectedSurvey} onBack={() => setViewMode('dashboard')} />;
  }

  if (viewMode === 'consolidated') {
    return <ConsolidatedSurveyReport surveys={surveys} onBack={() => setViewMode('dashboard')} />;
  }

  if (viewMode === 'camp_report') {
    return <LegalAidCampReport surveys={surveys} onBack={() => setViewMode('dashboard')} />;
  }

  if (viewMode === 'conduct_survey') {
    return (
      <SurveyEngine
        onComplete={() => {
          loadSurveys();
          setViewMode('dashboard');
        }}
        onCancel={() => setViewMode('dashboard')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-indigo-600" />
                Faculty Review & Report Portal
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-2">
              Legal Aid Data Collection & Automatic Report Engine
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Review data collection sheets, track pending litigation, and generate institutional reports.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {roleName === 'volunteer' && (
              <button
                onClick={() => setViewMode('conduct_survey')}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                Start New Survey
              </button>
            )}

            <button
              onClick={() => setViewMode('consolidated')}
              className="px-4 py-2.5 bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
            >
              <PieChart className="w-4 h-4 text-indigo-400" />
              Consolidated Report
            </button>

            <button
              onClick={() => setViewMode('camp_report')}
              className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-600/25 transition-all"
            >
              <Building2 className="w-4 h-4" />
              Master Camp Report
            </button>
          </div>
        </div>

        {/* Aggregate Stats Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Total Surveys Collected</span>
            <span className="text-3xl font-black text-slate-900 dark:text-white mt-1 block">{stats.totalSurveys}</span>
            <span className="text-[11px] text-emerald-600 font-medium mt-1 block">Verified submissions</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Population Impacted</span>
            <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-1 block">{stats.totalPopulationCovered}</span>
            <span className="text-[11px] text-slate-400 block mt-1">Including household dependents</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Pending Court Litigations</span>
            <span className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-1 block">
              {stats.pendingLitigationCount}
            </span>
            <span className="text-[11px] text-amber-700 dark:text-amber-300 font-medium block mt-1">Court Cases Pending (Q7)</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Free Legal Aid Eligibility Claims</span>
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
              {stats.freeLegalAidCategoryCounts.reduce((acc, curr) => acc + curr.count, 0)}
            </span>
            <span className="text-[11px] text-slate-400 block mt-1">Section 12 Categories Claimed (Q5)</span>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search surveyor, village, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Filter className="w-3.5 h-3.5" />
              Filter:
            </div>
            <select
              value={filterDispute}
              onChange={(e) => setFilterDispute(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
            >
              <option value="all">All Litigations</option>
              <option value="yes">Pending Litigation Only</option>
              <option value="no">No Litigation</option>
            </select>

            <select
              value={filterVillage}
              onChange={(e) => setFilterVillage(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
            >
              <option value="all">All Villages</option>
              {villages.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Survey Responses List / Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-500" />
              Completed Data Collection Sheets ({filteredSurveys.length})
            </h3>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading survey records...</div>
          ) : filteredSurveys.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <FileText className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No surveys match the criteria.</p>
              <p className="text-xs text-slate-400">Try adjusting your search query or filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-4">Ref ID</th>
                    <th className="p-4">Data Collector</th>
                    <th className="p-4">Village / District</th>
                    <th className="p-4">Main Occupation</th>
                    <th className="p-4">Litigation Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredSurveys.map((survey) => (
                    <tr key={survey.surveyReferenceId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {survey.surveyReferenceId}
                      </td>
                      <td className="p-4 font-semibold text-slate-900 dark:text-white">
                        {survey.nameOfDataCollector || 'Surveyor'}
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">
                        {survey.villageDistrict || 'N/A'}
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">
                        {survey.q2MainOccupation || 'N/A'}
                      </td>
                      <td className="p-4">
                        {survey.q7PendingLitigation === 'Yes' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                            <ShieldAlert className="w-3 h-3 text-amber-500" />
                            Litigation Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                            No Litigation
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleViewIndividual(survey)}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/80 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-semibold rounded-xl text-xs inline-flex items-center gap-1 transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Individual Sheet
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
