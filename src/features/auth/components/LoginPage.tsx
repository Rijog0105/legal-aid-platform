import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Eye, EyeOff, Mail, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ROLES, ROUTES } from '@/constants';

/* ─── Validation Schema ────────────────────────────────────── */
const loginSchema = z.object({
  email: z.string().min(1, 'Institutional email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required').min(6, 'Password must be at least 6 characters'),
});
type LoginFormValues = z.infer<typeof loginSchema>;

/* ─── Role-based Redirect Helper ─────────────────────────── */
function getHomeRoute(roleName: string | null): string {
  if (roleName === ROLES.VOLUNTEER) return ROUTES.VOLUNTEER_HOME;
  if (roleName === ROLES.TEAM_LEAD) return ROUTES.TEAM_LEAD_WORKSPACE;
  if (roleName === ROLES.FACULTY || roleName === ROLES.ADMIN) return ROUTES.DASHBOARD;
  return ROUTES.UNAUTHORIZED;
}

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isInitialized, isLoading, roleName, authError, clearAuthError } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    if (isInitialized && !isLoading && isAuthenticated && roleName) {
      const targetRoute = getHomeRoute(roleName);
      navigate(targetRoute, { replace: true });
    }
  }, [isInitialized, isLoading, isAuthenticated, roleName, navigate]);

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    clearAuthError();
    const result = await login(values.email.trim(), values.password);
    if (!result.success) {
      setServerError(result.error ?? 'Sign-in failed. Please check your credentials and try again.');
      return;
    }
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] flex flex-col justify-center items-center px-4 py-8 sm:px-6 relative overflow-hidden font-sans">
      {/* Subtle Ambient Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-80 bg-gradient-to-b from-orange-100/30 via-indigo-50/20 to-transparent blur-3xl pointer-events-none -z-10" />

      <div className="w-full max-w-[440px] space-y-6 relative z-10">
        {/* Brand Header with Official REVA Logo */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-sm border border-slate-200/80">
            <img
              src="/reva-logo.png"
              alt="REVA University Logo"
              className="h-12 sm:h-14 w-auto object-contain"
            />
          </div>
          <div className="space-y-0.5">
            <p className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider">
              School of Legal Studies
            </p>
            <p className="text-[11px] font-semibold text-slate-400">
              Legal Aid Clinic & Fieldwork Operations Platform
            </p>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-9 shadow-[0_12px_40px_-10px_rgba(0,0,0,0.06)] space-y-6">
          <div className="space-y-1 text-center sm:text-left">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Sign In to Portal</h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              Enter your institutional credentials to access your legal aid workspace.
            </p>
          </div>

          {/* Error Alert */}
          {(serverError || authError) && (
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50/90 border border-red-200/90 text-red-800 text-xs animate-fade-in">
              <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-semibold">{serverError ?? authError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Institutional Email <span className="text-red-500">*</span>
              </label>
              <div
                className={`relative flex items-center rounded-2xl border bg-slate-50/50 hover:bg-white focus-within:bg-white focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all ${
                  errors.email ? 'border-red-400 bg-red-50/30 ring-2 ring-red-400/20' : 'border-slate-200'
                }`}
              >
                <div className="pl-4 pr-1 text-slate-400 pointer-events-none flex items-center">
                  <Mail size={17} />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@university.edu"
                  {...register('email')}
                  className="w-full px-3 py-3 rounded-2xl text-sm font-semibold bg-transparent text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none"
                />
              </div>
              {errors.email && (
                <p className="text-[11px] font-semibold text-red-600 pl-1">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Password <span className="text-red-500">*</span>
              </label>
              <div
                className={`relative flex items-center rounded-2xl border bg-slate-50/50 hover:bg-white focus-within:bg-white focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all ${
                  errors.password ? 'border-red-400 bg-red-50/30 ring-2 ring-red-400/20' : 'border-slate-200'
                }`}
              >
                <div className="pl-4 pr-1 text-slate-400 pointer-events-none flex items-center">
                  <Lock size={17} />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register('password')}
                  className="w-full px-3 py-3 rounded-2xl text-sm font-semibold bg-transparent text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((v) => !v)}
                  className="pr-3.5 pl-2 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[11px] font-semibold text-red-600 pl-1">{errors.password.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold text-sm shadow-lg shadow-indigo-600/25 disabled:opacity-60 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Verifying credentials…</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Portal</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Registration Switch Link */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 text-center sm:text-left">
            <span>New to the legal clinic?</span>
            <Link
              to={ROUTES.REGISTER}
              className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline inline-flex items-center gap-1"
            >
              Create an Account
            </Link>
          </div>
        </div>

        {/* Security Trust Badge */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-400">
            <ShieldCheck size={14} className="text-slate-400" />
            <span>Role-Based Access Control • Version 1.0.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
