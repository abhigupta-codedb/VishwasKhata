import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  Lock,
  Wallet,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  MailQuestion,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth';
import { checkIsUserAllowed, BOOTSTRAP_ADMIN_EMAIL } from '../services/firestoreService';

interface AuthScreenProps {
  initialBlockedEmail?: string | null;
  onClearBlockedEmail?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ 
  initialBlockedEmail, 
  onClearBlockedEmail 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockedEmail, setBlockedEmail] = useState<string | null>(initialBlockedEmail || null);

  useEffect(() => {
    if (initialBlockedEmail) {
      setBlockedEmail(initialBlockedEmail);
    }
  }, [initialBlockedEmail]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    setBlockedEmail(null);
    if (onClearBlockedEmail) onClearBlockedEmail();

    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const email = userCredential.user?.email;

      if (!email) {
        await signOut(auth);
        setError('Google Account did not provide an email address.');
        return;
      }

      // Check whether user's email exists in the allowed_users table
      const isAllowed = await checkIsUserAllowed(email);

      if (!isAllowed) {
        // Enforce invite-only check: Block access and sign out
        await signOut(auth);
        setBlockedEmail(email);
        return;
      }

      // User is approved, continue to app
    } catch (err: any) {
      console.warn('Google sign-in attempt:', err);
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr: any) {
          setError(redirectErr.message || 'Could not complete Google Sign-In.');
        }
      } else {
        setError(err.message || 'Failed to sign in with Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTryAgain = () => {
    setBlockedEmail(null);
    setError(null);
    if (onClearBlockedEmail) onClearBlockedEmail();
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col justify-center items-center px-4 py-8 antialiased selection:bg-emerald-600 selection:text-white">
      <div className="w-full max-w-md bg-white rounded-3xl border border-stone-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header Banner */}
        <div className="bg-stone-900 text-white p-7 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 text-white shadow-lg mb-3">
            <Building2 className="w-7 h-7" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mb-2 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-[10px] font-bold text-emerald-300 tracking-wide uppercase">
            <Lock className="w-3 h-3" />
            <span>Invite-Only Pilot</span>
          </div>

          <h1 className="text-xl font-extrabold tracking-tight text-white">
            Sajha Khata (साझा खाता)
          </h1>
          <p className="text-xs text-stone-300 mt-1 max-w-xs mx-auto leading-relaxed">
            Shared Investment Ledger & Partner Capital Pool
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">

          {/* Blocked: Invite-Only Access Message */}
          {blockedEmail ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-2xl text-center space-y-2">
                <div className="w-10 h-10 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center mx-auto">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                
                <h2 className="text-xs font-bold text-stone-900 leading-snug">
                  Access Restricted
                </h2>

                <p className="text-xs font-semibold text-amber-950 px-1 leading-relaxed">
                  This app is currently invite-only. Please contact the administrator for access.
                </p>

                <div className="mt-2 pt-2 border-t border-amber-200/60 text-[11px] text-stone-600">
                  Account tried: <span className="font-mono font-medium text-stone-800">{blockedEmail}</span>
                </div>
              </div>

              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-1.5 text-left">
                <div className="text-[11px] font-bold text-stone-700 flex items-center gap-1">
                  <MailQuestion className="w-3.5 h-3.5 text-stone-500" />
                  <span>How to get access:</span>
                </div>
                <p className="text-[11px] text-stone-500 leading-normal">
                  The primary administrator must add your email to the approved users table in the database before you can log in.
                </p>
              </div>

              <button
                type="button"
                id="try-another-account-btn"
                onClick={handleTryAgain}
                className="w-full py-2.5 px-4 bg-stone-900 hover:bg-black active:scale-98 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Another Google Account</span>
              </button>
            </div>
          ) : (
            <>
              {/* Feature Highlights Grid */}
              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="bg-stone-50 border border-stone-200/70 p-3 rounded-2xl space-y-1">
                  <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-bold text-stone-900">Capital Ledger</div>
                  <div className="text-[10px] text-stone-500 leading-tight">
                    Mutual record of pre-revenue partner investments
                  </div>
                </div>

                <div className="bg-stone-50 border border-stone-200/70 p-3 rounded-2xl space-y-1">
                  <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-bold text-stone-900">Partner Sahamati</div>
                  <div className="text-[10px] text-stone-500 leading-tight">
                    Verified sign-offs before finalizing entries
                  </div>
                </div>
              </div>

              {/* Pilot Access Notice */}
              <div className="flex items-center gap-2 p-3 bg-stone-50 border border-stone-200/80 rounded-2xl text-stone-700 text-xs">
                <Lock className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="text-[11px] leading-tight">
                  Private Pilot: Only authorized partner emails configured in the database can sign in.
                </span>
              </div>

              {/* Error notice if any */}
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-800 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span className="leading-snug">{error}</span>
                </div>
              )}

              {/* Primary Google Sign-In */}
              <div className="space-y-2 pt-1">
                <button
                  id="google-signin-btn"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full py-3 px-4 bg-stone-900 hover:bg-black active:scale-98 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-3 shadow-md transition-all disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>{loading ? 'Verifying access...' : 'Sign in with Approved Google Account'}</span>
                </button>

                <p className="text-[10px] text-center text-stone-400">
                  New users must be pre-approved by the administrator.
                </p>
              </div>
            </>
          )}

        </div>

      </div>
    </div>
  );
};
