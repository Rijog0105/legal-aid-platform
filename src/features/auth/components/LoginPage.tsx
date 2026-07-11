import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Scale, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Button, Input } from '@/components/ui';
import { ROUTES } from '@/constants';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setAuthError(null);
    const result = await login(data.email, data.password);
    if (result.success) {
      // The auth listener will update state; redirect after a tick
      setTimeout(() => navigate(ROUTES.DASHBOARD), 100);
    } else {
      setAuthError(result.error || 'Login failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ─── Left: Decorative Panel ─── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-primary-600">
        {/* Decorative circles */}
        <div className="absolute top-20 -left-20 w-80 h-80 rounded-full bg-primary-500/20 blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-accent-500/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-primary-400/10 blur-2xl" />

        <div className="relative z-10 flex flex-col justify-center p-16 text-white">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-8">
            <Scale className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Legal Aid Camp
            <br />
            <span className="text-primary-200">Documentation Platform</span>
          </h1>
          <p className="text-primary-200/80 text-lg max-w-md leading-relaxed">
            Streamline camp management, automate documentation, and generate institutional reports — all in one place.
          </p>

          <div className="mt-12 grid grid-cols-3 gap-6">
            {[
              { label: 'Camps', value: 'Managed' },
              { label: 'Reports', value: 'Automated' },
              { label: 'Documentation', value: 'Simplified' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-primary-300 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Right: Login Form ─── */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-surface-900">Legal Aid Camp</span>
          </div>

          <h2 className="text-2xl font-bold text-surface-900 mb-1">Welcome back</h2>
          <p className="text-surface-500 text-sm mb-8">
            Sign in to continue to the platform
          </p>

          {authError && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              {authError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label="Email"
              type="email"
              placeholder="you@university.edu"
              error={errors.email?.message}
              autoComplete="email"
              {...register('email')}
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                error={errors.password?.message}
                autoComplete="current-password"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-[38px] text-surface-400 hover:text-surface-600 transition-colors cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <Button
              type="submit"
              fullWidth
              size="lg"
              isLoading={isLoading}
            >
              Sign In
            </Button>
          </form>

          <p className="text-xs text-surface-400 text-center mt-8">
            Legal Aid & Awareness Committee · University Legal Services Clinic
          </p>
        </div>
      </div>
    </div>
  );
}
