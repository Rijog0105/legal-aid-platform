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
    full_name: z.string().min(1, 'Full Name is required').min(2, 'Full Name must be at least 2 characters'),
    email: z
      .string()
      .min(1, 'College Email is required')
      .email('Enter a valid college email address')
      .refine(
        (val) => val.endsWith('.edu') || val.includes('@') || val.includes('.ac.in'),
        'Please use your institutional college email'
      ),
    phone: z.string().min(1, 'Phone Number is required').min(10, 'Enter a valid 10-digit phone number'),
    category: z.enum(['student', 'faculty']),
    usn_employee_id: z.string().min(1, 'SRN is required'),
    department: z.string().min(1, 'Department is required'),
    semester: z.string().min(1, 'Semester is required'),
    password: z.string().min(1, 'Password is required').min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Confirm Password is required'),
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
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      category: 'student',
      full_name: '',
      email: '',
      phone: '',
      usn_employee_id: '',
      department: '',
      semester: '',
      password: '',
      confirmPassword: '',
    },
  });

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
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Branding Header Area */}
      <div className="w-full max-w-4xl flex flex-col sm:flex-row justify-between items-center mb-6 px-4 gap-4">
        {/* REVA University Branding */}
        <div className="flex items-center gap-1.5">
          <span className="text-2xl sm:text-3xl font-extrabold text-[#F37021] tracking-tight">REVA</span>
          <span className="text-2xl sm:text-3xl font-semibold text-slate-800 tracking-tight">University</span>
        </div>

        {/* Civic Forge Labs / Product Branding */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shrink-0 shadow-sm">
            <Scale size={18} className="text-white" />
          </div>
          <span className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Civic Forge Labs</span>
        </div>
      </div>

      {/* Floating Card */}
      <div className="w-full max-w-4xl bg-white rounded-3xl border border-surface-200 shadow-sm p-6 sm:p-8 md:p-10">
        {isSubmittedSuccess ? (
          <div className="text-center space-y-5 animate-fade-in max-w-lg mx-auto py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="text-2xl font-bold text-surface-900">Registration Submitted!</h2>
            <p className="text-sm text-surface-600 leading-relaxed">
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
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary-600 mb-6 transition-colors"
            >
              <ArrowLeft size={14} /> Back to Sign In
            </Link>

            <h2 className="text-2xl font-extrabold text-slate-900 mb-1">Create an Account</h2>
            <p className="text-sm text-slate-500 mb-6">
              Register as a Student Volunteer to get started.
            </p>

            {serverError && (
              <div className="flex items-start gap-2.5 p-3.5 mb-5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs leading-relaxed">
                <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
                <span>{serverError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
              {/* Form Grid Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                {/* Column 1 */}
                <div className="space-y-5">
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

                  {/* College Email */}
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

                  {/* SRN */}
                  <div>
                    <label htmlFor="usn_employee_id" className="block text-xs font-semibold text-slate-700 mb-1">
                      SRN <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="usn_employee_id"
                      type="text"
                      placeholder="Enter your SRN"
                      {...register('usn_employee_id')}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
                    />
                    {errors.usn_employee_id && (
                      <p className="text-xs text-red-600 mt-1">{errors.usn_employee_id.message}</p>
                    )}
                  </div>

                  {/* Password */}
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
                    <p className="text-[11px] text-slate-500 mt-1">Password must be at least 6 characters long.</p>
                    {errors.password && (
                      <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>
                    )}
                  </div>
                </div>

                {/* Column 2 */}
                <div className="space-y-5">
                  {/* Department */}
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

                  {/* Phone Number */}
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

                  {/* Semester Dropdown */}
                  <div>
                    <label htmlFor="semester" className="block text-xs font-semibold text-slate-700 mb-1">
                      Semester <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="semester"
                      {...register('semester')}
                      defaultValue=""
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all cursor-pointer"
                    >
                      <option value="" disabled>Select Semester</option>
                      <option value="Semester 1">Semester 1</option>
                      <option value="Semester 2">Semester 2</option>
                      <option value="Semester 3">Semester 3</option>
                      <option value="Semester 4">Semester 4</option>
                      <option value="Semester 5">Semester 5</option>
                      <option value="Semester 6">Semester 6</option>
                      <option value="Semester 7">Semester 7</option>
                      <option value="Semester 8">Semester 8</option>
                    </select>
                    {errors.semester && (
                      <p className="text-xs text-red-600 mt-1">{errors.semester.message}</p>
                    )}
                  </div>

                  {/* Confirm Password */}
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
              </div>

              {/* Submit button */}
              <div className="pt-4">
                <button
                  id="btn-register-submit"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2"
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
  );
}
