import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Scale, AlertCircle, Eye, EyeOff, CheckCircle2, ArrowLeft } from 'lucide-react';
import { registerUser } from '@/features/auth/services/registrationService';
import { ROUTES } from '@/constants';

const registerSchema = z
  .object({
    full_name: z.string().min(2, 'Full name must be at least 2 characters'),
    email: z
      .string()
      .email('Enter a valid college email address')
      .refine(
        (val) => val.endsWith('.edu') || val.includes('@') || val.includes('.ac.in'),
        'Please use your institutional college email'
      ),
    phone: z.string().min(10, 'Enter a valid 10-digit phone number'),
    category: z.enum(['student', 'faculty']),
    usn_employee_id: z.string().min(2, 'USN / Employee ID is required'),
    department: z.string().min(2, 'Department is required'),
    semester: z.string().optional(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      category: 'student',
      department: 'Law',
      semester: 'Sem 6',
    },
  });

  const selectedCategory = watch('category');

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);
    const result = await registerUser({
      full_name: values.full_name,
      email: values.email,
      phone: values.phone,
      category: values.category,
      usn_employee_id: values.usn_employee_id,
      department: values.department,
      semester: values.semester,
      password: values.password,
    });

    if (!result.success) {
      setServerError(result.error ?? 'Registration failed. Please try again.');
      return;
    }

    setIsSubmittedSuccess(true);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel - Decorative Branding */}
      <div
        className="hidden lg:flex lg:w-5/12 flex-col justify-between p-12 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2340 40%, #0a1628 100%)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-80px',
            right: '-80px',
            width: '320px',
            height: '320px',
            borderRadius: '50%',
            background: 'rgba(99,179,237,0.08)',
          }}
        />

        <div className="flex items-center gap-3 relative z-10">
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #63b3ed, #3182ce)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Scale size={22} color="white" />
          </div>
          <div>
            <p style={{ color: 'white', fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>
              Legal Aid Camp Platform
            </p>
            <p style={{ color: 'rgba(147,197,253,0.8)', fontSize: '0.75rem' }}>
              Identity & Onboarding
            </p>
          </div>
        </div>

        <div className="relative z-10">
          <h1
            style={{
              color: 'white',
              fontSize: '2.25rem',
              fontWeight: 800,
              lineHeight: 1.2,
              marginBottom: '1rem',
            }}
          >
            Join the Legal Aid<br />
            <span style={{ color: '#63b3ed' }}>Camp Network</span>.
          </h1>
          <p style={{ color: 'rgba(147,197,253,0.75)', fontSize: '0.95rem', lineHeight: 1.6, maxWidth: '380px' }}>
            Register as a Student Volunteer or Faculty Coordinator to participate in legal awareness camps and automated reporting.
          </p>

          <div className="mt-8 p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-xs text-blue-200">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <span>Single Account for Field Capture &amp; Reporting</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-blue-200">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <span>Verified Institutional Access</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-blue-200">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <span>Faculty/Admin Approval Security</span>
            </div>
          </div>
        </div>

        <p style={{ color: 'rgba(147,197,253,0.5)', fontSize: '0.75rem' }} className="relative z-10">
          Legal Aid &amp; Awareness Committee · University Legal Services Clinic
        </p>
      </div>

      {/* Right panel - Registration Form or Success Screen */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-slate-50 overflow-y-auto">
        <div style={{ width: '100%', maxWidth: '520px' }} className="py-6">
          {isSubmittedSuccess ? (
            <div className="bg-white p-8 rounded-3xl border border-surface-200 shadow-sm text-center space-y-5 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 size={36} />
              </div>
              <h2 className="text-2xl font-bold text-surface-900">Registration Submitted!</h2>
              <p className="text-sm text-surface-600 leading-relaxed max-w-md mx-auto">
                Thank you for registering. Your request has been sent for approval. Your account will become active once verified by a Faculty Coordinator or Administrator.
              </p>
              <div className="p-4 rounded-2xl bg-surface-50 border border-surface-200 text-xs text-surface-500 text-left space-y-1">
                <p><span className="font-semibold text-surface-700">Status:</span> Pending Verification</p>
                <p><span className="font-semibold text-surface-700">Next Step:</span> You can sign in once your account is approved.</p>
              </div>
              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => navigate(ROUTES.LOGIN)}
                  className="w-full py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
                >
                  Return to Login
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Back to Login link */}
              <Link
                to={ROUTES.LOGIN}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-surface-500 hover:text-primary-600 mb-6 transition-colors"
              >
                <ArrowLeft size={14} /> Back to Sign In
              </Link>

              <h2 className="text-2xl font-extrabold text-slate-900 mb-1">Create an Account</h2>
              <p className="text-sm text-slate-500 mb-6">
                Register as a Student or Faculty member to get started.
              </p>

              {serverError && (
                <div className="flex items-start gap-2.5 p-3.5 mb-5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs leading-relaxed">
                  <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
                  <span>{serverError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                {/* Category Selection Tabs */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    I am registering as a
                  </label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-200/70 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setValue('category', 'student')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        selectedCategory === 'student'
                          ? 'bg-white text-primary-700 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Student Volunteer
                    </button>
                    <button
                      type="button"
                      onClick={() => setValue('category', 'faculty')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        selectedCategory === 'faculty'
                          ? 'bg-white text-primary-700 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Faculty Member
                    </button>
                  </div>
                </div>

                {/* Full Name */}
                <div>
                  <label htmlFor="full_name" className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="full_name"
                    type="text"
                    placeholder="e.g. Ananya Sharma"
                    {...register('full_name')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
                  />
                  {errors.full_name && (
                    <p className="text-xs text-red-600 mt-1">{errors.full_name.message}</p>
                  )}
                </div>

                {/* Grid: Email & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1">
                      College Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      placeholder="name@university.edu"
                      {...register('email')}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
                    />
                    {errors.email && (
                      <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-xs font-semibold text-slate-700 mb-1">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      placeholder="9876543210"
                      {...register('phone')}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
                    />
                    {errors.phone && (
                      <p className="text-xs text-red-600 mt-1">{errors.phone.message}</p>
                    )}
                  </div>
                </div>

                {/* Grid: USN/EmpID & Department */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="usn_employee_id" className="block text-xs font-semibold text-slate-700 mb-1">
                      {selectedCategory === 'faculty' ? 'Employee ID' : 'USN (University Seat No)'}{' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="usn_employee_id"
                      type="text"
                      placeholder={selectedCategory === 'faculty' ? 'EMP-1042' : '1UL21LAW045'}
                      {...register('usn_employee_id')}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
                    />
                    {errors.usn_employee_id && (
                      <p className="text-xs text-red-600 mt-1">{errors.usn_employee_id.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="department" className="block text-xs font-semibold text-slate-700 mb-1">
                      Department <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="department"
                      type="text"
                      placeholder="e.g. School of Law"
                      {...register('department')}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
                    />
                    {errors.department && (
                      <p className="text-xs text-red-600 mt-1">{errors.department.message}</p>
                    )}
                  </div>
                </div>

                {/* Semester (Optional for Faculty) */}
                <div>
                  <label htmlFor="semester" className="block text-xs font-semibold text-slate-700 mb-1">
                    Semester {selectedCategory === 'student' && <span className="text-red-500">*</span>}
                    {selectedCategory === 'faculty' && <span className="text-slate-400 font-normal"> (Optional)</span>}
                  </label>
                  <input
                    id="semester"
                    type="text"
                    placeholder={selectedCategory === 'faculty' ? 'N/A' : 'Semester 6'}
                    {...register('semester')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
                  />
                  {errors.semester && (
                    <p className="text-xs text-red-600 mt-1">{errors.semester.message}</p>
                  )}
                </div>

                {/* Grid: Password & Confirm Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="password" className="block text-xs font-semibold text-slate-700 mb-1">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        {...register('password')}
                        className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-xs font-semibold text-slate-700 mb-1">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      {...register('confirmPassword')}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
                    />
                    {errors.confirmPassword && (
                      <p className="text-xs text-red-600 mt-1">{errors.confirmPassword.message}</p>
                    )}
                  </div>
                </div>

                {/* Submit button */}
                <div className="pt-2">
                  <button
                    id="btn-register-submit"
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-bold text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Submitting Registration…
                      </>
                    ) : (
                      'Submit Registration'
                    )}
                  </button>
                </div>

                <p className="text-xs text-slate-500 text-center pt-2">
                  Already registered?{' '}
                  <Link to={ROUTES.LOGIN} className="font-bold text-primary-600 hover:underline">
                    Sign in here
                  </Link>
                </p>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
