import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  Calendar,
  MapPin,
  Clock,
  X,
  AlertCircle,
  FileText,
  CheckCircle,
  ClipboardList,
  Layers,
  Users,
  DollarSign,
  Camera,
  Trash2,
  Eye,
  PieChart as PieChartIcon,
  Search,
  Filter,
  ShieldAlert,
  TrendingUp,
  FileCheck,
  ShieldCheck,
  Building2,
  Download
} from 'lucide-react';
import { Button, Card, ProjectStatusBadge, Spinner } from '@/components/ui';
import { ROLES, ROUTES } from '@/constants';
import { useProject } from '@/features/projects/hooks/useProject';
import { deleteProject } from '@/features/projects/services/projectService';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ProjectForm } from './ProjectForm';
import { ProjectPeopleTab } from './ProjectPeopleTab';
import { ActivitiesTab } from '@/features/activities';
import { PhotosTab } from '@/features/volunteer';
import { ReportPreparationTab } from './ReportPreparationTab';
import { BudgetTab } from '@/features/budget';
import { SurveySchedule } from './SurveySchedule';
import { CampSchedule } from './CampSchedule';
import { ProjectOverviewCard } from './ProjectOverviewCard';
import { AttendanceTab } from '@/features/attendance/components/AttendanceTab';
import { surveyService } from '@/services/surveyService';
import { reportCalculationService } from '@/services/reportCalculationService';
import { IndividualSurveyReport } from '@/features/reports/components/IndividualSurveyReport';
import { ConsolidatedSurveyReport } from '@/features/reports/components/ConsolidatedSurveyReport';
import { getProjectLifecycleState, PHASE_STATE_LABELS, deriveProjectStatus } from '@/utils/projectLifecycle';
import type { SurveyResponseData } from '@/types/survey';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';

const CHART_COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b'];


/* ─── Navigation Tab Types ──────────────────────────────── */

type MainTab = 'overview' | 'survey' | 'camp' | 'report';
type SurveySubTab = 'dashboard' | 'schedule' | 'people' | 'attendance' | 'forms' | 'budget';
type CampSubTab = 'activities' | 'photos' | 'budget' | 'schedule' | 'people' | 'attendance';

const SURVEY_SUB_TABS = [
  { key: 'schedule', label: 'Schedule Survey', icon: <Calendar size={20} /> },
  { key: 'people', label: 'Assign People', icon: <Users size={20} /> },
  { key: 'attendance', label: 'Attendance', icon: <CheckCircle size={20} /> },
  { key: 'budget', label: 'Survey Budget', icon: <DollarSign size={20} /> },
  { key: 'forms', label: 'Survey Forms', icon: <FileText size={20} /> },
  { key: 'dashboard', label: 'Survey Dashboard', icon: <ClipboardList size={20} /> },
] as const;

const CAMP_SUB_TABS = [
  { key: 'schedule', label: 'Schedule Camp', icon: <Calendar size={20} /> },
  { key: 'people', label: 'Assign People', icon: <Users size={20} /> },
  { key: 'activities', label: 'Activities', icon: <Layers size={20} /> },
  { key: 'attendance', label: 'Attendance', icon: <CheckCircle size={20} /> },
  { key: 'budget', label: 'Camp Budget', icon: <DollarSign size={20} /> },
  { key: 'photos', label: 'Documentation Photos', icon: <Camera size={20} /> },
] as const;

/* ─── Component ─────────────────────────────────────────── */

export interface ProjectDetailPageProps {
  projectId?: string;
  initialMainTab?: MainTab;
  initialSurveySubTab?: SurveySubTab;
  isTeamLeadView?: boolean;
}

