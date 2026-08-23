import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Scale, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ROLES, ROUTES } from '@/constants';

/* ─── Validation ─────────────────────────────────────────── */
const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
type LoginFormValues = z.infer<typeof loginSchema>;

/* ─── Role-based redirect helper ────────────────────────── */
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

  /* Redirect already-authenticated users once profile and role are resolved */
  useEffect(() => {
    console.log('[LoginPage] useEffect RENDER CHECK — isInitialized:', isInitialized, '| isLoading:', isLoading, '| isAuthenticated:', isAuthenticated, '| roleName:', roleName);
    if (isInitialized && !isLoading && isAuthenticated && roleName) {
      const targetRoute = getHomeRoute(roleName);
      console.log('[LoginPage] → EXECUTING NAVIGATION TO:', targetRoute, 'for roleName:', roleName);
      navigate(targetRoute, { replace: true });
    } else {
      console.log('[LoginPage] → NOT NAVIGATING YET. Waiting for isInitialized && !isLoading && isAuthenticated && roleName');
    }
  }, [isInitialized, isLoading, isAuthenticated, roleName, navigate]);

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    clearAuthError();
    const result = await login(values.email, values.password);
    if (!result.success) {
      setServerError(result.error ?? 'Sign-in failed. Please try again.');
      return;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center py-16 px-4">
      {/* Centered Shared Container Wrapper */}
      <div className="w-full max-w-xl flex flex-col items-center">
        
        {/* Branding Header Area with matching card paddings */}
        <div className="w-full flex flex-col sm:flex-row justify-between items-center mb-8 px-8 sm:px-12 md:px-16 gap-4">
          {/* REVA University Branding */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-3xl sm:text-4xl font-extrabold text-[#F37021] tracking-tight">REVA</span>
            <span className="text-3xl sm:text-4xl font-semibold text-slate-800 tracking-tight">University</span>
          </div>

          {/* Civic Forge Labs / Product Branding */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shrink-0 shadow-md">
              <Scale size={20} className="text-white" />
            </div>
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight whitespace-nowrap">
              Civic Forge Labs
            </span>
          </div>
        </div>

        {/* Centered Floating Card */}
        <div className="w-full bg-white rounded-[32px] border border-surface-200 shadow-md py-10 sm:py-12 md:py-14">
          
          {/* Inner content wrapper - strictly controls horizontal spacing inside card */}
          <div className="px-8 sm:px-12 md:px-16 w-full">
            
            {/* Title / Subtitle */}
            <div className="text-center mb-10">
              <h2 className="text-3xl font-extrabold text-slate-900 mb-2">Legal Aid Camp Platform</h2>
              <p className="text-base text-slate-500">Sign in to continue to the platform</p>
            </div>

            {/* Error alert */}
            {(serverError || authError) && (
              <div className="flex items-start gap-3 p-4 mb-6 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm leading-relaxed">
                <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
                <span>{serverError ?? authError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
              {/* Email field */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@reva.edu.in"
                  {...register('email')}
                  className={`w-full px-4 py-3 rounded-xl border text-base bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all ${
                    errors.email ? 'border-red-500' : 'border-slate-300'
                  }`}
                />
                {errors.email && (
                  <p className="text-xs text-red-600 mt-1.5">{errors.email.message}</p>
                )}
              </div>

              {/* Password field */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    {...register('password')}
                    className={`w-full px-4 py-3 pr-12 rounded-xl border text-base bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all ${
                      errors.password ? 'border-red-500' : 'border-slate-300'
                    }`}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer flex items-center"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-600 mt-1.5">{errors.password.message}</p>
                )}
              </div>

              {/* Sign In button */}
              <div className="pt-4">
                <button
                  id="btn-login-submit"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 px-5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-base shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2.5"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </div>
            </form>

            {/* Bottom Register Link */}
            <p className="text-sm text-slate-500 text-center mt-8">
              Don't have an account?{' '}
              <Link to={ROUTES.REGISTER} className="font-bold text-primary-600 hover:underline">
                Register here
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
