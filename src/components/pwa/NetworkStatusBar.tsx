import { useSyncStore } from '@/store/syncStore';
import { useSyncEngine } from '@/hooks/useSyncEngine';
import { WifiOff, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';

export function NetworkStatusBar() {
  const { syncState, pendingCount, failedCount } = useSyncStore();
  const { triggerManualRetry } = useSyncEngine();

  // If online and nothing is pending or failed: Hidden
  if (syncState === 'idle' && pendingCount === 0 && failedCount === 0) {
    return null;
  }

  let text = '';
  let bgColor = 'bg-slate-800';
  let icon = null;
  let actionButton = null;

  if (syncState === 'offline') {
    bgColor = 'bg-slate-700 dark:bg-slate-900 border-t border-slate-600';
    icon = <WifiOff className="w-4.5 h-4.5 text-slate-300" />;
    if (pendingCount > 0) {
      text = 'Saved offline — will sync when reconnected';
    } else {
      text = 'Offline — changes saved locally';
    }
  } else if (syncState === 'syncing') {
    bgColor = 'bg-indigo-600 border-t border-indigo-500';
    icon = <RefreshCw className="w-4.5 h-4.5 animate-spin text-white" />;
    text = 'Syncing…';
  } else if (syncState === 'success') {
    bgColor = 'bg-emerald-600 border-t border-emerald-500';
    icon = <CheckCircle2 className="w-4.5 h-4.5 text-white" />;
    text = 'All changes synced ✓';
  } else if (syncState === 'failed' || failedCount > 0) {
    bgColor = 'bg-rose-600 border-t border-rose-500';
    icon = <AlertTriangle className="w-4.5 h-4.5 text-white" />;
    text = 'Some submissions need attention';
    actionButton = (
      <button
        onClick={triggerManualRetry}
        className="px-3 py-1 bg-white hover:bg-slate-100 text-rose-700 font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
      >
        Retry
      </button>
    );
  } else if (pendingCount > 0) {
    bgColor = 'bg-indigo-500 border-t border-indigo-400';
    icon = <RefreshCw className="w-4.5 h-4.5 text-indigo-100 animate-pulse" />;
    text = 'Saved offline — will sync when reconnected';
  } else {
    return null;
  }

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 px-4 py-3 ${bgColor} text-white text-xs font-semibold flex items-center justify-between gap-3 shadow-2xl transition-all duration-300 pb-safe`}>
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="shrink-0">{icon}</div>
        <span className="truncate pr-2">{text}</span>
      </div>
      {actionButton && (
        <div className="shrink-0">
          {actionButton}
        </div>
      )}
    </div>
  );
}
