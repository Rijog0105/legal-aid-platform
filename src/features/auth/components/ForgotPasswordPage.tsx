import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Lock, Mail } from 'lucide-react';
import { supabase } from '@/services/supabase';
import { ROUTES } from '@/constants';

type Step = 'email' | 'reset' | 'done';

/**
 * In-app password reset using a one-time code emailed by Supabase.
 * Requires the Supabase "Reset Password" email template to include {{ .Token }}.
 */
export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const sendCode = async () => {
    setError(null);
    setInfo(null);
    const trimmed = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
      setError('Enter a valid email address.');
      return;
    }
    setIsBusy(true);
    const { error: sendErr } = await supabase.auth.resetPasswordForEmail(trimmed);
    setIsBusy(false);
    if (sendErr) {
      setError(
        sendErr.message.toLowerCase().includes('rate limit')
          ? 'Too many requests. Please wait a few minutes and try again.'
          : sendErr.message
      );
      return;
    }
    setEmail(trimmed);
    setStep('reset');
    setInfo(`If an account exists for ${trimmed}, a verification code has been sent to it.`);
  };

  const resetPassword = async () => {
    setError(null);
    setInfo(null);
    if (!/^\d{6,10}$/.test(code.trim())) {
      setError('Enter the numeric code from the email.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsBusy(true);
    try {
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        email,
        token: code.trim(),
        type: 'recovery',
      });
      if (verifyErr) {
        setError('The code is invalid or has expired. Request a new code and try again.');
        return;
      }

      const { error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) {
        setError(updateErr.message);
        return;
      }

      // Verification signs the user in; sign out so they log in with the new password.
      await supabase.auth.signOut();
      setStep('done');
    } finally {
      setIsBusy(false);
    }
  };

  const inputWrapper =
    'relative flex items-center rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white focus-within:bg-white focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all';
  const inputClass =
    'w-full px-3 py-3 rounded-2xl text-sm font-semibold bg-transparent text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none';
  const primaryButton =
    'w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold text-sm shadow-lg shadow-indigo-600/25 disabled:opacity-60 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2';

  return (
    <div className="min-h-screen bg-[#fafbfc] flex flex-col justify-center items-center px-4 py-8 sm:px-6 relative overflow-hidden font-sans">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-80 bg-gradient-to-b from-orange-100/30 via-indigo-50/20 to-transparent blur-3xl pointer-events-none -z-10" />

      <div className="w-full max-w-[440px] space-y-6 relative z-10">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-sm border border-slate-200/80">
            <img src="/reva-logo.png" alt="REVA University Logo" className="h-12 sm:h-14 w-auto object-contain" />
          </div>
          <p className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider">
            School of Legal Studies
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-9 shadow-[0_12px_40px_-10px_rgba(0,0,0,0.06)] space-y-6">
          {step === 'done' ? (
            <div className="text-center space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} />
              </div>
              <div className="space-y-1.5">
                <h1 className="text-xl font-black text-slate-900">Password Updated</h1>
                <p className="text-xs text-slate-500">You can now sign in with your new password.</p>
              </div>
              <button type="button" onClick={() => navigate(ROUTES.LOGIN, { replace: true })} className={primaryButton}>
                Return to Sign In
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-1 text-center sm:text-left">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Reset Password</h1>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {step === 'email'
                    ? 'Enter your registered email and we will send you a verification code.'
                    : 'Enter the code from your email and choose a new password.'}
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50/90 border border-red-200/90 text-red-800 text-xs">
                  <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-semibold">{error}</span>
                </div>
              )}
              {info && !error && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-indigo-50/90 border border-indigo-200/90 text-indigo-800 text-xs">
                  <Mail size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-semibold">{info}</span>
                </div>
              )}

              {step === 'email' ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendCode();
                  }}
                  noValidate
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <label htmlFor="reset-email" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Institutional Email
                    </label>
                    <div className={inputWrapper}>
                      <div className="pl-4 pr-1 text-slate-400 pointer-events-none flex items-center">
                        <Mail size={17} />
                      </div>
                      <input
                        id="reset-email"
                        type="email"
                        autoComplete="email"
                        placeholder="name@university.edu"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <button type="submit" disabled={isBusy} className={primaryButton}>
                    {isBusy ? 'Sending code…' : 'Send Verification Code'}
                  </button>
                </form>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    resetPassword();
                  }}
                  noValidate
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <label htmlFor="reset-code" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Verification Code
                    </label>
                    <div className={inputWrapper}>
                      <div className="pl-4 pr-1 text-slate-400 pointer-events-none flex items-center">
                        <KeyRound size={17} />
                      </div>
                      <input
                        id="reset-code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="Enter code"
                        maxLength={10}
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                        className={`${inputClass} tracking-[0.3em]`}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="reset-password" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      New Password
                    </label>
                    <div className={inputWrapper}>
                      <div className="pl-4 pr-1 text-slate-400 pointer-events-none flex items-center">
                        <Lock size={17} />
                      </div>
                      <input
                        id="reset-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={inputClass}
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword((v) => !v)}
                        className="pr-3.5 pl-2 text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="reset-confirm" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Confirm New Password
                    </label>
                    <div className={inputWrapper}>
                      <div className="pl-4 pr-1 text-slate-400 pointer-events-none flex items-center">
                        <Lock size={17} />
                      </div>
                      <input
                        id="reset-confirm"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <button type="submit" disabled={isBusy} className={primaryButton}>
                    {isBusy ? 'Updating password…' : 'Reset Password'}
                  </button>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={sendCode}
                    className="w-full text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer disabled:opacity-50"
                  >
                    Didn&apos;t get a code? Resend
                  </button>
                </form>
              )}

              <div className="pt-4 border-t border-slate-100 text-center">
                <Link
                  to={ROUTES.LOGIN}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline inline-flex items-center gap-1"
                >
                  <ArrowLeft size={13} /> Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
