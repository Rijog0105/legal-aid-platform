import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowLeft,
  User,
  Mail,
  Phone,
  GraduationCap,
  Award,
  Lock,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { confirmSignupCode, registerUser, resendSignupCode } from '@/features/auth/services/registrationService';
import { ROUTES } from '@/constants';

const registerSchema = z
  .object({
    category: z.enum(['student', 'faculty']),
    full_name: z
      .string()
      .min(1, 'Full Name is required')
      .min(2, 'Full Name must be at least 2 characters'),
    email: z
      .string()
      .min(1, 'College Email is required')
      .email('Enter a valid email address')
      .refine(
        (val) =>
          val.includes('@') &&
          (val.endsWith('.edu') ||
            val.includes('.ac.in') ||
            val.includes('.edu.in') ||
            val.includes('@reva') ||
            val.includes('@student') ||
            val.includes('@university')),
        'Please use your institutional or college email address'
      ),
    phone: z
      .string()
      .min(1, 'Phone Number is required')
      .min(10, 'Enter a valid 10-digit phone number'),
    usn_employee_id: z.string().optional(),
    department: z.string().min(1, 'Department / School is required'),
    semester: z.string().optional(),
    designation: z.string().optional(),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Confirm Password is required'),
  })
  .superRefine((data, ctx) => {
    if (data.category === 'student') {
      if (!data.usn_employee_id || !data.usn_employee_id.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'SRN / Roll Number is required for students',
          path: ['usn_employee_id'],
        });
      }
      if (!data.semester || !data.semester.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Semester is required',
          path: ['semester'],
        });
      }
    } else if (data.category === 'faculty') {
      if (!data.designation || !data.designation.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Designation is required for faculty',
          path: ['designation'],
        });
      }
    }

    if (data.password && data.confirmPassword && data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Passwords do not match',
        path: ['confirmPassword'],
      });
    }
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ email: string; category: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
      full_name: '',
      email: '',
      phone: '',
      usn_employee_id: '',
      department: 'School of Legal Studies',
      semester: 'Semester 1',
      designation: 'Assistant Professor',
      password: '',
      confirmPassword: '',
    },
  });

  const selectedCategory = watch('category');

  const [confirmCode, setConfirmCode] = useState('');
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmInfo, setConfirmInfo] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [emailConfirmed, setEmailConfirmed] = useState(false);

  const handleConfirmCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!successData) return;
    setConfirmError(null);
    setConfirmInfo(null);
    if (!/^\d{6,10}$/.test(confirmCode)) {
      setConfirmError('Enter the numeric code from the email.');
      return;
    }
    setIsConfirming(true);
    const result = await confirmSignupCode(successData.email, confirmCode);
    setIsConfirming(false);
    if (!result.success) {
      setConfirmError(result.error ?? 'Verification failed.');
      return;
    }
    setEmailConfirmed(true);
  };

  const handleResendCode = async () => {
    if (!successData) return;
    setConfirmError(null);
    setConfirmInfo(null);
    setIsConfirming(true);
    const result = await resendSignupCode(successData.email);
    setIsConfirming(false);
    if (!result.success) {
      setConfirmError(result.error ?? 'Could not resend the code.');
      return;
    }
    setConfirmInfo('A new code has been sent.');
  };

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);
    try {
      const result = await registerUser({
        email: values.email.trim(),
        password: values.password,
        full_name: values.full_name.trim(),
        category: values.category,
        phone: values.phone.trim(),
        usn_employee_id: values.usn_employee_id ? values.usn_employee_id.trim() : undefined,
        department: values.department.trim(),
        semester: values.category === 'student' ? values.semester?.trim() : undefined,
        designation: values.category === 'faculty' ? values.designation?.trim() : undefined,
      });

      if (!result.success) {
        setServerError(result.error ?? 'Registration failed. Please verify your entries and try again.');
        return;
      }

      setSuccessData({ email: values.email.trim(), category: values.category });
    } catch (err) {
      console.error('Registration error:', err);
      setServerError('An unexpected error occurred during registration. Please try again.');
    }
  };

  /* ─── Success Confirmation Screen ─── */
  if (successData) {
    return (
      <div className="min-h-screen bg-[#fafbfc] flex items-center justify-center px-4 py-8 sm:px-6 relative overflow-hidden font-sans">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-80 bg-gradient-to-b from-orange-100/30 via-indigo-50/20 to-transparent blur-3xl pointer-events-none -z-10" />

        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-10 max-w-md w-full text-center space-y-6 shadow-[0_12px_40px_-10px_rgba(0,0,0,0.06)]">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm ring-4 ring-emerald-50/60">
            <CheckCircle2 size={32} />
          </div>

          {emailConfirmed ? (
            <>
              <div className="space-y-1.5">
                <h2 className="text-xl font-bold text-slate-900">Email Confirmed</h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  <strong className="text-slate-800 font-semibold">{successData.email}</strong> has been verified.
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-left text-xs space-y-2.5">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-indigo-600 shrink-0" />
                  <span>Next Step</span>
                </p>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Your faculty coordinator will now approve your account. You can sign in once it is approved.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <h2 className="text-xl font-bold text-slate-900">Confirm Your Email</h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  We sent a verification code to <strong className="text-slate-800 font-semibold">{successData.email}</strong>. Enter it below.
                </p>
              </div>

              {confirmError && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-red-50/90 border border-red-200/90 text-red-800 text-xs text-left">
                  <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-semibold">{confirmError}</span>
                </div>
              )}
              {confirmInfo && !confirmError && (
                <p className="text-xs font-semibold text-indigo-700">{confirmInfo}</p>
              )}

              <form onSubmit={handleConfirmCode} noValidate className="space-y-3">
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="Enter code"
                  maxLength={10}
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3.5 py-3 rounded-2xl border border-slate-200 text-center text-base font-bold tracking-[0.3em] bg-slate-50/50 focus:bg-white text-slate-900 placeholder:text-slate-400 placeholder:font-normal placeholder:tracking-normal focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                />
                <button
                  type="submit"
                  disabled={isConfirming}
                  className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold text-xs shadow-lg shadow-indigo-600/20 disabled:opacity-60 transition-all cursor-pointer flex items-center justify-center"
                >
                  {isConfirming ? 'Verifying…' : 'Confirm Email'}
                </button>
                <button
                  type="button"
                  disabled={isConfirming}
                  onClick={handleResendCode}
                  className="w-full text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer disabled:opacity-50"
                >
                  Didn&apos;t get a code? Resend
                </button>
              </form>
            </>
          )}

          <button
            onClick={() => navigate(ROUTES.LOGIN)}
            className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold text-xs shadow-lg shadow-indigo-600/20 transition-all cursor-pointer flex items-center justify-center"
          >
            Return to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafbfc] flex flex-col justify-center items-center px-4 py-8 sm:px-6 relative overflow-hidden font-sans">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-80 bg-gradient-to-b from-orange-100/30 via-indigo-50/20 to-transparent blur-3xl pointer-events-none -z-10" />

      <div className="w-full max-w-lg space-y-6 relative z-10">
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

        {/* Register Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-9 shadow-[0_12px_40px_-10px_rgba(0,0,0,0.06)] space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Create Account</h1>
              <p className="text-xs text-slate-500 mt-0.5">Register for legal aid fieldwork and coordination</p>
            </div>
            <Link
              to={ROUTES.LOGIN}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1 shrink-0"
            >
              <ArrowLeft size={13} /> Sign In
            </Link>
          </div>

          {serverError && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-red-50/90 border border-red-200/90 text-red-800 text-xs animate-fade-in">
              <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-semibold">{serverError}</span>
            </div>
          )}

          {/* Role Switcher */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setValue('category', 'student', { shouldValidate: true })}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-2 sm:px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === 'student'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap size={16} className="shrink-0" />
              <span className="truncate">Student Volunteer</span>
            </button>

            <button
              type="button"
              onClick={() => setValue('category', 'faculty', { shouldValidate: true })}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-2 sm:px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === 'faculty'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Award size={16} className="shrink-0" />
              <span className="truncate">Faculty Coordinator</span>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5 sm:space-y-6">
            {/* Full Name */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Full Name *</label>
              <div
                className={`relative flex items-center rounded-2xl border bg-slate-50/50 hover:bg-white focus-within:bg-white focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all ${
                  errors.full_name ? 'border-red-400 bg-red-50/30' : 'border-slate-200'
                }`}
              >
                <div className="pl-4 pr-1 text-slate-400 pointer-events-none flex items-center">
                  <User size={17} />
                </div>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  {...register('full_name')}
                  className="w-full px-3 py-3 rounded-2xl text-sm font-semibold bg-transparent text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none"
                />
              </div>
              {errors.full_name && <p className="text-[11px] font-semibold text-red-600 pl-1">{errors.full_name.message}</p>}
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">College Email *</label>
                <div
                  className={`relative flex items-center rounded-2xl border bg-slate-50/50 hover:bg-white focus-within:bg-white focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all ${
                    errors.email ? 'border-red-400 bg-red-50/30' : 'border-slate-200'
                  }`}
                >
                  <div className="pl-4 pr-1 text-slate-400 pointer-events-none flex items-center">
                    <Mail size={17} />
                  </div>
                  <input
                    type="email"
                    placeholder="name@university.edu"
                    {...register('email')}
                    className="w-full px-3 py-3 rounded-2xl text-sm font-semibold bg-transparent text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none"
                  />
                </div>
                {errors.email && <p className="text-[11px] font-semibold text-red-600 pl-1">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Phone Number *</label>
                <div
                  className={`relative flex items-center rounded-2xl border bg-slate-50/50 hover:bg-white focus-within:bg-white focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all ${
                    errors.phone ? 'border-red-400 bg-red-50/30' : 'border-slate-200'
                  }`}
                >
                  <div className="pl-4 pr-1 text-slate-400 pointer-events-none flex items-center">
                    <Phone size={17} />
                  </div>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    {...register('phone')}
                    className="w-full px-3 py-3 rounded-2xl text-sm font-semibold bg-transparent text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none"
                  />
                </div>
                {errors.phone && <p className="text-[11px] font-semibold text-red-600 pl-1">{errors.phone.message}</p>}
              </div>
            </div>

            {/* Role-Specific Fields */}
            {selectedCategory === 'student' ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">SRN / Roll No *</label>
                  <input
                    type="text"
                    placeholder="R22LA001"
                    {...register('usn_employee_id')}
                    className={`w-full px-3.5 py-3 rounded-2xl border text-sm font-semibold bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 transition-all ${
                      errors.usn_employee_id ? 'border-red-400 bg-red-50/30' : 'border-slate-200'
                    }`}
                  />
                  {errors.usn_employee_id && <p className="text-[11px] font-semibold text-red-600 pl-1">{errors.usn_employee_id.message}</p>}
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Semester *</label>
                  <select
                    {...register('semester')}
                    className="w-full px-3.5 py-3 rounded-2xl border border-slate-200 text-sm font-semibold bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 transition-all cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((sem) => (
                      <option key={sem} value={`Semester ${sem}`}>
                        Semester {sem}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Department *</label>
                  <input
                    type="text"
                    placeholder="School of Legal Studies"
                    {...register('department')}
                    className="w-full px-3.5 py-3 rounded-2xl border border-slate-200 text-sm font-semibold bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Designation *</label>
                  <input
                    type="text"
                    placeholder="Assistant Professor"
                    {...register('designation')}
                    className={`w-full px-3.5 py-3 rounded-2xl border text-sm font-semibold bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 transition-all ${
                      errors.designation ? 'border-red-400 bg-red-50/30' : 'border-slate-200'
                    }`}
                  />
                  {errors.designation && <p className="text-[11px] font-semibold text-red-600 pl-1">{errors.designation.message}</p>}
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Department / School *</label>
                  <input
                    type="text"
                    placeholder="School of Legal Studies"
                    {...register('department')}
                    className="w-full px-3.5 py-3 rounded-2xl border border-slate-200 text-sm font-semibold bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Password & Confirm */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Password *</label>
                <div
                  className={`relative flex items-center rounded-2xl border bg-slate-50/50 hover:bg-white focus-within:bg-white focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all ${
                    errors.password ? 'border-red-400 bg-red-50/30' : 'border-slate-200'
                  }`}
                >
                  <div className="pl-4 pr-1 text-slate-400 pointer-events-none flex items-center">
                    <Lock size={17} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...register('password')}
                    className="w-full px-3 py-3 rounded-2xl text-sm font-semibold bg-transparent text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="pr-3.5 pl-2 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {errors.password && <p className="text-[11px] font-semibold text-red-600 pl-1">{errors.password.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Confirm Password *</label>
                <div
                  className={`relative flex items-center rounded-2xl border bg-slate-50/50 hover:bg-white focus-within:bg-white focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all ${
                    errors.confirmPassword ? 'border-red-400 bg-red-50/30' : 'border-slate-200'
                  }`}
                >
                  <div className="pl-4 pr-1 text-slate-400 pointer-events-none flex items-center">
                    <Lock size={17} />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...register('confirmPassword')}
                    className="w-full px-3 py-3 rounded-2xl text-sm font-semibold bg-transparent text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="pr-3.5 pl-2 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-[11px] font-semibold text-red-600 pl-1">{errors.confirmPassword.message}</p>}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold text-sm shadow-lg shadow-indigo-600/25 disabled:opacity-60 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Creating Account…</span>
                  </>
                ) : (
                  <>
                    <span>Create Institutional Account</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
            <span>Already registered? </span>
            <Link to={ROUTES.LOGIN} className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline">
              Sign In
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
