import { useNavigate } from 'react-router-dom';
import { Tent, Plus, Search, MapPin, Calendar, AlertCircle } from 'lucide-react';
import { Button, Card, CampStatusBadge, EmptyState, Spinner } from '@/components/ui';
import { CAMP_STATUS, ROUTES, type CampStatus } from '@/constants';
import { useCamps } from '@/features/camps/hooks/useCamps';

const ALL_STATUSES: Array<CampStatus | null> = [
  null,
  CAMP_STATUS.DRAFT,
  CAMP_STATUS.ACTIVE,
  CAMP_STATUS.COMPLETED,
  CAMP_STATUS.ARCHIVED,
];

const STATUS_LABELS: Record<CampStatus, string> = {
  [CAMP_STATUS.DRAFT]: 'Draft',
  [CAMP_STATUS.ACTIVE]: 'Active',
  [CAMP_STATUS.COMPLETED]: 'Completed',
  [CAMP_STATUS.ARCHIVED]: 'Archived',
};

export function CampListPage() {
  const navigate = useNavigate();
  const { camps, isLoading, error, search, setSearch, statusFilter, setStatusFilter } =
    useCamps();

  const goToDetail = (id: string) => navigate(ROUTES.CAMP_DETAIL.replace(':campId', id));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Camps</h1>
          <p className="text-surface-500 mt-0.5 text-sm">
            {camps.length} {camps.length === 1 ? 'camp' : 'camps'}
            {statusFilter ? ` · ${STATUS_LABELS[statusFilter]}` : ''}
          </p>
        </div>
        <Button
          id="btn-add-camp"
          leftIcon={<Plus size={16} />}
          onClick={() => navigate(ROUTES.CAMP_CREATE)}
        >
          New Camp
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none"
          />
          <input
            id="camps-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by camp name…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-300 text-sm bg-white text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {ALL_STATUSES.map((status) => {
            const active = statusFilter === status;
            return (
              <button
                key={status ?? 'all'}
                id={`filter-${status ?? 'all'}`}
                onClick={() => setStatusFilter(status)}
                className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-all ${
                  active
                    ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                    : 'bg-white text-surface-600 border-surface-300 hover:border-primary-400 hover:text-primary-600'
                }`}
              >
                {status ? STATUS_LABELS[status] : 'All'}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : camps.length === 0 ? (
        <div className="bg-white rounded-2xl border border-surface-200 shadow-sm">
          <EmptyState
            icon={<Tent size={28} />}
            title={search || statusFilter ? 'No results found' : 'No camps yet'}
            description={
              search || statusFilter
                ? 'Try a different name or status filter.'
                : 'Create your first legal aid camp to get started.'
            }
            action={
              !search && !statusFilter ? (
                <Button leftIcon={<Plus size={16} />} onClick={() => navigate(ROUTES.CAMP_CREATE)}>
                  New Camp
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {camps.map((camp) => (
            <Card key={camp.id} hover onClick={() => goToDetail(camp.id)}>
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-surface-900 leading-snug">{camp.camp_name}</h3>
                <CampStatusBadge status={camp.status} />
              </div>
              <div className="space-y-1.5 text-sm text-surface-500">
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} className="flex-shrink-0" />
                  <span>{camp.camp_date}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin size={14} className="flex-shrink-0" />
                  <span className="truncate">
                    {camp.village_name}, {camp.taluk}, {camp.district}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
