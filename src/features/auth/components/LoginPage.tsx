import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  return ROUTES.DASHBOARD;
}

/* ─── Stats (static display) ─────────────────────────────── */
const stats = [
  { value: '12+', label: 'Camps Documented' },
  { value: '480+', label: 'Beneficiaries Served' },
  { value: '100%', label: 'Report Automation' },
];

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isInitialized, roleName } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  /* Redirect already-authenticated users */
  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      navigate(getHomeRoute(roleName), { replace: true });
    }
  }, [isInitialized, isAuthenticated, roleName, navigate]);

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    const result = await login(values.email, values.password);
    if (!result.success) {
      setServerError(result.error ?? 'Sign-in failed. Please try again.');
      return;
    }
    /* Navigation is handled by the useEffect above once the auth
       store updates isAuthenticated + roleName after the listener fires. */
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel ── */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2340 40%, #0a1628 100%)',
        }}
      >
        {/* Background decorative circles */}
        <div
          style={{
            position: 'absolute', top: '-80px', right: '-80px',
            width: '320px', height: '320px', borderRadius: '50%',
            background: 'rgba(99,179,237,0.08)',
          }}
        />
        <div
          style={{
            position: 'absolute', bottom: '-60px', left: '-60px',
            width: '240px', height: '240px', borderRadius: '50%',
            background: 'rgba(99,179,237,0.06)',
          }}
        />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div
            style={{
              width: '44px', height: '44px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #63b3ed, #3182ce)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Scale size={22} color="white" />
          </div>
          <div>
            <p style={{ color: 'white', fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>
              Legal Aid Camp Platform
            </p>
            <p style={{ color: 'rgba(147,197,253,0.8)', fontSize: '0.75rem' }}>
              Documentation & Reporting
            </p>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10">
          <h1
            style={{
              color: 'white', fontSize: '2.5rem', fontWeight: 800,
              lineHeight: 1.15, marginBottom: '1.25rem',
            }}
          >
            Streamline camp<br />
            <span style={{ color: '#63b3ed' }}>management</span> &amp;<br />
            automate reports.
          </h1>
          <p style={{ color: 'rgba(147,197,253,0.75)', fontSize: '1rem', lineHeight: 1.7, maxWidth: '380px' }}>
            One platform to document legal aid camps, track activities, manage volunteers,
            and generate institutional reports — automatically.
          </p>

          {/* Stats */}
          <div style={{ display: 'flex', gap: '2rem', marginTop: '2.5rem' }}>
            {stats.map((stat) => (
              <div key={stat.label}>
                <p style={{ color: 'white', fontSize: '1.75rem', fontWeight: 800, lineHeight: 1 }}>
                  {stat.value}
                </p>
                <p style={{ color: 'rgba(147,197,253,0.7)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p style={{ color: 'rgba(147,197,253,0.5)', fontSize: '0.75rem' }} className="relative z-10">
          Legal Aid &amp; Awareness Committee · University Legal Services Clinic
        </p>
      </div>

      {/* ── Right panel (form) ── */}
      <div
        className="flex-1 flex items-center justify-center p-6 lg:p-12"
        style={{ background: '#f8fafc' }}
      >
        <div style={{ width: '100%', maxWidth: '420px' }}>
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div
              style={{
                width: '36px', height: '36px', borderRadius: '8px',
                background: 'linear-gradient(135deg, #63b3ed, #3182ce)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Scale size={18} color="white" />
            </div>
            <span style={{ fontWeight: 700, color: '#1e3a5f', fontSize: '0.95rem' }}>
              Legal Aid Camp Platform
            </span>
          </div>

          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
            Welcome back
          </h2>
          <p style={{ color: '#64748b', marginBottom: '2rem', fontSize: '0.95rem' }}>
            Sign in to continue to the platform
          </p>

          {/* Error alert */}
          {serverError && (
            <div
              role="alert"
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.625rem',
                padding: '0.875rem 1rem', borderRadius: '10px', marginBottom: '1.25rem',
                background: '#fef2f2', border: '1px solid #fecaca',
              }}
            >
              <AlertCircle size={16} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
              <p style={{ color: '#991b1b', fontSize: '0.875rem', lineHeight: 1.5 }}>{serverError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@institution.edu"
                {...register('email')}
                style={{
                  width: '100%', padding: '0.75rem 1rem', borderRadius: '10px',
                  border: errors.email ? '1.5px solid #dc2626' : '1.5px solid #e2e8f0',
                  fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box',
                  background: 'white', color: '#0f172a',
                  transition: 'border-color 0.15s',
                }}
              />
              {errors.email && (
                <p style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '0.375rem' }}>
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register('password')}
                  style={{
                    width: '100%', padding: '0.75rem 3rem 0.75rem 1rem', borderRadius: '10px',
                    border: errors.password ? '1.5px solid #dc2626' : '1.5px solid #e2e8f0',
                    fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box',
                    background: 'white', color: '#0f172a',
                    transition: 'border-color 0.15s',
                  }}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    position: 'absolute', right: '0.875rem', top: '50%',
                    transform: 'translateY(-50%)', background: 'none',
                    border: 'none', cursor: 'pointer', padding: '0', color: '#94a3b8',
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '0.375rem' }}>
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              id="btn-login-submit"
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%', padding: '0.875rem',
                borderRadius: '10px', border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer',
                background: isSubmitting
                  ? '#94a3b8'
                  : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: 'white', fontWeight: 700, fontSize: '1rem',
                transition: 'opacity 0.15s, background 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              }}
            >
              {isSubmitting ? (
                <>
                  <span
                    style={{
                      width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.4)',
                      borderTopColor: 'white', borderRadius: '50%',
                      animation: 'spin 0.7s linear infinite', display: 'inline-block',
                    }}
                  />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p style={{ color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center', marginTop: '2rem' }}>
            Contact your administrator to create an account.
          </p>
        </div>
      </div>

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
