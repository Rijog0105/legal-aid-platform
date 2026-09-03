import { useState, useEffect, useCallback } from 'react';
import { Card, Button, Spinner } from '@/components/ui';
import {
  fetchSessionDashboardData,
  type DashboardAttendee,
} from '../services/attendanceService';
import { generateAttendanceReportPDF } from '../utils/attendanceReportGenerator';
import {
  Search,
  Download,
  ArrowLeft,
  Calendar,
  Compass,
  Clock,
  MapPin,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';

interface AttendanceSummaryProps {
  sessionId: string;
  projectId: string;
  projectName: string;
  phase: 'survey' | 'camp';
  sessionType: 'check_in' | 'check_out';
  startsAt: string;
  expiresAt: string;
  radiusMeters: number;
  facultyCoords: { latitude: number; longitude: number };
  onBack?: () => void;
}

export function AttendanceSummary({
  sessionId,
  projectId,
  projectName,
  phase,
  sessionType,
  startsAt,
  expiresAt,
  radiusMeters,
  facultyCoords,
  onBack,
}: AttendanceSummaryProps) {
  const [attendees, setAttendees] = useState<DashboardAttendee[]>([]);
  const [stats, setStats] = useState({ present: 0, pending: 0, rejected: 0, outside: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search, Filter, Sort States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'absent' | 'rejected'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'role' | 'time'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSessionDashboardData(sessionId, projectId);
      setAttendees(data.attendees);
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch summary data');
    } finally {
      setLoading(false);
    }
  }, [sessionId, projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived stats
  const totalAssigned = attendees.length;
  const presentCount = stats.present;
  const rejectedCount = stats.rejected;
  // Once the session is closed, pending users are counted as ABSENT.
  const absentCount = stats.pending; 
  const attendancePercentage = totalAssigned > 0 ? Math.round((presentCount / totalAssigned) * 100) : 0;

  const handleExport = () => {
    generateAttendanceReportPDF({
      projectName,
      phase,
      sessionType,
      startsAt,
      expiresAt,
      radiusMeters,
      facultyCoords,
      attendees,
    });
  };

  const toggleSort = (field: 'name' | 'role' | 'time') => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Filter and Sort Attendees
  const processedAttendees = attendees
    .filter((attendee) => {
      // 1. Name search filter
      const matchesSearch = attendee.name.toLowerCase().includes(searchTerm.toLowerCase());

      // 2. Status filter
      let matchesStatus = true;
      if (statusFilter === 'present') {
        matchesStatus = attendee.status === 'present';
      } else if (statusFilter === 'rejected') {
        matchesStatus = attendee.status === 'rejected';
      } else if (statusFilter === 'absent') {
        matchesStatus = attendee.status === 'pending'; // Pending is Absent when completed
      }

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'role') {
        comparison = a.role.localeCompare(b.role);
      } else if (sortBy === 'time') {
        const timeA = a.check_in_time ? new Date(a.check_in_time).getTime() : 0;
        const timeB = b.check_in_time ? new Date(b.check_in_time).getTime() : 0;
        comparison = timeA - timeB;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 text-center space-y-3">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h3 className="text-base font-bold text-surface-900">Failed to load Summary</h3>
        <p className="text-xs text-surface-500">{error}</p>
        <Button size="sm" onClick={loadData}>Retry</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back to History */}
      {onBack && (
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-surface-500 hover:text-surface-700 transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} /> Back to Session History
        </button>
      )}

      {/* ─── Summary Header ─── */}
      <div className="flex flex-wrap items-start justify-between gap-4 bg-white p-5 rounded-2xl border border-surface-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-surface-900">Attendance Summary</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-100 text-surface-600 uppercase tracking-wide">
              {phase === 'survey' ? 'Survey Phase' : 'Camp Phase'}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 uppercase tracking-wide">
              {sessionType === 'check_in' ? 'Check-In' : 'Check-Out'}
            </span>
          </div>
          <p className="text-xs text-surface-500">Project: <span className="font-semibold text-surface-800">{projectName}</span></p>
        </div>
        <Button
          size="sm"
          variant="outline"
          leftIcon={<Download size={14} />}
          onClick={handleExport}
        >
          Export Attendance
        </Button>
      </div>

      {/* ─── Info & Stats Grid ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Session Info Details */}
        <Card className="p-5 space-y-4 md:col-span-1">
          <h3 className="text-xs font-bold text-surface-900 border-b border-surface-100 pb-2">Session Parameters</h3>
          <div className="space-y-3 text-xs">
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-surface-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-surface-400 block">Date</span>
                <span className="font-semibold text-surface-800">
                  {new Date(startsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-surface-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-surface-400 block">Duration</span>
                <span className="font-semibold text-surface-800">
                  {new Date(startsAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} - {new Date(expiresAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Compass className="w-4 h-4 text-surface-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-surface-400 block">Radius Constraint</span>
                <span className="font-semibold text-surface-800">{radiusMeters} meters</span>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-surface-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-surface-400 block">Faculty Coordinates</span>
                <span className="font-mono font-semibold text-surface-800">
                  {facultyCoords.latitude.toFixed(6)}, {facultyCoords.longitude.toFixed(6)}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Statistics Panels */}
        <Card className="p-5 md:col-span-2 space-y-4">
          <h3 className="text-xs font-bold text-surface-900 border-b border-surface-100 pb-2">Roster Statistics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div className="p-3 bg-surface-50 border border-surface-100 rounded-xl">
              <span className="text-[10px] text-surface-400 uppercase tracking-wider block mb-0.5">Assigned</span>
              <span className="text-lg font-black text-surface-800">{totalAssigned}</span>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
              <span className="text-[10px] text-emerald-600 uppercase tracking-wider font-semibold block mb-0.5">Present</span>
              <span className="text-lg font-black text-emerald-800">{presentCount}</span>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
              <span className="text-[10px] text-amber-600 uppercase tracking-wider font-semibold block mb-0.5">Absent</span>
              <span className="text-lg font-black text-amber-800">{absentCount}</span>
            </div>

            <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
              <span className="text-[10px] text-red-600 uppercase tracking-wider font-semibold block mb-0.5">Rejected</span>
              <span className="text-lg font-black text-red-800">{rejectedCount}</span>
            </div>

            <div className="p-3 bg-primary-50 border border-primary-100 rounded-xl col-span-2 sm:col-span-1 flex flex-col justify-center">
              <span className="text-[10px] text-primary-600 uppercase tracking-wider font-semibold block mb-0.5">Turnout</span>
              <span className="text-lg font-black text-primary-800 flex items-center justify-center gap-1">
                <TrendingUp size={16} className="text-primary-600" />
                {attendancePercentage}%
              </span>
            </div>
          </div>

          <div className="w-full h-3 rounded-full bg-surface-100 overflow-hidden flex">
            <div className="h-full bg-emerald-500" style={{ width: `${attendancePercentage}%` }} title="Present" />
            <div className="h-full bg-red-550" style={{ width: `${totalAssigned > 0 ? (rejectedCount / totalAssigned) * 100 : 0}%` }} title="Rejected" />
            <div className="h-full bg-amber-400" style={{ width: `${totalAssigned > 0 ? (absentCount / totalAssigned) * 100 : 0}%` }} title="Absent" />
          </div>
        </Card>
      </div>

      {/* ─── Filter & Search Control Panel ─── */}
      <div className="bg-white p-4 rounded-2xl border border-surface-200 shadow-sm flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search attendee by name..."
            className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-surface-300 bg-white text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all"
          />
        </div>

        {/* Filters Selectors */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {(
            [
              { key: 'all', label: 'All Statuses' },
              { key: 'present', label: 'Present' },
              { key: 'absent', label: 'Absent' },
              { key: 'rejected', label: 'Rejected' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer border ${
                statusFilter === tab.key
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-surface-50 text-surface-600 border-surface-200 hover:bg-surface-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Attendees Records List ─── */}
      <Card className="overflow-hidden border border-surface-200 shadow-sm rounded-2xl">
        {/* Desktop View (Table) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-xs text-left text-surface-600 divide-y divide-surface-100">
            <thead className="bg-surface-50 text-surface-550 uppercase font-bold">
              <tr>
                <th className="px-5 py-3 cursor-pointer select-none" onClick={() => toggleSort('name')}>
                  Name {sortBy === 'name' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th className="px-5 py-3 cursor-pointer select-none" onClick={() => toggleSort('role')}>
                  Roster Role {sortBy === 'role' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th className="px-5 py-3 cursor-pointer select-none" onClick={() => toggleSort('time')}>
                  Time Checked {sortBy === 'time' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th className="px-5 py-3">Distance</th>
                <th className="px-5 py-3">GPS Verification</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Rejection Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 bg-white">
              {processedAttendees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-xs text-surface-400 italic">
                    No matching attendees found.
                  </td>
                </tr>
              ) : (
                processedAttendees.map((attendee) => (
                  <tr key={attendee.user_id} className="hover:bg-surface-50/50">
                    <td className="px-5 py-3.5 text-surface-900">
                      <span className="font-bold block">{attendee.name}</span>
                      {attendee.category === 'student' && attendee.usn_employee_id && (
                        <span className="text-[10px] text-surface-500 font-medium block mt-0.5">
                          SRN: <span className="font-mono">{attendee.usn_employee_id.replace(/^SRN:\s*/i, '')}</span>
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-surface-500">{attendee.role}</td>
                    <td className="px-5 py-3.5">
                      {attendee.check_in_time
                        ? new Date(attendee.check_in_time).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      {attendee.distance !== null ? (
                        <span className={attendee.gps_status === 'Outside Radius' || attendee.status === 'rejected' ? 'font-black text-red-600' : 'text-surface-700'}>
                          {attendee.distance} m
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {attendee.status === 'pending' ? (
                        <span className="text-surface-400">—</span>
                      ) : (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            attendee.gps_status === 'Within Radius'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-red-100 text-red-800 border border-red-200'
                          }`}
                        >
                          {attendee.gps_status}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {attendee.status === 'rejected' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase bg-red-100 text-red-800 border border-red-300 shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                          REJECTED (OUT OF RADIUS)
                        </span>
                      ) : (
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase ${
                            attendee.status === 'present'
                              ? 'bg-emerald-100 text-emerald-800'
                              : attendee.status === 'pending'
                              ? 'bg-surface-100 text-surface-600'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {attendee.status === 'pending' ? 'ABSENT' : attendee.status}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-red-600 max-w-xs truncate" title={attendee.rejection_reason || ''}>
                      {attendee.rejection_reason || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View (Stacked Cards) */}
        <div className="sm:hidden divide-y divide-surface-150 bg-white">
          {processedAttendees.length === 0 ? (
            <div className="text-center py-8 text-xs text-surface-400 italic">No matching attendees found.</div>
          ) : (
            processedAttendees.map((attendee) => (
              <div key={attendee.user_id} className={`p-4 space-y-3.5 hover:bg-surface-50/20 ${attendee.status === 'rejected' ? 'bg-red-50/30' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-surface-900 text-sm">{attendee.name}</h4>
                    {attendee.category === 'student' && attendee.usn_employee_id && (
                      <span className="text-[10px] text-surface-500 font-medium block mt-0.5">
                        SRN: <span className="font-mono">{attendee.usn_employee_id.replace(/^SRN:\s*/i, '')}</span>
                      </span>
                    )}
                    <span className="text-[10px] text-surface-400 block">{attendee.role}</span>
                  </div>
                  {attendee.status === 'rejected' ? (
                    <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase bg-red-100 text-red-800 border border-red-300">
                      REJECTED (OUT OF RADIUS)
                    </span>
                  ) : (
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase ${
                        attendee.status === 'present'
                          ? 'bg-emerald-100 text-emerald-800'
                          : attendee.status === 'pending'
                          ? 'bg-surface-100 text-surface-600'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {attendee.status === 'pending' ? 'ABSENT' : attendee.status}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1.5 border-t border-surface-100">
                  <div>
                    <span className="text-surface-400 block text-[10px] uppercase">Time Logged</span>
                    <span className="font-semibold text-surface-700">
                      {attendee.check_in_time
                        ? new Date(attendee.check_in_time).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-surface-400 block text-[10px] uppercase">GPS Status</span>
                    <span className="font-semibold text-surface-700">
                      {attendee.status === 'pending' ? '—' : attendee.gps_status}
                    </span>
                  </div>
                  {attendee.distance !== null && (
                    <div className="col-span-2">
                      <span className="text-surface-400 block text-[10px] uppercase">Distance from Faculty</span>
                      <span className="font-semibold text-surface-700">{attendee.distance} meters</span>
                    </div>
                  )}
                  {attendee.rejection_reason && (
                    <div className="col-span-2 bg-red-50 p-2 rounded-xl border border-red-100 text-red-700 mt-1">
                      <span className="text-[10px] uppercase block font-semibold">Rejection Details</span>
                      <span>{attendee.rejection_reason}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
