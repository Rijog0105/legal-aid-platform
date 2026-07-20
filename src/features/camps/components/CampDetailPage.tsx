import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Pencil, Calendar, MapPin, Clock, X, AlertCircle, FileText, Info } from 'lucide-react';
import { Button, Card, CampStatusBadge, Spinner } from '@/components/ui';
import { CAMP_STATUS, ROUTES, type CampStatus } from '@/constants';
import { useCamp } from '@/features/camps/hooks/useCamp';
import { updateCampStatus } from '@/features/camps/services/campService';
import { CampForm } from './CampForm';
import { CampPeopleTab } from './CampPeopleTab';
import { ActivitiesTab } from '@/features/activities';
import { PhotosTab } from '@/features/volunteer';
import { ReportPreparationTab } from './ReportPreparationTab';

const STATUS_FLOW: Record<CampStatus, CampStatus[]> = {
  [CAMP_STATUS.DRAFT]: [CAMP_STATUS.ACTIVE],
  [CAMP_STATUS.ACTIVE]: [CAMP_STATUS.COMPLETED],
  [CAMP_STATUS.COMPLETED]: [CAMP_STATUS.ARCHIVED],
  [CAMP_STATUS.ARCHIVED]: [],
};

const STATUS_LABELS: Record<CampStatus, string> = {
  [CAMP_STATUS.DRAFT]: 'Draft',
  [CAMP_STATUS.ACTIVE]: 'Active',
  [CAMP_STATUS.COMPLETED]: 'Completed',
  [CAMP_STATUS.ARCHIVED]: 'Archived',
};

type Tab = 'overview' | 'people' | 'attendance' | 'activities' | 'photos' | 'surveys' | 'budget' | 'report';

const TABS: { key: Tab; label: string; phase?: string }[] = [
  { key: 'overview', label: 'Camp Info' },
  { key: 'people', label: 'Assign People' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'activities', label: 'Activities' },
  { key: 'photos', label: 'Documentation' },
  { key: 'surveys', label: 'Surveys' },
  { key: 'budget', label: 'Budget', phase: 'Phase 7' },
  { key: 'report', label: 'Report Studio', phase: 'Phase 8' },
];

