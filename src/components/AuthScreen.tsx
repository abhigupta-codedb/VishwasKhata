import React, { useState, useEffect } from 'react';
import { AlertCircle, ShieldAlert, RefreshCw } from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth';
import { checkIsUserAllowed } from '../services/firestoreService';

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
    <div className="min-h-screen bg-stone-50 flex flex-col justify-center items-center px-4 py-12 antialiased selection:bg-emerald-600 selection:text-white">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-stone-200/80 shadow-xs p-8 animate-in fade-in duration-200">
        
        {blockedEmail ? (
          /* Access Restricted / Invite-Only Notification */
          <div className="space-y-5 text-center">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200/70 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-5 h-5" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-base font-bold text-stone-900 tracking-tight">
                Access Restricted
              </h2>
              <p className="text-xs text-stone-500 leading-relaxed">
                This workspace is currently invite-only. Please contact the administrator to get access.
              </p>
            </div>

            <div className="p-2.5 bg-stone-50 border border-stone-200/80 rounded-xl text-left">
              <div className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">
                Attempted Account
              </div>
              <div className="text-xs font-mono font-medium text-stone-800 truncate mt-0.5">
                {blockedEmail}
              </div>
            </div>

            <button
              type="button"
              id="try-another-account-btn"
              onClick={handleTryAgain}
              className="w-full py-2.5 px-4 bg-stone-900 hover:bg-black active:scale-[0.99] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Try Another Google Account</span>
            </button>
          </div>
        ) : (
          /* Primary Simplified Login Screen */
          <div className="space-y-6 text-center">
            
            {/* Header: Logo, Title, Subtitle, Pilot indicator */}
            <div className="space-y-3">
              {/* VishwasKhata Logo */}
              <div className="w-12 h-12 rounded-2xl bg-stone-900 text-emerald-400 flex items-center justify-center mx-auto shadow-xs border border-stone-800">
                <svg
                  className="w-6 h-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                  <path d="M6 6h10" />
                  <path d="M6 10h10" />
                  <path d="M6 14h6" />
                </svg>
              </div>

              {/* Title & Subtitle */}
              <div className="space-y-1">
                <h1 className="text-xl font-bold tracking-tight text-stone-900">
                  VishwasKhata
                </h1>
                <p className="text-xs text-stone-500">
                  A shared investment ledger for partners.
                </p>
              </div>

              {/* Private Pilot badge */}
              <div className="pt-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-stone-100 border border-stone-200/80 text-[11px] font-medium text-stone-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  <span>Private Pilot</span>
                </span>
              </div>
            </div>

            {/* Error Message if any */}
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-xl flex items-start gap-2 text-rose-800 text-xs text-left">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            {/* Action & Supporting message */}
            <div className="space-y-3 pt-2">
              <button
                id="google-signin-btn"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-stone-900 hover:bg-black active:scale-[0.99] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2.5 shadow-xs transition-all disabled:opacity-50"
              >
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
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
                <span>{loading ? 'Connecting...' : 'Continue with Google'}</span>
              </button>

              <p className="text-[11px] text-stone-400 leading-tight">
                Only invited accounts can access this workspace.
              </p>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
