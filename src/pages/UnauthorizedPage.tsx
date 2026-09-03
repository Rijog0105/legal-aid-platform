import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { ROUTES } from '@/constants';

export function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50 p-6">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 sm:p-10 text-center max-w-md w-full animate-fade-in space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center mx-auto shadow-xs">
          <ShieldAlert size={32} />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Access Restricted</h1>
        <p className="text-xs text-slate-500 leading-relaxed">
          Your institutional account does not have sufficient role permissions to view this resource. If you believe this is an error, please reach out to your Faculty Coordinator.
        </p>
        <div className="pt-2">
          <button
            onClick={() => navigate(ROUTES.HOME)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Return to Portal Home</span>
          </button>
        </div>
      </div>
    </div>
  );
}