export function CampDetailPage() {
  const { campId } = useParams<{ campId: string }>();
  const { camp, isLoading, error, setCamp } = useCamp(campId);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showEdit, setShowEdit] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const handleStatusChange = async (status: CampStatus) => {
    if (!camp) return;
    setStatusUpdating(true);
    setStatusError(null);
    try {
      const updated = await updateCampStatus(camp.id, status);
      setCamp(updated);
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : 'Failed to update status');
    } finally {
      setStatusUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !camp) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
        <AlertCircle size={16} className="flex-shrink-0" />
        {error ?? 'Camp not found'}
      </div>
    );
  }

  const nextStatuses = STATUS_FLOW[camp.status];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ─── Back Link ─── */}
      <Link
        to={ROUTES.CAMPS}
        className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-700 transition-colors"
      >
        <ArrowLeft size={15} /> Back to Camps
      </Link>

      {/* ─── Camp Header ─── */}
      <div className="flex flex-wrap items-start justify-between gap-4 bg-white p-6 rounded-3xl border border-surface-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-surface-900">{camp.camp_name}</h1>
            <CampStatusBadge status={camp.status} />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-sm text-surface-500">
            <span className="flex items-center gap-1.5">
              <Calendar size={14} className="text-surface-400" /> {camp.camp_date}
            </span>
            {(camp.start_time || camp.end_time) && (
              <span className="flex items-center gap-1.5">
                <Clock size={14} className="text-surface-400" />
                {camp.start_time ?? '—'} – {camp.end_time ?? '—'}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <MapPin size={14} className="text-surface-400" />
              {camp.village_name}, {camp.taluk}, {camp.district}
            </span>
          </div>
        </div>

        {/* Status Actions */}
        <div className="flex items-center gap-2">
          {nextStatuses.map((status) => (
            <Button
              key={status}
              size="sm"
              variant="secondary"
              isLoading={statusUpdating}
              onClick={() => handleStatusChange(status)}
            >
              Mark {STATUS_LABELS[status]}
            </Button>
          ))}
          <Button size="sm" variant="outline" leftIcon={<Pencil size={14} />} onClick={() => setShowEdit(true)}>
            Edit Details
          </Button>
        </div>
      </div>

      {statusError && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          {statusError}
        </div>
      )}

      {/* ─── Camp Workspace Modules (Tabs Navigation) ─── */}
      <div className="flex items-center gap-1 border-b border-surface-200 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
              activeTab === tab.key
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-surface-500 hover:text-surface-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Tab Content Views ─── */}

      {/* 1. Camp Info Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {camp.description && (
            <Card>
              <h3 className="text-sm font-bold text-surface-900 mb-1">Camp Description</h3>
              <p className="text-sm text-surface-600 leading-relaxed">{camp.description}</p>
            </Card>
          )}

          <Card>
            <h3 className="text-sm font-bold text-surface-900 mb-3">Automation & Report Settings</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="bg-surface-50 p-3 rounded-xl border border-surface-100">
                <p className="text-xs text-surface-400">Include Budget in Report</p>
                <p className="text-surface-900 font-semibold mt-0.5">
                  {camp.report_settings?.include_budget ? 'Yes' : 'No'}
                </p>
              </div>
              <div className="bg-surface-50 p-3 rounded-xl border border-surface-100">
                <p className="text-xs text-surface-400">Include Survey Statistics</p>
                <p className="text-surface-900 font-semibold mt-0.5">
                  {camp.report_settings?.include_survey_stats ? 'Yes' : 'No'}
                </p>
              </div>
              <div className="bg-surface-50 p-3 rounded-xl border border-surface-100">
                <p className="text-xs text-surface-400">Max Photos / Activity</p>
                <p className="text-surface-900 font-semibold mt-0.5">
                  {camp.report_settings?.max_photos_per_activity}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 2. Assign People */}
      {activeTab === 'people' && <CampPeopleTab campId={camp.id} />}

      {/* 3. Attendance */}
      {activeTab === 'attendance' && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-base font-bold text-surface-900">Camp Attendance</h3>
            <span className="text-xs text-surface-500 font-normal">
              (Derived from assigned delegation roster)
            </span>
          </div>
          <CampPeopleTab campId={camp.id} />
        </Card>
      )}

      {/* 4. Activities */}
      {activeTab === 'activities' && <ActivitiesTab campId={camp.id} />}

      {/* 5. Documentation (Photos Curation) */}
      {activeTab === 'photos' && <PhotosTab campId={camp.id} />}

      {/* 6. Surveys Placeholder */}
      {activeTab === 'surveys' && (
        <Card className="p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <FileText size={24} />
          </div>
          <h3 className="text-base font-bold text-surface-900">Surveys Module Integration</h3>
          <p className="text-xs text-surface-500 max-w-md mx-auto leading-relaxed">
            Beneficiary survey form collection and survey metric aggregation.
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-100 text-surface-600 text-xs font-medium">
            <span>Roadmap Target:</span>
            <span className="font-semibold text-primary-700">Phase 7 (Survey Integration)</span>
          </div>
        </Card>
      )}

      {/* 7. Budget Placeholder */}
      {activeTab === 'budget' && (
        <Card className="p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
            <Info size={24} />
          </div>
          <h3 className="text-base font-bold text-surface-900">Camp Budget Module</h3>
          <p className="text-xs text-surface-500 max-w-md mx-auto leading-relaxed">
            Track requested, approved, and actual camp expenditure items for financial reporting.
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-100 text-surface-600 text-xs font-medium">
            <span>Roadmap Target:</span>
            <span className="font-semibold text-primary-700">Phase 7 (Budget Module)</span>
          </div>
        </Card>
      )}

      {/* 8. Report Preparation Workspace */}
      {activeTab === 'report' && (
        <ReportPreparationTab
          campId={camp.id}
          onNavigateTab={(tabKey) => {
            if (tabKey === 'activities' || tabKey === 'photos') {
              setActiveTab(tabKey);
            }
          }}
        />
      )}

      {/* Edit Modal */}
      {showEdit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => e.target === e.currentTarget && setShowEdit(false)}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200">
              <h2 className="text-lg font-semibold text-surface-900">Edit Camp</h2>
              <button
                type="button"
                onClick={() => setShowEdit(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 hover:bg-surface-100 hover:text-surface-700 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 max-h-[75vh] overflow-y-auto">
              <CampForm
                camp={camp}
                onCancel={() => setShowEdit(false)}
                onSaved={(updated) => {
                  setCamp(updated);
                  setShowEdit(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