export function ProjectDetailPage({
  projectId: propProjectId,
  initialMainTab,
  initialSurveySubTab,
  isTeamLeadView,
}: ProjectDetailPageProps = {}) {
  const params = useParams<{ projectId: string }>();
  const projectId = propProjectId || params.projectId;
  const navigate = useNavigate();
  const { hasRole, roleName } = useAuth();
  const { project, isLoading, error, setProject, reload } = useProject(projectId);

  const isTeamLead = isTeamLeadView || roleName === ROLES.TEAM_LEAD;
  const canEdit = !isTeamLead && hasRole([ROLES.FACULTY, ROLES.ADMIN]);

  /* ── Persistent navigation state via localStorage ── */
  const storageKeyMain = `project_detail_${projectId}_active_main_tab`;
  const storageKeySurvey = `project_detail_${projectId}_active_survey_sub_tab`;
  const storageKeyCamp = `project_detail_${projectId}_active_camp_sub_tab`;

  const [activeMainTab, setActiveMainTab] = useState<MainTab>(
    () => initialMainTab || (localStorage.getItem(storageKeyMain) as MainTab) || 'overview'
  );
  const [activeSurveySubTab, setActiveSurveySubTab] = useState<SurveySubTab>(
    () => initialSurveySubTab || (localStorage.getItem(storageKeySurvey) as SurveySubTab) || 'dashboard'
  );
  const [activeCampSubTab, setActiveCampSubTab] = useState<CampSubTab>(
    () => (localStorage.getItem(storageKeyCamp) as CampSubTab) || 'activities'
  );

  useEffect(() => {
    if (initialMainTab) {
      setActiveMainTab(initialMainTab);
    }
  }, [initialMainTab]);

  useEffect(() => {
    if (initialSurveySubTab) {
      setActiveSurveySubTab(initialSurveySubTab);
    }
  }, [initialSurveySubTab]);

  /* ── Survey Phase Specific States ── */
  const [surveyList, setSurveyList] = useState<SurveyResponseData[]>([]);
  const [loadingSurveys, setLoadingSurveys] = useState(false);
  const [loadingSurveyDetails, setLoadingSurveyDetails] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyResponseData | null>(null);
  const [surveyViewMode, setSurveyViewMode] = useState<'list' | 'individual'>('list');

  const visibleSubTabs = isTeamLead
    ? SURVEY_SUB_TABS.filter((tab) => tab.key === 'dashboard' || tab.key === 'forms')
    : SURVEY_SUB_TABS;
  const [downloadingReport, setDownloadingReport] = useState(false);
  const consolidatedPrintRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [quickFilter, setQuickFilter] = useState<'all' | 'attention' | 'legal' | 'docs' | 'amenities'>('all');

  const toggleCustomFilter = (key: string) => {
    setActiveFilters((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -75;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const viewAffectedSurveys = (filterKeys: string[]) => {
    setActiveSurveySubTab('forms');
    setSurveyViewMode('list');
    setActiveFilters(filterKeys);
    setQuickFilter('all');
  };

  const handleDownloadConsolidatedReport = async () => {
    if (!project || !consolidatedPrintRef.current) return;
    
    const buttons = Array.from(consolidatedPrintRef.current.querySelectorAll('button'));
    const downloadBtn = buttons.find(b => 
      b.textContent?.includes('Download') || 
      b.textContent?.includes('Generating')
    );

    if (downloadBtn) {
      setDownloadingReport(true);
      downloadBtn.click();
      setTimeout(() => {
        setDownloadingReport(false);
      }, 5000);
      return;
    }

    // Fallback if button is not found
    window.print();
  };

  useEffect(() => {
    async function fetchProjectSurveys() {
      if (!projectId) return;
      setLoadingSurveys(true);
      try {
        const data = await surveyService.fetchAllSurveys(projectId);
        setSurveyList(data);
      } catch (err) {
        console.error('Error fetching project surveys:', err);
      } finally {
        setLoadingSurveys(false);
      }
    }
    if (activeMainTab === 'survey') {
      fetchProjectSurveys();
    }
  }, [projectId, activeMainTab]);

  const matchesFilter = (s: SurveyResponseData, filter: string): boolean => {
    switch (filter) {
      case 'litigation': return s.q7PendingLitigation === 'Yes';
      case 'no_litigation': return s.q7PendingLitigation !== 'Yes';
      case 'free_legal_aid': return Array.isArray(s.q5FreeLegalAidCategory) && s.q5FreeLegalAidCategory.length > 0;
      case 'other_legal_problem': return !!(s.q21OtherLegalProblems && s.q21OtherLegalProblems.trim());

      case 'missing_ration_card': return !s.doc1RationCard || s.doc1RationCard.hasDocument !== 'Yes';
      case 'missing_aadhar': return !s.doc2AadharCard || s.doc2AadharCard.hasDocument !== 'Yes';
      case 'missing_birth_cert': return !s.doc3BirthCertificate || s.doc3BirthCertificate.hasDocument !== 'Yes';
      case 'missing_death_cert': return !s.doc4DeathCertificate || s.doc4DeathCertificate.hasDocument !== 'Yes';
      case 'missing_old_age_pension': return !s.doc5OldAgePension || s.doc5OldAgePension.hasDocument !== 'Yes';
      case 'missing_widow_pension': return !s.doc6WidowPension || s.doc6WidowPension.hasDocument !== 'Yes';
      case 'missing_udid': return !s.doc7UdidDisabilityCard || s.doc7UdidDisabilityCard.hasDocument !== 'Yes';
      case 'missing_ayushman': return !s.doc8AyushmanHealthCard || s.doc8AyushmanHealthCard.hasDocument !== 'Yes';

      case 'water_problem': return s.q19aWater !== 'Yes';
      case 'electricity_problem': return s.q19bElectricity !== 'Yes';
      case 'roads_problem': return s.q19cRoadsPathways !== 'Yes';
      case 'health_problem': return s.q19dHealthFacilities !== 'Yes';

      case 'transgender': return s.q12TransgenderInFamily === 'Yes';
      case 'child_marriage': return s.q13VictimOfChildMarriage === 'Yes';
      case 'hiv': return s.q14AffectedHivIncurableDisease === 'Yes';
      case 'child_labour': return s.q15VictimOfChildLabour === 'Yes';
      case 'bonded_labour': return s.q16VictimOfBondedLabour === 'Yes';
      case 'devadasi': return s.q17VictimOfDevadasiSystem === 'Yes';
      case 'disability': return s.q18MentalOrIntellectualDisability === 'Yes';

      case 'unemployment': return s.q11NatureOfEmployment === 'Unemployed';
      case 'education_issue': return s.q10DiscontinuedEducation === 'Yes';
      case 'property_issue': return s.q20aLandProperties !== 'Yes' || s.q20bHouseProperty !== 'Yes';
      case 'vehicle_issue': return s.q6HasVehicle === 'Yes' && (s.q6aDrivingLicense !== 'Yes' || s.q6bInsuranceCoverage !== 'Yes' || s.q6cRegistrationCertificate !== 'Yes');
      case 'other_issue': return !!(s.q11UnemployedReason || s.q10DiscontinuedReason);

      default: return true;
    }
  };

  const matchesQuickFilter = (s: SurveyResponseData, filter: typeof quickFilter): boolean => {
    if (filter === 'all') return true;
    if (filter === 'attention') {
      const missingDoc = [s.doc1RationCard, s.doc2AadharCard, s.doc3BirthCertificate, s.doc4DeathCertificate, s.doc5OldAgePension, s.doc6WidowPension, s.doc7UdidDisabilityCard, s.doc8AyushmanHealthCard].some(doc => !doc || doc.hasDocument !== 'Yes');
      const amenityIssue = s.q19aWater !== 'Yes' || s.q19bElectricity !== 'Yes' || s.q19cRoadsPathways !== 'Yes' || s.q19dHealthFacilities !== 'Yes';
      const vulnerable = s.q12TransgenderInFamily === 'Yes' || s.q13VictimOfChildMarriage === 'Yes' || s.q14AffectedHivIncurableDisease === 'Yes' || s.q15VictimOfChildLabour === 'Yes' || s.q16VictimOfBondedLabour === 'Yes' || s.q17VictimOfDevadasiSystem === 'Yes' || s.q18MentalOrIntellectualDisability === 'Yes';
      return s.q7PendingLitigation === 'Yes' || missingDoc || amenityIssue || vulnerable || !!(s.q21OtherLegalProblems && s.q21OtherLegalProblems.trim());
    }
    if (filter === 'legal') {
      return s.q7PendingLitigation === 'Yes' || !!(s.q21OtherLegalProblems && s.q21OtherLegalProblems.trim());
    }
    if (filter === 'docs') {
      return [s.doc1RationCard, s.doc2AadharCard, s.doc3BirthCertificate, s.doc4DeathCertificate, s.doc5OldAgePension, s.doc6WidowPension, s.doc7UdidDisabilityCard, s.doc8AyushmanHealthCard].some(doc => !doc || doc.hasDocument !== 'Yes');
    }
    if (filter === 'amenities') {
      return s.q19aWater !== 'Yes' || s.q19bElectricity !== 'Yes' || s.q19cRoadsPathways !== 'Yes' || s.q19dHealthFacilities !== 'Yes';
    }
    return true;
  };

  const filteredSurveys = useMemo(() => {
    return surveyList.filter((s) => {
      const matchSearch =
        !searchQuery ||
        (s.nameOfDataCollector && s.nameOfDataCollector.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.surveyReferenceId && s.surveyReferenceId.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.id && s.id.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.addressOfFamily && s.addressOfFamily.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchQuick = matchesQuickFilter(s, quickFilter);
      const matchCustomFilters = activeFilters.every((filter) => matchesFilter(s, filter));

      return matchSearch && matchQuick && matchCustomFilters;
    });
  }, [surveyList, searchQuery, quickFilter, activeFilters]);

  const surveyStats = useMemo(() => {
    return reportCalculationService.calculateConsolidatedStats(surveyList);
  }, [surveyList]);

  const handleViewIndividual = async (survey: SurveyResponseData) => {
    const surveyId = survey.id || survey.surveyReferenceId;
    if (!surveyId) return;

    setLoadingSurveyDetails(true);
    try {
      const hydrated = await surveyService.fetchCompleteSurvey(surveyId);
      if (hydrated) {
        setSelectedSurvey(hydrated);
      } else {
        setSelectedSurvey(survey);
      }
      setSurveyViewMode('individual');
    } catch (err) {
      console.error('Error loading survey details:', err);
      setSelectedSurvey(survey);
      setSurveyViewMode('individual');
    } finally {
      setLoadingSurveyDetails(false);
    }
  };

  /* ── UI state ── */
  const [showEdit, setShowEdit] = useState(false);

  /* ── Delete Dialog state ── */
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  /* ── Navigation handlers ── */
  const handleMainTabChange = (tab: MainTab) => {
    setActiveMainTab(tab);
    localStorage.setItem(storageKeyMain, tab);
  };

  const handleSurveySubTabChange = (tab: SurveySubTab) => {
    setActiveSurveySubTab(tab);
    localStorage.setItem(storageKeySurvey, tab);
  };

  const handleCampSubTabChange = (tab: CampSubTab) => {
    setActiveCampSubTab(tab);
    localStorage.setItem(storageKeyCamp, tab);
  };

  const navigateToSurveySchedule = () => {
    handleMainTabChange('survey');
    handleSurveySubTabChange('schedule');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToCampSchedule = () => {
    handleMainTabChange('camp');
    handleCampSubTabChange('schedule');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToAttendance = (phase: 'survey' | 'camp') => {
    handleMainTabChange(phase);
    if (phase === 'survey') {
      handleSurveySubTabChange('attendance');
    } else {
      handleCampSubTabChange('attendance');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  /* ── Delete Project ── */
  const isDeleteConfirmed = project
    ? deleteConfirmName.trim().toLowerCase() === project.camp_name.trim().toLowerCase()
    : false;

  const handleDeleteProject = async () => {
    if (!project || !isDeleteConfirmed) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteProject(project.id);
      // Clean up local storage keys for this project
      localStorage.removeItem(storageKeyMain);
      localStorage.removeItem(storageKeySurvey);
      localStorage.removeItem(storageKeyCamp);
      // Navigate to list, passing deletion success state
      navigate(ROUTES.PROJECTS, {
        state: { deletedProjectName: project.camp_name },
      });
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Failed to delete project. Please try again.');
      setIsDeleting(false);
    }
  };

  const handleCloseDeleteDialog = () => {
    if (isDeleting) return;
    setShowDeleteDialog(false);
    setDeleteConfirmName('');
    setDeleteError(null);
  };

  /* ── Loading / Error states ── */
  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
        <AlertCircle size={16} className="flex-shrink-0" />
        {error ?? 'Project not found'}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-6 lg:px-8">
      {/* ─── Back Link ─── */}
      <Link
        to={isTeamLead ? ROUTES.TEAM_LEAD_WORKSPACE : ROUTES.PROJECTS}
        className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-700 transition-colors"
      >
        <ArrowLeft size={15} /> {isTeamLead ? 'Back to Team Lead Workspace' : 'Back to Projects'}
      </Link>

      {/* ─── Project Header ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{project.camp_name}</h1>
            <ProjectStatusBadge status={deriveProjectStatus(project)} />
            {(() => {
              const lc = getProjectLifecycleState(project);
              const colorMap: Record<string, string> = {
                survey_active: 'bg-blue-100 text-blue-800 border-blue-200',
                camp_active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                between_phases: 'bg-amber-100 text-amber-800 border-amber-200',
                completed: 'bg-surface-100 text-surface-500 border-surface-200',
                survey_scheduled: 'bg-indigo-50 text-indigo-700 border-indigo-100',
                camp_scheduled: 'bg-indigo-50 text-indigo-700 border-indigo-100',
                draft: 'bg-surface-100 text-surface-400 border-surface-200',
              };
              const colorClass = colorMap[lc.state] ?? 'bg-surface-100 text-surface-500 border-surface-200';
              return (
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${colorClass}`}>
                  {PHASE_STATE_LABELS[lc.state]}
                </span>
              );
            })()}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1">
              <Calendar size={13} className="text-slate-400" /> {project.camp_date}
            </span>
            {(project.start_time || project.end_time) && (
              <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1">
                <Clock size={13} className="text-slate-400" />
                {project.start_time ?? '—'} – {project.end_time ?? '—'}
              </span>
            )}
            <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1">
              <MapPin size={13} className="text-slate-400" />
              {project.village_name}, {project.taluk}, {project.district}
            </span>
          </div>
        </div>

        {/* Header Actions */}
        {canEdit && (
          <div className="flex items-center gap-2.5 flex-wrap md:self-center">
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Pencil size={13} />}
              onClick={() => setShowEdit(true)}
              className="border-slate-200 hover:bg-slate-50 font-bold rounded-xl"
            >
              Edit Details
            </Button>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Trash2 size={13} />}
              onClick={() => setShowDeleteDialog(true)}
              className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-300 font-bold rounded-xl"
            >
              Delete Project
            </Button>
          </div>
        )}
      </div>

      {/* ─── Segmented Workspace Switcher ─── */}
      {!isTeamLead && (
        <div className="w-full flex gap-1.5 bg-surface-100 p-1.5 rounded-2xl border border-surface-200 shadow-sm">
          {(
            [
              { key: 'overview', label: 'Overview' },
              { key: 'survey', label: 'Survey Phase' },
              { key: 'camp', label: 'Camp Phase' },
              { key: 'report', label: 'Final Report' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleMainTabChange(tab.key)}
              className={`flex-1 text-center py-3 rounded-xl text-xs font-bold cursor-pointer transition-all duration-200 ease-out ${
                activeMainTab === tab.key
                  ? 'bg-white text-surface-900 shadow-md border border-surface-200'
                  : 'text-surface-500 hover:text-surface-800 hover:bg-white hover:shadow-sm hover:-translate-y-px'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* ─── Tab Content ─── */}

      {/* 1. OVERVIEW — Executive Dashboard (read-only) */}
      {activeMainTab === 'overview' && (
        <ProjectOverviewCard
          project={project}
          onNavigateToSurveySchedule={navigateToSurveySchedule}
          onNavigateToCampSchedule={navigateToCampSchedule}
          onNavigateToAttendance={navigateToAttendance}
        />
      )}

      {/* 2. SURVEY PHASE */}
      {activeMainTab === 'survey' && (
        <div className="space-y-6">
          {/* Sub-navigation */}
          <div className={`grid gap-4 ${isTeamLead ? 'grid-cols-2 max-w-md mx-auto w-full' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-6'}`}>
            {visibleSubTabs.map((tab) => {
              const label = isTeamLead && tab.key === 'forms' ? 'Survey Reports' : tab.label;
              return (
                <button
                  key={tab.key}
                  onClick={() => handleSurveySubTabChange(tab.key)}
                  className={`p-4 rounded-2xl border text-center transition-all duration-200 ease-out flex flex-col items-center justify-center gap-2.5 cursor-pointer h-24 shadow-xs ${
                    activeSurveySubTab === tab.key
                      ? 'bg-primary-50 border-primary-300 text-primary-900 shadow-md font-bold scale-[1.01] -translate-y-0.5'
                      : 'bg-white border-surface-200 text-surface-600 hover:bg-surface-50 hover:border-surface-300 hover:shadow-md hover:-translate-y-px hover:scale-[1.005]'
                  }`}
                >
                  {tab.icon}
                  <span className="text-[11px] leading-tight font-bold">{label}</span>
                </button>
              );
            })}
          </div>

          {/* Sub-tab content */}
          {activeSurveySubTab === 'dashboard' && (
            <div className="space-y-6">
              {loadingSurveys ? (
                <div className="p-12 flex flex-col items-center justify-center bg-white rounded-3xl border border-surface-200 shadow-sm">
                  <Spinner size="lg" />
                  <span className="text-xs font-semibold text-slate-500 mt-2">Loading survey analytics...</span>
                </div>
              ) : surveyList.length === 0 ? (
                <Card className="p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                    <ClipboardList size={24} />
                  </div>
                  <h3 className="text-base font-bold text-surface-900">No Analytics Data</h3>
                  <p className="text-xs text-surface-500 max-w-md mx-auto leading-relaxed">
                    No survey responses have been submitted for this camp yet. Complete and submit survey forms to view metrics.
                  </p>
                </Card>
              ) : (
                <div className="space-y-8">
                  {/* Action Header */}
                  <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-surface-200 shadow-sm">
                    <div>
                      <h3 className="text-base font-bold text-surface-900">Survey Analytics Dashboard</h3>
                      <p className="text-xs text-surface-500 mt-0.5">Aggregated reports and demographic summaries from live submissions.</p>
                    </div>
                    <Button
                      size="sm"
                      leftIcon={<Download size={14} />}
                      onClick={handleDownloadConsolidatedReport}
                      isLoading={downloadingReport}
                    >
                      {downloadingReport ? 'Generating Report...' : 'Download Consolidated Report'}
                    </Button>
                  </div>

                  {/* Sticky Section Navigation */}
                  <div className="sticky top-0 bg-slate-50/90 backdrop-blur-md p-3 border border-surface-200 rounded-2xl -mx-2 px-4 z-10 flex flex-wrap gap-2 overflow-x-auto print:hidden shadow-sm">
                    {[
                      { id: 'overview', label: 'Executive Overview' },
                      { id: 'demographics', label: 'Demographics' },
                      { id: 'socio-economic', label: 'Socio-Economic' },
                      { id: 'legal', label: 'Legal Needs' },
                      { id: 'documents', label: 'Documents' },
                      { id: 'amenities', label: 'Amenities' },
                      { id: 'vulnerability', label: 'Vulnerability' },
                      { id: 'priority-cases', label: 'Priority Cases' }
                    ].map(sec => (
                      <button
                        key={sec.id}
                        onClick={() => scrollToSection(sec.id)}
                        className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-[10px] font-bold text-slate-700 transition-all shadow-xs cursor-pointer hover:border-slate-300 active:scale-95"
                      >
                        {sec.label}
                      </button>
                    ))}
                  </div>

                  {/* ────────────────────────────────────────────────── */}
                  {/* A. EXECUTIVE OVERVIEW */}
                  {/* ────────────────────────────────────────────────── */}
                  <div id="overview" className="space-y-8 pt-4">
                    <div className="border-l-4 border-indigo-600 pl-4 mb-2">
                      <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Executive Overview</h3>
                      <p className="text-xs text-slate-500">Key metrics summary and prioritized alerts.</p>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                      {/* KPI 1 */}
                      <div className="bg-white p-6 rounded-3xl border border-surface-200 shadow-sm flex items-center gap-5 transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-px hover:scale-[1.005]">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                          <Users className="w-7 h-7" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-surface-500 uppercase tracking-wider block mb-1">Total Surveys</span>
                          <span className="text-4xl font-black text-slate-900 leading-none">{surveyStats.totalSurveys}</span>
                          <span className="text-[10px] text-emerald-600 font-bold block mt-1.5">Submissions</span>
                        </div>
                      </div>

                      {/* KPI 2 */}
                      <div className="bg-white p-6 rounded-3xl border border-surface-200 shadow-sm flex items-center gap-5 transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-px hover:scale-[1.005]">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-7 h-7" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-surface-500 uppercase tracking-wider block mb-1">Total Households</span>
                          <span className="text-4xl font-black text-slate-900 leading-none">{surveyStats.totalSurveys}</span>
                          <span className="text-[10px] text-slate-400 font-bold block mt-1.5">Unique families</span>
                        </div>
                      </div>

                      {/* KPI 3 */}
                      <div className="bg-white p-6 rounded-3xl border border-surface-200 shadow-sm flex items-center gap-5 transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-px hover:scale-[1.005]">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                          <TrendingUp className="w-7 h-7" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-surface-500 uppercase tracking-wider block mb-1">Recorded Family Members</span>
                          <span className="text-4xl font-black text-emerald-700 leading-none">{surveyStats.recordedFamilyMembers}</span>
                          <span className="text-[10px] text-slate-400 font-bold block mt-1.5">Excludes household heads</span>
                        </div>
                      </div>

                      {/* KPI 4 */}
                      <div className="bg-white p-6 rounded-3xl border border-surface-200 shadow-sm flex items-center gap-5 transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-px hover:scale-[1.005]">
                        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                          <FileCheck className="w-7 h-7" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-surface-500 uppercase tracking-wider block mb-1">Pending Litigations</span>
                          <span className="text-4xl font-black text-amber-700 leading-none">{surveyStats.pendingLitigationCount}</span>
                          <span className="text-[10px] text-amber-600 font-bold block mt-1.5">Court cases (Q7)</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                      {/* KPI 5 */}
                      <div className="bg-white p-6 rounded-3xl border border-surface-200 shadow-sm flex items-center gap-5 transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-px hover:scale-[1.005]">
                        <div className="w-14 h-14 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center flex-shrink-0">
                          <ShieldCheck className="w-7 h-7" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-surface-500 uppercase tracking-wider block mb-1">Free Legal Aid</span>
                          <span className="text-4xl font-black text-cyan-700 leading-none">
                            {surveyStats.freeLegalAidCategoryCounts.reduce((acc, curr) => acc + curr.count, 0)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold block mt-1.5">Eligible claimants</span>
                        </div>
                      </div>

                      {/* KPI 6 */}
                      <div className="bg-white p-6 rounded-3xl border border-surface-200 shadow-sm flex items-center gap-5 transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-px hover:scale-[1.005]">
                        <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
                          <AlertCircle className="w-7 h-7" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-surface-500 uppercase tracking-wider block mb-1">Missing Docs</span>
                          <span className="text-4xl font-black text-red-700 leading-none">{surveyStats.householdsWithMissingDocs}</span>
                          <span className="text-[10px] text-red-500 font-bold block mt-1.5">Need documentation</span>
                        </div>
                      </div>

                      {/* KPI 7 */}
                      <div className="bg-white p-6 rounded-3xl border border-surface-200 shadow-sm flex items-center gap-5 transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-px hover:scale-[1.005]">
                        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
                          <Layers className="w-7 h-7" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-surface-500 uppercase tracking-wider block mb-1">Amenity Problems</span>
                          <span className="text-4xl font-black text-rose-700 leading-none">{surveyStats.householdsWithAmenityIssues}</span>
                          <span className="text-[10px] text-rose-500 font-bold block mt-1.5">Deficient amenities</span>
                        </div>
                      </div>

                      {/* KPI 8 */}
                      <div className="bg-white p-6 rounded-3xl border border-surface-200 shadow-sm flex items-center gap-5 transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-px hover:scale-[1.005]">
                        <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">
                          <ShieldAlert className="w-7 h-7" />
                        </div>
                        <div className="flex gap-5">
                          <div>
                            <span className="text-xs font-bold text-surface-500 uppercase tracking-wider block mb-1">Vulnerable HHs</span>
                            <span className="text-4xl font-black text-orange-700 leading-none">{surveyStats.vulnerableHouseholds}</span>
                            <span className="text-[10px] text-orange-500 font-bold block mt-1.5">Households</span>
                          </div>
                          <div className="border-l border-slate-200 pl-5">
                            <span className="text-xs font-bold text-surface-500 uppercase tracking-wider block mb-1">Vulnerability Cases</span>
                            <span className="text-4xl font-black text-orange-700 leading-none">{surveyStats.vulnerableCases}</span>
                            <span className="text-[10px] text-orange-500 font-bold block mt-1.5">Affirmative cases</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ────────────────────────────────────────────────── */}
                  {/* B. DEMOGRAPHICS */}
                  {/* ────────────────────────────────────────────────── */}
                  <div id="demographics" className="space-y-6 pt-8 border-t border-slate-200">
                    <div className="border-l-4 border-indigo-600 pl-4 mb-2">
                      <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Demographics Breakdown</h3>
                      <p className="text-xs text-slate-500">Gender distribution, age demographics, and family metrics.</p>
                    </div>

                    <div className="flex flex-col gap-6">
                      {/* Gender Donut Chart */}
                      <div className="bg-white p-6 rounded-3xl border border-surface-200 shadow-sm transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-px">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-surface-500 mb-4 flex items-center gap-1.5">
                          <PieChartIcon className="w-4 h-4 text-indigo-600" />
                          Gender Distribution (All family members)
                        </h4>
                        <div className="h-80 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={surveyStats.genderDistribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={4}
                                dataKey="count"
                                nameKey="category"
                                label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                              >
                                {surveyStats.genderDistribution.map((_, index) => (
                                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Age Groups Bar Chart */}
                      <div className="bg-white p-6 rounded-3xl border border-surface-200 shadow-sm transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-px">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-surface-500 mb-4 flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-indigo-600" />
                          Age Distribution (Roster family members)
                        </h4>
                        <div className="h-80 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={surveyStats.ageDistribution}>
                              <XAxis dataKey="range" tick={{ fontSize: 11 }} interval={0} />
                              <YAxis tick={{ fontSize: 11 }} />
                              <Tooltip />
                              <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    {/* Roster Demographics Statistics cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 text-center transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-px">
                        <span className="text-slate-400 text-[10px] font-bold uppercase block">Avg Household Size</span>
                        <span className="text-3xl font-black text-slate-900 mt-2 block">{surveyStats.averageHouseholdSize}</span>
                        <span className="text-[10px] text-slate-400 block mt-1">Persons per family</span>
                      </div>
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 text-center transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-px">
                        <span className="text-slate-400 text-[10px] font-bold uppercase block">Children count</span>
                        <span className="text-3xl font-black text-slate-900 mt-2 block">{surveyStats.childrenCount}</span>
                        <span className="text-[10px] text-slate-400 block mt-1">Age below 18</span>
                      </div>
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 text-center transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-px">
                        <span className="text-slate-400 text-[10px] font-bold uppercase block">Elderly count</span>
                        <span className="text-3xl font-black text-slate-900 mt-2 block">{surveyStats.elderlyCount}</span>
                        <span className="text-[10px] text-slate-400 block mt-1">Age 60 and above</span>
                      </div>
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 text-center transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-px">
                        <span className="text-slate-400 text-[10px] font-bold uppercase block">Total dependents</span>
                        <span className="text-3xl font-black text-slate-900 mt-2 block">
                          {surveyList.reduce((acc, curr) => {
                            const match = String(curr.q1TotalEarningAndDependents).match(/dependent[s]?\s*:\s*(\d+)/i) || 
                                          String(curr.q1TotalEarningAndDependents).match(/(\d+)\s*depend/i);
                            return acc + (match ? Number(match[1]) : 0);
                          }, 0) || 'N/A'}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-1">Reported earners/dependents</span>
                      </div>
                    </div>
                  </div>

                  {/* ────────────────────────────────────────────────── */}
                  {/* C. SOCIO-ECONOMIC PROFILE */}
                  {/* ────────────────────────────────────────────────── */}
                  <div id="socio-economic" className="space-y-6 pt-8 border-t border-slate-200">
                    <div className="border-l-4 border-indigo-600 pl-4 mb-2">
                      <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Socio-Economic Profile</h3>
                      <p className="text-xs text-slate-500">Occupations, education levels, and housing arrangements.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left Card: Occupations & Education */}
                      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6 transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-px">
                        {/* Occupations */}
                        <div className="space-y-4">
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 border-b pb-2">Main Occupations (Q2)</h4>
                          <div className="space-y-3">
                            {surveyStats.occupationBreakdown.map((occ, idx) => (
                              <div key={idx} className="text-xs space-y-1.5">
                                <div className="flex justify-between font-semibold">
                                  <span className="text-slate-700">{occ.category}</span>
                                  <span className="text-slate-900">{occ.count} ({occ.percentage}%)</span>
                                </div>
                                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                  <div
                                    className="bg-indigo-600 h-full rounded-full transition-all"
                                    style={{ width: `${occ.percentage}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-slate-100" />

                        {/* Education Levels */}
                        <div className="space-y-4">
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 border-b pb-2">Education Levels (Q9)</h4>
                          <div className="space-y-3">
                            {surveyStats.educationBreakdown.map((edu, idx) => (
                              <div key={idx} className="text-xs space-y-1.5">
                                <div className="flex justify-between font-semibold">
                                  <span className="text-slate-700">{edu.level}</span>
                                  <span className="text-slate-900">{edu.count} ({edu.percentage}%)</span>
                                </div>
                                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                  <div
                                    className="bg-emerald-600 h-full rounded-full transition-all"
                                    style={{ width: `${edu.percentage}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right Card: Housing type & Ownership & Employment Details */}
                      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6 transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-px">
                        {/* Housing type */}
                        <div className="space-y-4">
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 border-b pb-2">House Type Distribution (Q3)</h4>
                          <div className="space-y-3">
                            {surveyStats.houseTypeBreakdown.map((house, idx) => (
                              <div key={idx} className="text-xs space-y-1.5">
                                <div className="flex justify-between font-semibold">
                                  <span className="text-slate-700">{house.category}</span>
                                  <span className="text-slate-900">{house.count} ({house.percentage}%)</span>
                                </div>
                                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                  <div
                                    className="bg-amber-600 h-full rounded-full transition-all"
                                    style={{ width: `${house.percentage}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-slate-100" />

                        {/* House Ownership */}
                        <div className="space-y-4">
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 border-b pb-2">House Ownership Status (Q4)</h4>
                          <div className="space-y-3">
                            {surveyStats.houseOwnershipBreakdown.map((own, idx) => (
                              <div key={idx} className="text-xs space-y-1.5">
                                <div className="flex justify-between font-semibold">
                                  <span className="text-slate-700">{own.category}</span>
                                  <span className="text-slate-900">{own.count} ({own.percentage}%)</span>
                                </div>
                                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                  <div
                                    className="bg-cyan-600 h-full rounded-full transition-all"
                                    style={{ width: `${own.percentage}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-slate-100" />

                        {/* Unemployment Rate Subcard */}
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs flex justify-between items-center transition-all duration-200 hover:bg-slate-100/70">
                          <div>
                            <span className="font-extrabold text-slate-700 block">Unemployed Respondents</span>
                            <span className="text-slate-500 font-semibold block mt-1">
                              {surveyList.filter(s => s.q11NatureOfEmployment === 'Unemployed').length} households availing unemployment benefits
                            </span>
                          </div>
                          <button
                            onClick={() => viewAffectedSurveys(['unemployment'])}
                            className="text-[10px] font-bold text-indigo-655 hover:text-indigo-800 cursor-pointer flex-shrink-0"
                          >
                            View →
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ────────────────────────────────────────────────── */}
                  {/* D. LEGAL NEEDS & ASSISTANCE */}
                  {/* ────────────────────────────────────────────────── */}
                  <div id="legal" className="space-y-6 pt-8 border-t border-slate-200">
                    <div className="border-l-4 border-indigo-600 pl-4 mb-2">
                      <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Legal Needs & Clinic Referrals</h3>
                      <p className="text-xs text-slate-500">Court cases, legal aid claims, and litigation statistics.</p>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6 transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-px">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Section 1: Pending Litigations duration */}
                        <div className="space-y-4">
                          <div className="flex justify-between items-center border-b pb-2.5">
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">Litigation Durations (Q7)</h4>
                            <button
                              onClick={() => viewAffectedSurveys(['litigation'])}
                              className="text-[10px] font-bold text-indigo-655 hover:text-indigo-800 cursor-pointer"
                            >
                              View Active Litigation ({surveyStats.pendingLitigationCount}) →
                            </button>
                          </div>
                          {surveyStats.pendingLitigationCount === 0 ? (
                            <div className="text-xs text-slate-400 text-center py-8 font-semibold">No reported active litigation cases.</div>
                          ) : (
                            <div className="space-y-3">
                              {surveyStats.litigationDurationBreakdown.filter(d => d.category !== 'Unspecified').map((dur, idx) => (
                                <div key={idx} className="text-xs space-y-1.5">
                                  <div className="flex justify-between font-semibold">
                                    <span className="text-slate-700">{dur.category}</span>
                                    <span className="text-slate-900">{dur.count} ({dur.percentage}%)</span>
                                  </div>
                                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                    <div
                                      className="bg-amber-600 h-full rounded-full transition-all"
                                      style={{ width: `${dur.percentage}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Section 2: Free Legal Aid Categories */}
                        <div className="space-y-4">
                          <div className="flex justify-between items-center border-b pb-2.5">
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">Free Legal Aid Eligibility (Q5)</h4>
                            <button
                              onClick={() => viewAffectedSurveys(['free_legal_aid'])}
                              className="text-[10px] font-bold text-indigo-655 hover:text-indigo-800 cursor-pointer"
                            >
                              View All Eligible →
                            </button>
                          </div>
                          <div className="space-y-2">
                            {surveyStats.freeLegalAidCategoryCounts.length === 0 ? (
                              <div className="text-xs text-slate-400 text-center py-8 font-semibold">No claims registered.</div>
                            ) : (
                              surveyStats.freeLegalAidCategoryCounts.map((cat, idx) => (
                                <div key={idx} className="flex justify-between items-center text-xs py-1 border-b border-slate-50 last:border-0">
                                  <span className="font-semibold text-slate-750">{cat.category}</span>
                                  <span className="font-mono bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold px-2 py-0.5 rounded-lg text-[10px]">
                                    {cat.count} families ({cat.percentage}%)
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-slate-100" />

                      {/* Section 3: Other Legal Problems box */}
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs flex justify-between items-center transition-all duration-200 hover:bg-slate-100/70">
                        <div>
                          <span className="font-extrabold text-slate-700 block">Other Reported Legal Conflicts</span>
                          <span className="text-slate-550 font-semibold block mt-1">
                            {surveyStats.otherLegalProblemsCount} families have detailed property boundary disputes, loan recovery issues or local complaints.
                          </span>
                        </div>
                        <button
                          onClick={() => viewAffectedSurveys(['other_legal_problem'])}
                          className="text-[10px] font-bold text-indigo-655 hover:text-indigo-855 cursor-pointer font-extrabold flex-shrink-0"
                        >
                          View Conflict Surveys →
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ────────────────────────────────────────────────── */}
                  {/* E. DOCUMENT & WELFARE COVERAGE */}
                  {/* ────────────────────────────────────────────────── */}
                  <div id="documents" className="space-y-6 pt-8 border-t border-slate-200">
                    <div className="border-l-4 border-indigo-600 pl-4 mb-2">
                      <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Document & Welfare Card Coverage</h3>
                      <p className="text-xs text-slate-555">Government schemes availability matrix and priority gaps.</p>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-surface-200 shadow-sm space-y-4 transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-px">
                      <div className="overflow-x-auto text-xs">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-surface-200 font-bold text-surface-700">
                              <th className="pb-3 px-4">Document / Scheme Card</th>
                              <th className="pb-3 px-4 text-center">Available</th>
                              <th className="pb-3 px-4 text-center">Missing</th>
                              <th className="pb-3 px-4 text-center text-slate-500">N/A</th>
                              <th className="pb-3 px-4 text-center text-slate-400">Not Recorded</th>
                              <th className="pb-3 px-4 text-center">Coverage Rate</th>
                              <th className="pb-3 px-4 text-center">Priority Status</th>
                              <th className="pb-3 px-4 text-right">Records Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-surface-100">
                            {surveyStats.documentAvailabilityMatrix.map((doc, idx) => {
                              const filterMap: Record<string, string> = {
                                'Ration Card': 'missing_ration_card',
                                'Aadhar Card': 'missing_aadhar',
                                'Birth Certificate': 'missing_birth_cert',
                                'Death Certificate': 'missing_death_cert',
                                'Old Age Pension': 'missing_old_age_pension',
                                'Widow Pension': 'missing_widow_pension',
                                'UDID Disability Card': 'missing_udid',
                                'Ayushman Health Card': 'missing_ayushman',
                              };
                              const key = filterMap[doc.name];

                              // Priority status based on missing percentage
                              let priority = 'MEDIUM';
                              let priorityColor = 'bg-amber-50 border-amber-200 text-amber-800';
                              if (doc.percentage < 50) {
                                priority = 'HIGH';
                                priorityColor = 'bg-red-50 border-red-200 text-red-800';
                              } else if (doc.percentage >= 85) {
                                priority = 'LOW';
                                priorityColor = 'bg-slate-50 border-slate-200 text-slate-700';
                              }

                              return (
                                <tr key={idx} className="hover:bg-slate-50/60 font-medium transition-colors">
                                  <td className="py-4 px-4 font-semibold text-surface-900">{doc.name}</td>
                                  <td className="py-4 px-4 text-center text-emerald-600 font-bold">{doc.hasDoc}</td>
                                  <td className="py-4 px-4 text-center text-red-500 font-bold">{doc.missing}</td>
                                  <td className="py-4 px-4 text-center text-slate-500 font-semibold">{doc.notApplicable}</td>
                                  <td className="py-4 px-4 text-center text-slate-400 font-semibold">{doc.notRecorded}</td>
                                  <td className="py-4 px-4 text-center font-black text-indigo-900">{doc.percentage}%</td>
                                  <td className="py-4 px-4 text-center">
                                    <span className={`inline-flex px-2.5 py-0.5 rounded-lg text-[9px] font-black border uppercase ${priorityColor}`}>
                                      {priority}
                                    </span>
                                  </td>
                                  <td className="py-4 px-4 text-right">
                                    <button
                                      onClick={() => key && viewAffectedSurveys([key])}
                                      disabled={doc.missing === 0}
                                      className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer disabled:text-slate-355 disabled:no-underline font-black"
                                    >
                                      View Missing →
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* ────────────────────────────────────────────────── */}
                  {/* F. BASIC AMENITIES & INFRASTRUCTURE */}
                  {/* ────────────────────────────────────────────────── */}
                  <div id="amenities" className="space-y-6 pt-8 border-t border-slate-200">
                    <div className="border-l-4 border-indigo-600 pl-4 mb-2">
                      <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Basic Amenities & Infrastructure</h3>
                      <p className="text-xs text-slate-500">Access to electricity, road paths, drinking water, and healthcare.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left: Individual Amenity Availability */}
                      <div className="bg-white p-6 rounded-3xl border border-surface-200 shadow-sm space-y-6 transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-px">
                        <h4 className="text-xs font-black uppercase tracking-wider text-surface-500 border-b pb-2">Household Amenity Access rates</h4>
                        <div className="space-y-6">
                          {surveyStats.basicAmenitiesAvailability.map((amenity, idx) => {
                            const name = amenity.amenity.split(' (')[0];
                            const filterMap: Record<string, string> = {
                              'Water': 'water_problem',
                              'Electricity': 'electricity_problem',
                              'Roads / Pathways': 'roads_problem',
                              'Health Facilities': 'health_problem'
                            };
                            const key = filterMap[name];
                            const affected = surveyStats.totalSurveys - amenity.availableCount;

                            return (
                              <div key={idx} className="space-y-2 text-xs">
                                <div className="flex justify-between font-semibold">
                                  <span className="text-surface-700">{amenity.amenity}</span>
                                  <span className="text-surface-900">{amenity.percentage}% ({amenity.availableCount}/{surveyStats.totalSurveys})</span>
                                </div>
                                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                                  <div
                                    className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                                    style={{ width: `${amenity.percentage}%` }}
                                  />
                                </div>
                                <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                                  <span>{affected} households deficient</span>
                                  <button
                                    onClick={() => key && viewAffectedSurveys([key])}
                                    disabled={affected === 0}
                                    className="font-bold text-indigo-600 hover:underline cursor-pointer disabled:text-slate-300 disabled:no-underline"
                                  >
                                    View Affected →
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Right: Aggregated amenities status */}
                      <div className="bg-white p-6 rounded-3xl border border-surface-200 shadow-sm space-y-6 flex flex-col justify-between transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-px">
                        <h4 className="text-xs font-black uppercase tracking-wider text-surface-500 border-b pb-2">Deficiency Aggregations</h4>
                        <div className="space-y-6 flex-grow flex flex-col justify-center">
                          {/* Aggregation 1 */}
                          <div className="bg-rose-50/40 border border-rose-100 p-5 rounded-2xl flex justify-between items-center text-xs transition-all duration-200 hover:bg-rose-50/80">
                            <div>
                              <span className="font-extrabold text-rose-800 block">At Least One Amenity Deficiency</span>
                              <span className="text-rose-600 font-semibold block mt-1">
                                {surveyStats.householdsWithAmenityIssues} families live with missing water, electricity, or bad roads.
                              </span>
                            </div>
                            <button
                              onClick={() => viewAffectedSurveys(['water_problem', 'electricity_problem', 'roads_problem', 'health_problem'])}
                              className="text-[10px] font-black text-rose-855 hover:underline cursor-pointer flex-shrink-0 ml-4"
                            >
                              View →
                            </button>
                          </div>

                          {/* Aggregation 2 */}
                          <div className="bg-emerald-50/40 border border-emerald-100 p-5 rounded-2xl flex justify-between items-center text-xs transition-all duration-200 hover:bg-emerald-50/80">
                            <div>
                              <span className="font-extrabold text-emerald-800 block">All Listed Amenities Available</span>
                              <span className="text-emerald-600 font-semibold block mt-1">
                                {surveyList.filter(s => s.q19aWater === 'Yes' && s.q19bElectricity === 'Yes' && s.q19cRoadsPathways === 'Yes' && s.q19dHealthFacilities === 'Yes').length} households live with complete infrastructure access.
                              </span>
                            </div>
                            <span className="font-mono font-bold text-emerald-800 text-lg bg-white px-2.5 py-1 rounded-xl shadow-xs ml-4 border border-emerald-100/50">
                              {Math.round((surveyList.filter(s => s.q19aWater === 'Yes' && s.q19bElectricity === 'Yes' && s.q19cRoadsPathways === 'Yes' && s.q19dHealthFacilities === 'Yes').length / surveyStats.totalSurveys) * 100)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ────────────────────────────────────────────────── */}
                  {/* G. VULNERABILITY & SPECIAL ASSISTANCE */}
                  {/* ────────────────────────────────────────────────── */}
                  <div id="vulnerability" className="space-y-6 pt-8 border-t border-slate-200">
                    <div className="border-l-4 border-indigo-600 pl-4 mb-2">
                      <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Vulnerabilities & Special Assistance</h3>
                      <p className="text-xs text-slate-500">Child marriages, child labour, mental/physical disabilities, and social stigmas.</p>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-surface-200 shadow-sm space-y-4 transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-px">
                      <div className="overflow-x-auto text-xs">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-surface-200 font-bold text-surface-700">
                              <th className="pb-3 px-4">Vulnerable Status Criteria</th>
                              <th className="pb-3 px-4 text-center">Registered Cases Count</th>
                              <th className="pb-3 px-4 text-right">Outreach List</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-surface-100 font-medium">
                            {surveyStats.vulnerableGroupsCounts.map((g, idx) => {
                              const filterMap: Record<string, string> = {
                                'Transgender in Family': 'transgender',
                                'Victim of Child Marriage': 'child_marriage',
                                'HIV / Incurable Disease': 'hiv',
                                'Victim of Child Labour': 'child_labour',
                                'Victim of Bonded Labour': 'bonded_labour',
                                'Victim of Devadasi System': 'devadasi',
                                'Mental / Intellectual Disability': 'disability',
                              };
                              const key = filterMap[g.group];

                              return (
                                <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                                  <td className="py-3 px-4 text-surface-850 font-semibold">{g.group}</td>
                                  <td className="py-3 px-4 text-center">
                                    <span className={`px-2.5 py-0.5 rounded-lg font-mono font-black text-xs ${g.count > 0 ? 'bg-orange-50 border border-orange-200 text-orange-700' : 'bg-slate-55 border border-slate-200 text-slate-400'}`}>
                                      {g.count}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <button
                                      onClick={() => key && viewAffectedSurveys([key])}
                                      disabled={g.count === 0}
                                      className="text-[10px] font-bold text-indigo-650 hover:underline cursor-pointer disabled:text-slate-350 disabled:no-underline font-black"
                                    >
                                      View Cases →
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Extra Roster breakdowns (Vehicles, Compliance, Org Participation) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                      {/* Vehicle compliance Q6 */}
                      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-px">
                        <h4 className="text-xs font-black uppercase tracking-wider text-surface-500 border-b pb-2">Vehicle Compliance (Q6)</h4>
                        <div className="space-y-4">
                          {surveyStats.vehicleStatus.map((vh, idx) => (
                            <div key={idx} className="text-xs space-y-1.5">
                              <div className="flex justify-between font-semibold text-[11px]">
                                <span className="text-slate-700">{vh.category}</span>
                                <span className="text-slate-900 font-extrabold">{vh.count}/{vh.total} ({vh.percentage}%)</span>
                              </div>
                              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-indigo-600 h-full rounded-full transition-all"
                                  style={{ width: `${vh.percentage}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Community / Org Membership Q8 */}
                      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-px">
                        <h4 className="text-xs font-black uppercase tracking-wider text-surface-500 border-b pb-2">Local Organization Membership (Q8)</h4>
                        <div className="space-y-4">
                          {surveyStats.communityParticipation.map((cp, idx) => (
                            <div key={idx} className="text-xs space-y-1.5">
                              <div className="flex justify-between font-semibold text-[11px]">
                                <span className="text-slate-700">{cp.category}</span>
                                <span className="text-slate-900 font-extrabold">{cp.count} ({cp.percentage}%)</span>
                              </div>
                              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-emerald-600 h-full rounded-full transition-all"
                                  style={{ width: `${cp.percentage}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Property Profile Q20 */}
                      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-px">
                        <h4 className="text-xs font-black uppercase tracking-wider text-surface-500 border-b pb-2">Property Ownership Profile (Q20)</h4>
                        <div className="space-y-4">
                          {surveyStats.propertyProfile.map((pp, idx) => (
                            <div key={idx} className="text-xs space-y-1.5">
                              <div className="flex justify-between font-semibold text-[11px]">
                                <span className="text-slate-700">{pp.category}</span>
                                <span className="text-slate-900 font-extrabold">{pp.count} ({pp.percentage}%)</span>
                              </div>
                              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-amber-600 h-full rounded-full transition-all"
                                  style={{ width: `${pp.percentage}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ────────────────────────────────────────────────── */}
                  {/* K. PRIORITY CASES TABLE */}
                  {/* ────────────────────────────────────────────────── */}
                  <div id="priority-cases" className="space-y-6 pt-8 border-t border-slate-200">
                    <div className="border-l-4 border-indigo-600 pl-4 mb-2">
                      <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Priority Clinic Action Cases</h3>
                      <p className="text-xs text-slate-500">Aggregated alert cases and direct legal service workflow triggers.</p>
                    </div>

                    <div className="bg-white border border-surface-200 rounded-3xl overflow-hidden shadow-sm transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-px">
                      <div className="overflow-x-auto text-xs">
                        <table className="w-full text-left border-collapse font-medium">
                          <thead className="bg-slate-50/70 border-b border-surface-200 text-surface-700 font-bold">
                            <tr>
                              <th className="py-4 px-5">Priority Level</th>
                              <th className="py-4 px-5">Discovered Actionable Issue</th>
                              <th className="py-4 px-5 text-center">Affected Households Count</th>
                              <th className="py-4 px-5 text-right">Clinic Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-surface-100">
                            {/* Row 1: Litigation */}
                            <tr className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-4 px-5">
                                <span className="inline-flex px-2.5 py-0.5 rounded-lg text-[9px] font-black border uppercase bg-red-50 border-red-200 text-red-800">
                                  HIGH
                                </span>
                              </td>
                              <td className="py-4 px-5 font-semibold text-slate-800">Active pending court litigation</td>
                              <td className="py-4 px-5 text-center font-mono font-bold text-red-600">{surveyStats.pendingLitigationCount}</td>
                              <td className="py-4 px-5 text-right">
                                <button
                                  onClick={() => viewAffectedSurveys(['litigation'])}
                                  className="text-[10px] font-black text-indigo-705 hover:text-indigo-850 hover:underline cursor-pointer"
                                >
                                  View Households →
                                </button>
                              </td>
                            </tr>

                            {/* Row 2: Vulnerability */}
                            <tr className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-4 px-5">
                                <span className="inline-flex px-2.5 py-0.5 rounded-lg text-[9px] font-black border uppercase bg-red-50 border-red-200 text-red-800">
                                  HIGH
                                </span>
                              </td>
                              <td className="py-4 px-5 font-semibold text-slate-800">Registered Vulnerability Indicators (Q12-Q18)</td>
                              <td className="py-4 px-5 text-center font-mono font-bold text-red-600">{surveyStats.vulnerableHouseholds}</td>
                              <td className="py-4 px-5 text-right">
                                <button
                                  onClick={() => viewAffectedSurveys(['transgender', 'child_marriage', 'hiv', 'child_labour', 'bonded_labour', 'devadasi', 'disability'])}
                                  className="text-[10px] font-black text-indigo-705 hover:text-indigo-850 hover:underline cursor-pointer"
                                >
                                  View Households →
                                </button>
                              </td>
                            </tr>

                            {/* Row 3: Missing Aadhaar */}
                            <tr className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-4 px-5">
                                <span className="inline-flex px-2.5 py-0.5 rounded-lg text-[9px] font-black border uppercase bg-amber-50 border-amber-200 text-amber-800">
                                  MEDIUM
                                </span>
                              </td>
                              <td className="py-4 px-5 font-semibold text-slate-800">Missing Aadhaar Card documentation</td>
                              <td className="py-4 px-5 text-center font-mono font-bold text-amber-600">
                                {surveyStats.documentAvailabilityMatrix.find(d => d.name === 'Aadhar Card')?.missing || 0}
                              </td>
                              <td className="py-4 px-5 text-right">
                                <button
                                  onClick={() => viewAffectedSurveys(['missing_aadhar'])}
                                  className="text-[10px] font-black text-indigo-705 hover:text-indigo-850 hover:underline cursor-pointer"
                                >
                                  View Households →
                                </button>
                              </td>
                            </tr>

                            {/* Row 4: Water problems */}
                            <tr className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-4 px-5">
                                <span className="inline-flex px-2.5 py-0.5 rounded-lg text-[9px] font-black border uppercase bg-amber-50 border-amber-200 text-amber-800">
                                  MEDIUM
                                </span>
                              </td>
                              <td className="py-4 px-5 font-semibold text-slate-800">Water amenities deficiency</td>
                              <td className="py-4 px-5 text-center font-mono font-bold text-amber-600">
                                {surveyList.filter(s => s.q19aWater !== 'Yes').length}
                              </td>
                              <td className="py-4 px-5 text-right">
                                <button
                                  onClick={() => viewAffectedSurveys(['water_problem'])}
                                  className="text-[10px] font-black text-indigo-705 hover:text-indigo-850 hover:underline cursor-pointer"
                                >
                                  View Households →
                                </button>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Findings and Recommendations Footer */}
                  <div className="bg-slate-50 border border-surface-200 p-6 rounded-3xl space-y-5 text-xs">
                    <div>
                      <h4 className="font-extrabold text-surface-900 uppercase tracking-widest text-[11px] mb-2">
                        Empirical Survey Findings
                      </h4>
                      <p className="text-surface-600 leading-relaxed font-medium">
                        Analysis of {surveyStats.totalSurveys} surveyed households ({surveyStats.recordedFamilyMembers} recorded family members) reveals key legal literacy and documentation gaps in welfare card coverage. Additionally, {surveyStats.pendingLitigationCount} families report active pending court litigations.
                      </p>
                    </div>
                    <div className="border-t border-slate-200/50 my-2" />
                    <div>
                      <h4 className="font-extrabold text-surface-900 uppercase tracking-widest text-[11px] mb-2">
                        Actions for Legal Services Clinic
                      </h4>
                      <ul className="list-disc list-inside text-surface-600 space-y-2 font-medium leading-relaxed">
                        <li>Schedule dedicated camp help-desks to process missing Ration Cards and Aadhar applications.</li>
                        <li>Provide free legal aid counsel for the {surveyStats.pendingLitigationCount} pending court cases.</li>
                        <li>Refer eligible Section 12 applicants to DLSA panel advocates for courtroom assistance.</li>
                      </ul>
                    </div>
                  </div>

                  {/* Off-screen print consolidated view container */}
                  <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '1024px', background: 'white' }} className="print:hidden">
                    <div ref={consolidatedPrintRef}>
                      <ConsolidatedSurveyReport surveys={surveyList} campName={project.camp_name} />
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}

          {activeSurveySubTab === 'schedule' && (
            <SurveySchedule project={project} onUpdate={reload} />
          )}

          {activeSurveySubTab === 'people' && (
            <ProjectPeopleTab campId={project.id} phase="survey" />
          )}

          {activeSurveySubTab === 'attendance' && (
            <AttendanceTab campId={project.id} phase="survey" />
          )}

          {activeSurveySubTab === 'forms' && (
            <div className="space-y-8">
              {loadingSurveys || loadingSurveyDetails ? (
                <div className="p-12 flex flex-col items-center justify-center bg-white rounded-3xl border border-surface-200 shadow-sm">
                  <Spinner size="lg" />
                  <span className="text-xs font-semibold text-slate-500 mt-2">
                    {loadingSurveyDetails ? 'Fetching complete hydrated survey details...' : 'Loading survey list...'}
                  </span>
                </div>
              ) : surveyViewMode === 'individual' && selectedSurvey ? (
                <IndividualSurveyReport
                  survey={selectedSurvey}
                  onBack={() => {
                    setSelectedSurvey(null);
                    setSurveyViewMode('list');
                  }}
                />
              ) : surveyList.length === 0 ? (
                <Card className="p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-surface-100 text-surface-600 flex items-center justify-center mx-auto">
                    <FileText size={24} />
                  </div>
                  <h3 className="text-base font-bold text-surface-900">No Submitted Survey Forms</h3>
                  <p className="text-xs text-surface-500 max-w-md mx-auto leading-relaxed">
                    Volunteer survey collections will populate here upon submission.
                  </p>
                </Card>
              ) : (
                <div className="space-y-8">
                  {/* 1. Search Section */}
                  <div className="relative w-full shadow-xs">
                    <Search
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none"
                    />
                    <input
                      type="text"
                      placeholder="Search survey ID, respondent, surveyor..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 text-xs rounded-2xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-medium text-slate-900 shadow-xs placeholder:text-slate-400 placeholder:font-normal"
                    />
                  </div>

                  {/* 2. Survey Status Tabs (Segmented Control) */}
                  <div className="bg-white p-1.5 rounded-2xl flex flex-wrap md:flex-row gap-1 border border-slate-200 shadow-sm">
                    {[
                      { key: 'all', label: 'All Surveys', count: surveyList.length, activeColor: 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs', hoverColor: 'hover:bg-slate-50 text-slate-600' },
                      { key: 'attention', label: 'Needs Attention', count: surveyList.filter(s => matchesQuickFilter(s, 'attention')).length, activeColor: 'bg-red-50 text-red-700 border border-red-200 shadow-xs', hoverColor: 'hover:bg-red-50/40 text-slate-600' },
                      { key: 'legal', label: 'Legal Cases', count: surveyList.filter(s => matchesQuickFilter(s, 'legal')).length, activeColor: 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs', hoverColor: 'hover:bg-indigo-50/40 text-slate-600' },
                      { key: 'docs', label: 'Document Issues', count: surveyList.filter(s => matchesQuickFilter(s, 'docs')).length, activeColor: 'bg-amber-50 text-amber-700 border border-amber-200 shadow-xs', hoverColor: 'hover:bg-amber-50/40 text-slate-600' },
                      { key: 'amenities', label: 'Amenity Issues', count: surveyList.filter(s => matchesQuickFilter(s, 'amenities')).length, activeColor: 'bg-rose-50 text-rose-700 border border-rose-200 shadow-xs', hoverColor: 'hover:bg-rose-50/40 text-slate-600' },
                    ].map(q => {
                      const isActive = quickFilter === q.key;
                      return (
                        <button
                          key={q.key}
                          onClick={() => {
                            setQuickFilter(q.key as any);
                            setActiveFilters([]);
                          }}
                          className={`flex-1 min-w-[140px] px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-between gap-2 cursor-pointer ${
                            isActive
                              ? q.activeColor + ' scale-[1.01]'
                              : 'text-slate-600 border border-transparent ' + q.hoverColor
                          }`}
                        >
                          <span className="font-semibold">{q.label}</span>
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono transition-colors ${
                            isActive 
                              ? 'bg-slate-200/60 text-slate-700' 
                              : 'bg-slate-200/40 text-slate-500'
                          }`}>{q.count}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* 3. Multi-Criteria Filtering Tag Grid */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                        <Filter className="w-4 h-4 text-primary-600" />
                        Multi-Criteria Filtering Options
                      </span>
                      {activeFilters.length > 0 && (
                        <button onClick={() => setActiveFilters([])} className="text-[10px] font-bold text-red-500 hover:text-red-700 hover:underline cursor-pointer transition-colors">
                          Clear All Filters ({activeFilters.length})
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                      {/* Legal Group */}
                      <div className="space-y-2.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-100 pb-1">Legal</span>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { key: 'litigation', label: 'Pending Litigation' },
                            { key: 'no_litigation', label: 'No Litigation' },
                            { key: 'free_legal_aid', label: 'Free Aid Claim' },
                            { key: 'other_legal_problem', label: 'Other Legal Problem' }
                          ].map(f => (
                            <button
                              key={f.key}
                              onClick={() => toggleCustomFilter(f.key)}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all duration-200 border cursor-pointer ${
                                activeFilters.includes(f.key)
                                  ? 'bg-indigo-50 border-indigo-200 text-indigo-750 font-bold shadow-xs'
                                  : 'bg-slate-50/60 hover:bg-slate-100/80 border-slate-200 text-slate-600 hover:text-slate-800'
                              }`}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Documents Group */}
                      <div className="space-y-2.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-100 pb-1">Missing Documents</span>
                        <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                          {[
                            { key: 'missing_ration_card', label: 'Ration Card' },
                            { key: 'missing_aadhar', label: 'Aadhaar' },
                            { key: 'missing_birth_cert', label: 'Birth Certificate' },
                            { key: 'missing_death_cert', label: 'Death Certificate' },
                            { key: 'missing_old_age_pension', label: 'Old Age Pension' },
                            { key: 'missing_widow_pension', label: 'Widow Pension' },
                            { key: 'missing_udid', label: 'UDID Disability' },
                            { key: 'missing_ayushman', label: 'Ayushman Health' }
                          ].map(f => (
                            <button
                              key={f.key}
                              onClick={() => toggleCustomFilter(f.key)}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all duration-200 border cursor-pointer ${
                                activeFilters.includes(f.key)
                                  ? 'bg-amber-50 border-amber-200 text-amber-800 font-bold shadow-xs'
                                  : 'bg-slate-50/60 hover:bg-slate-100/80 border-slate-200 text-slate-600 hover:text-slate-800'
                              }`}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Amenities Group */}
                      <div className="space-y-2.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-100 pb-1">Amenities Problems</span>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { key: 'water_problem', label: 'Water Problem' },
                            { key: 'electricity_problem', label: 'Electricity Problem' },
                            { key: 'roads_problem', label: 'Roads Problem' },
                            { key: 'health_problem', label: 'Health Facilities' }
                          ].map(f => (
                            <button
                              key={f.key}
                              onClick={() => toggleCustomFilter(f.key)}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all duration-200 border cursor-pointer ${
                                activeFilters.includes(f.key)
                                  ? 'bg-rose-50 border-rose-200 text-rose-800 font-bold shadow-xs'
                                  : 'bg-slate-50/60 hover:bg-slate-100/80 border-slate-200 text-slate-600 hover:text-slate-800'
                              }`}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Vulnerability Group */}
                      <div className="space-y-2.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-100 pb-1">Vulnerabilities</span>
                        <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                          {[
                            { key: 'transgender', label: 'Transgender' },
                            { key: 'child_marriage', label: 'Child Marriage' },
                            { key: 'hiv', label: 'HIV/Incurable' },
                            { key: 'child_labour', label: 'Child Labour' },
                            { key: 'bonded_labour', label: 'Bonded Labour' },
                            { key: 'devadasi', label: 'Devadasi System' },
                            { key: 'disability', label: 'Mental Disability' }
                          ].map(f => (
                            <button
                              key={f.key}
                              onClick={() => toggleCustomFilter(f.key)}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all duration-200 border cursor-pointer ${
                                activeFilters.includes(f.key)
                                  ? 'bg-orange-50 border-orange-200 text-orange-850 font-bold shadow-xs'
                                  : 'bg-slate-50/60 hover:bg-slate-100/80 border-slate-200 text-slate-600 hover:text-slate-800'
                              }`}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Socio-Economic Group */}
                      <div className="space-y-2.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-100 pb-1">Socio-Economic</span>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { key: 'unemployment', label: 'Unemployed' },
                            { key: 'education_issue', label: 'Discontinued Edu' },
                            { key: 'property_issue', label: 'Property Issue' },
                            { key: 'vehicle_issue', label: 'Vehicle Compliance' },
                            { key: 'other_issue', label: 'Other Issue' }
                          ].map(f => (
                            <button
                              key={f.key}
                              onClick={() => toggleCustomFilter(f.key)}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all duration-200 border cursor-pointer ${
                                activeFilters.includes(f.key)
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold shadow-xs'
                                  : 'bg-slate-50/60 hover:bg-slate-100/80 border-slate-200 text-slate-600 hover:text-slate-800'
                              }`}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4. List View Table */}
                  <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
                    <div className="p-5 border-b border-slate-105 bg-slate-50/40">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-500" />
                        Submitted Volunteer Sheets ({filteredSurveys.length})
                      </h3>
                    </div>
                    {filteredSurveys.length === 0 ? (
                      <div className="p-12 text-center text-xs text-slate-400 font-bold">
                        No submitted surveys match your search query or filters.
                      </div>
                    ) : (
                      <div className="overflow-x-auto text-xs font-medium">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-slate-50/60 font-bold border-b border-slate-100 text-slate-600 uppercase tracking-wider text-[10px]">
                            <tr>
                              <th className="py-4 px-6">Ref ID</th>
                              <th className="py-4 px-6">Data Collector (Volunteer)</th>
                              <th className="py-4 px-6">Respondent</th>
                              <th className="py-4 px-6">Main Occupation</th>
                              <th className="py-4 px-6">Litigation Status</th>
                              <th className="py-4 px-6 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700">
                            {filteredSurveys.map((survey) => (
                              <tr key={survey.surveyReferenceId} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-4 px-6 font-mono font-bold text-indigo-650">
                                  {survey.surveyReferenceId}
                                </td>
                                <td className="py-4 px-6 font-semibold text-slate-900">
                                  {survey.nameOfDataCollector || 'Surveyor'}
                                </td>
                                <td className="py-4 px-6 text-slate-900">
                                  {survey.nameOfOrganizationCollege || 'N/A'}
                                </td>
                                <td className="py-4 px-6 text-slate-500">
                                  {survey.q2MainOccupation || 'N/A'}
                                </td>
                                <td className="py-4 px-6">
                                  {survey.q7PendingLitigation === 'Yes' ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/60 shadow-2xs">
                                      <ShieldAlert className="w-3 h-3 text-amber-500" />
                                      Litigation Pending
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/60 shadow-2xs">
                                      No Litigation
                                    </span>
                                  )}
                                </td>
                                <td className="py-4 px-6 text-right">
                                  <button
                                    onClick={() => handleViewIndividual(survey)}
                                    className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-[11px] inline-flex items-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95"
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
              )}
            </div>
          )}

          {activeSurveySubTab === 'budget' && (
            <BudgetTab campId={project.id} camp={project} phase="survey" onCampUpdate={reload} />
          )}
        </div>
      )}

      {/* 3. CAMP PHASE */}
      {activeMainTab === 'camp' && (
        <div className="space-y-6">
          {/* Sub-navigation */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {CAMP_SUB_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleCampSubTabChange(tab.key)}
                className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-2 cursor-pointer h-24 shadow-sm ${
                  activeCampSubTab === tab.key
                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 shadow-sm font-bold scale-[1.02]'
                    : 'bg-white border-surface-200 text-surface-600 hover:bg-surface-50 hover:border-surface-300 font-semibold'
                }`}
              >
                {tab.icon}
                <span className="text-[11px] leading-tight">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Sub-tab content */}
          {activeCampSubTab === 'activities' && <ActivitiesTab campId={project.id} project={project} phase="camp" />}

          {activeCampSubTab === 'photos' && <PhotosTab campId={project.id} />}

          {activeCampSubTab === 'budget' && (
            <BudgetTab campId={project.id} camp={project} phase="camp" onCampUpdate={reload} />
          )}

          {activeCampSubTab === 'schedule' && (
            <CampSchedule project={project} onUpdate={reload} />
          )}

          {activeCampSubTab === 'people' && <ProjectPeopleTab campId={project.id} phase="camp" />}

          {activeCampSubTab === 'attendance' && (
            <AttendanceTab campId={project.id} phase="camp" />
          )}
        </div>
      )}

      {/* 4. FINAL REPORT */}
      {activeMainTab === 'report' && (
        <ReportPreparationTab
          projectId={project.id}
          onNavigateTab={(tabKey) => {
            if (tabKey === 'activities') handleMainTabChange('camp');
            if (tabKey === 'photos') handleMainTabChange('camp');
          }}
        />
      )}

      {/* ─── Edit Modal ─── */}
      {showEdit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => e.target === e.currentTarget && setShowEdit(false)}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200">
              <h2 className="text-lg font-semibold text-surface-900">Edit Project</h2>
              <button
                type="button"
                onClick={() => setShowEdit(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 hover:bg-surface-100 hover:text-surface-700 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 max-h-[75vh] overflow-y-auto">
              <ProjectForm
                project={project}
                onCancel={() => setShowEdit(false)}
                onSaved={(updated) => {
                  setProject(updated);
                  setShowEdit(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Dialog ─── */}
      {showDeleteDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => e.target === e.currentTarget && handleCloseDeleteDialog()}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Dialog Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-red-100 bg-red-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
                  <Trash2 size={18} className="text-red-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-red-900">Delete Project</h2>
                  <p className="text-xs text-red-600">This action cannot be undone</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseDeleteDialog}
                disabled={isDeleting}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-100 hover:text-red-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            {/* Dialog Body */}
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-surface-700">
                You are about to permanently delete{' '}
                <span className="font-bold text-surface-900">{project.camp_name}</span>.
              </p>

              {/* What will be deleted */}
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-red-800 uppercase tracking-wide">
                  The following will be permanently removed:
                </p>
                <ul className="space-y-1">
                  {[
                    'Survey Schedule & Camp Schedule',
                    'Assigned People & Roster',
                    'Activities & Activity Data',
                    'Attendance Records',
                    'Budget & Expense Records',
                    'Documentation Photos',
                    'Survey Forms (future)',
                    'Generated Reports (future)',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-xs text-red-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Confirmation input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-surface-700">
                  Type the project name to confirm:{' '}
                  <span className="text-surface-900 font-bold">"{project.camp_name}"</span>
                </label>
                <input
                  id="delete-confirm-input"
                  type="text"
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  placeholder="Enter project name…"
                  disabled={isDeleting}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm bg-white text-surface-900 border-surface-300 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 transition-all disabled:opacity-60"
                  autoComplete="off"
                />
              </div>

              {deleteError && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                  <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                  <span>{deleteError}</span>
                </div>
              )}
            </div>

            {/* Dialog Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-surface-100">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleCloseDeleteDialog}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                isLoading={isDeleting}
                disabled={!isDeleteConfirmed || isDeleting}
                onClick={handleDeleteProject}
                className="bg-red-600 hover:bg-red-700 text-white border-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete Project
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
