import React, { useState } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles, 
  Receipt, 
  Users, 
  Lock,
  Wallet,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signInWithRedirect, signInAnonymously } from 'firebase/auth';

interface AuthScreenProps {
  onEnterDemo: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onEnterDemo }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.warn('Popup sign in failed, trying fallback or reporting:', err);
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

  const handleDemoSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      // Sign in anonymously in Firebase for persistent demo experience in firestore
      await signInAnonymously(auth);
      onEnterDemo();
    } catch (err: any) {
      console.warn('Anonymous firebase auth failed, proceeding to client-side demo:', err);
      // Even if anonymous auth is disabled on project, allow user into full demo mode
      onEnterDemo();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col justify-center items-center px-4 py-8 antialiased selection:bg-emerald-600 selection:text-white">
      <div className="w-full max-w-md bg-white rounded-3xl border border-stone-200/90 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Visual Accent */}
        <div className="bg-stone-900 text-white p-7 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 text-white shadow-lg mb-3">
            <Building2 className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-white">
            Sajha Khata (साझा खाता)
          </h1>
          <p className="text-xs text-stone-300 mt-1 max-w-xs mx-auto leading-relaxed">
            Co-founder Financial Ledger & Multi-Partner Treasury for Indian Ventures
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-3 text-left">
            <div className="bg-stone-50 border border-stone-200/70 p-3 rounded-2xl space-y-1">
              <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-stone-900">Separate Accounts</div>
              <div className="text-[10px] text-stone-500 leading-tight">
                Poonji capital vs personal out-of-pocket bills
              </div>
            </div>

            <div className="bg-stone-50 border border-stone-200/70 p-3 rounded-2xl space-y-1">
              <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-stone-900">Multi-Partner Sahamati</div>
              <div className="text-[10px] text-stone-500 leading-tight">
                Mandatory approvals before company reimbursements
              </div>
            </div>
          </div>

          {/* Cloud Sync Badge */}
          <div className="flex items-center gap-2 p-2.5 bg-emerald-50/70 border border-emerald-200/60 rounded-xl text-emerald-900 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="text-[11px] leading-tight">
              Real-time Firestore cloud synchronization for all partners & ventures.
            </span>
          </div>

          {/* Error notice if any */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 pt-1">
            {/* Primary Google Sign-In */}
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
              <span>{loading ? 'Connecting...' : 'Sign in with Google Account'}</span>
            </button>

            {/* Instant Demo Sandbox Button */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-stone-200"></div>
              <span className="flex-shrink mx-3 text-[10px] uppercase font-semibold tracking-wider text-stone-400">
                Or Preview Live
              </span>
              <div className="flex-grow border-t border-stone-200"></div>
            </div>

            <button
              id="enter-demo-btn"
              onClick={handleDemoSignIn}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-stone-100 hover:bg-stone-200/80 active:scale-98 text-stone-800 border border-stone-200 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Explore Interactive Demo (Deccan Tech LLP)</span>
              <ArrowRight className="w-3.5 h-3.5 text-stone-400" />
            </button>
          </div>

          <div className="pt-2 text-center text-[10px] text-stone-400">
            Secure cloud storage hosted on Google Cloud Firestore • Passkeys & OAuth 2.0
          </div>
        </div>

      </div>
    </div>
  );
};
