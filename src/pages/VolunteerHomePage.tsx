import { Card } from '@/components/ui';
import { Tent, Camera, Clock } from 'lucide-react';

/**
 * Volunteer home page — shows assigned camp and current activity.
 * Will be populated in later phases when camp assignment is implemented.
 */
export function VolunteerHomePage() {
  return (
    <div className="space-y-6">
      {/* ─── Activity Banner ─── */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-5 text-white shadow-lg shadow-primary-600/20">
        <p className="text-xs font-medium text-primary-200 uppercase tracking-wider">Active Camp</p>
        <h2 className="text-lg font-bold mt-1">Legal Awareness Camp</h2>
        <div className="mt-3 border-t border-white/20 pt-3">
          <p className="text-xs font-medium text-primary-200 uppercase tracking-wider">Current Activity</p>
          <p className="text-base font-semibold mt-0.5">No activity selected</p>
        </div>
      </div>

      {/* ─── Quick Actions ─── */}
      <div className="grid grid-cols-2 gap-4">
        <Card hover className="text-center">
          <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center mx-auto mb-3">
            <Camera className="w-6 h-6 text-primary-600" />
          </div>
          <p className="text-sm font-semibold text-surface-900">Capture Photo</p>
          <p className="text-xs text-surface-500 mt-1">Document activity</p>
        </Card>
        <Card hover className="text-center">
          <div className="w-12 h-12 rounded-xl bg-accent-50 flex items-center justify-center mx-auto mb-3">
            <Tent className="w-6 h-6 text-accent-600" />
          </div>
          <p className="text-sm font-semibold text-surface-900">Change Activity</p>
          <p className="text-xs text-surface-500 mt-1">Switch context</p>
        </Card>
      </div>

      {/* ─── Recent Submissions ─── */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-surface-400" />
          <h3 className="text-sm font-semibold text-surface-800">Recent Submissions</h3>
        </div>
        <p className="text-sm text-surface-500 text-center py-6">
          No submissions yet. Capture photos to get started.
        </p>
      </Card>
    </div>
  );
}
