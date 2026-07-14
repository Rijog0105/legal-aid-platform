import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Pencil, Calendar, MapPin, Clock, X, AlertCircle } from 'lucide-react';
import { Button, Card, CampStatusBadge, Spinner } from '@/components/ui';
import { CAMP_STATUS, ROUTES, type CampStatus } from '@/constants';
import { useCamp } from '@/features/camps/hooks/useCamp';
import { updateCampStatus } from '@/features/camps/services/campService';
import { CampForm } from './CampForm';
import { CampPeopleTab } from './CampPeopleTab';

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

type Tab = 'overview' | 'people' | 'activities' | 'photos' | 'budget' | 'narratives' | 'report';

const TABS: { key: Tab; label: string; phase?: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'people', label: 'People' },
  { key: 'activities', label: 'Activities', phase: 'Phase 5' },
  { key: 'photos', label: 'Photos', phase: 'Phase 6' },
  { key: 'budget', label: 'Budget', phase: 'Phase 7' },
  { key: 'narratives', label: 'Narratives', phase: 'Phase 7' },
  { key: 'report', label: 'Report', phase: 'Phase 8' },
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
    <div>
      <Link
        to={ROUTES.CAMPS}
        className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-700 mb-4"
      >
        <ArrowLeft size={15} /> Back to Camps
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-surface-900">{camp.camp_name}</h1>
            <CampStatusBadge status={camp.status} />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-surface-500">
            <span className="flex items-center gap-1.5">
              <Calendar size={14} /> {camp.camp_date}
            </span>
            {(camp.start_time || camp.end_time) && (
              <span className="flex items-center gap-1.5">
                <Clock size={14} />
                {camp.start_time ?? '—'} – {camp.end_time ?? '—'}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <MapPin size={14} />
              {camp.village_name}, {camp.taluk}, {camp.district}
            </span>
          </div>
        </div>

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
          <Button size="sm" leftIcon={<Pencil size={14} />} onClick={() => setShowEdit(true)}>
            Edit
          </Button>
        </div>
      </div>

      {statusError && (
        <div className="flex items-center gap-2 mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          {statusError}
        </div>
      )}

      {camp.description && (
        <Card className="mb-6">
          <p className="text-sm text-surface-600">{camp.description}</p>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-surface-200 mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-surface-500 hover:text-surface-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <Card>
          <h3 className="text-base font-semibold text-surface-900 mb-3">Report Settings</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-surface-400">Include Budget</p>
              <p className="text-surface-900 font-medium">
                {camp.report_settings?.include_budget ? 'Yes' : 'No'}
              </p>
            </div>
            <div>
              <p className="text-surface-400">Include Survey Stats</p>
              <p className="text-surface-900 font-medium">
                {camp.report_settings?.include_survey_stats ? 'Yes' : 'No'}
              </p>
            </div>
            <div>
              <p className="text-surface-400">Max Photos / Activity</p>
              <p className="text-surface-900 font-medium">
                {camp.report_settings?.max_photos_per_activity}
              </p>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'people' && <CampPeopleTab campId={camp.id} />}

      {activeTab !== 'overview' && activeTab !== 'people' && (
        <Card>
          <p className="text-sm text-surface-500">
            {TABS.find((t) => t.key === activeTab)?.label} coming in{' '}
            {TABS.find((t) => t.key === activeTab)?.phase}.
          </p>
        </Card>
      )}

      {/* Edit modal */}
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
                className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 hover:bg-surface-100 hover:text-surface-700 transition-colors"
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
