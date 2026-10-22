import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import {
  BriefcaseBusiness,
  CheckCircle2,
  Cloud,
  FileDown,
  FileText,
  QrCode,
  ShieldCheck,
  Wallet,
  Zap,
} from 'lucide-react';

function GoogleLogo() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.55h3.24c1.9-1.75 2.98-4.33 2.98-7.42Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.98-.9 6.63-2.43l-3.24-2.54c-.9.6-2.05.97-3.39.97-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.39 13.87A6.02 6.02 0 0 1 6.07 12c0-.65.11-1.28.32-1.87V7.51H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.49l3.35-2.62Z"
      />
      <path
        fill="#EA4335"
        d="M12 6c1.47 0 2.79.51 3.82 1.5l2.88-2.87A9.66 9.66 0 0 0 12 2a10 10 0 0 0-8.96 5.51l3.35 2.62C7.18 7.76 9.39 6 12 6Z"
      />
    </svg>
  );
}

export default function Login() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const navigate = useNavigate();

  // 1. "LIFETIME LOGIN" CHECK
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken();
          localStorage.setItem("authToken", token);
        } catch (error) {
          console.error("Error refreshing token on automated login:", error);
        }
        navigate('/cashbook', { replace: true });
      } else {
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // 2. GOOGLE LOGIN HANDLER
  const handleGoogleLogin = async () => {
    if (isSigningIn) return;
    const provider = new GoogleAuthProvider();
    try {
      setIsSigningIn(true);
      const googleLogin = await signInWithPopup(auth, provider);

      const token = await googleLogin.user.getIdToken();
      localStorage.setItem("authToken", token);

      try {
        await api.post("/users/sync");
      } catch (syncError) {
        console.error("Error syncing user to database:", syncError);
      }

      toast.success("Welcome back! 🎉");
      navigate("/cashbook", { replace: true });
    } catch (error) {
      console.error("Error in handleGoogleLogin:", error);
      if (error.code !== 'auth/popup-closed-by-user') {
        toast.error("Google sign-in failed. Please try again.");
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  // 3. INITIAL SESSION RESTORE SPINNER
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col justify-center items-center">
        <div className="w-10 h-10 border-4 border-[#1048A4] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600 text-sm font-bold tracking-wide">Restoring session...</p>
      </div>
    );
  }

// 4. NEW DESIGN UI
  return (
    <main className="fixed inset-0 mx-auto flex w-full max-w-md flex-col overflow-hidden bg-[#1048A4] text-gray-900 font-sans select-none">
     {/* TOP ROYAL BLUE HERO SECTION */}
      <section className="relative flex-1 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px] px-5 pb-8 pt-4">
        <div className="pointer-events-none absolute -right-24 -top-20 h-72 w-72 rounded-full bg-blue-300/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-0 h-64 w-64 rounded-full bg-[#FFD700]/10 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10">
            <Wallet className="h-5 w-5 text-[#FFD700]" strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-semibold uppercase leading-none tracking-wider text-white">
              Expense Engine
            </div>
            <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-widest text-blue-200">
              Manager Cashbook
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1">
            <ShieldCheck className="h-3 w-3 text-white" />
            <span className="text-[10px] font-semibold tracking-widest text-white">SECURE</span>
          </div>
        </div>

        <div className="relative z-10 mt-6">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-200">
            Business money, under control
          </div>
          <div className="text-[30px] font-bold leading-[1.15] tracking-tight text-white">
            Every rupee. Every team.
          </div>
          <div className="text-[30px] font-bold leading-[1.15] tracking-tight text-[#FFD700]">
            One ledger.
          </div>
        </div>
      </section>

      {/* FLOATING CASHBOX PREVIEW CARD (Pulled up smoothly into the hero) */}
        <section className="relative z-20 mx-5 -mt-10 overflow-visible rounded-2xl border border-gray-100 bg-white p-3.5 shadow-[0_12px_32px_rgba(16,72,164,0.18)]">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1048A4]">
              <BriefcaseBusiness className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Company Cashbox
              </div>
              <div className="truncate text-[14px] font-bold text-gray-900">
                Operations &amp; Team Ledger
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600">
              <QrCode className="h-4 w-4" />
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1048A4] text-white">
              <FileDown className="h-4 w-4" />
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-end justify-between border-t border-dashed border-gray-200 pt-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Available Balance
            </div>
            <div className="mt-1 text-[26px] font-bold leading-none tabular-nums text-green-500">
              ₹1,45,000
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-[#0E793C]">
            <CheckCircle2 className="h-3 w-3" />
            Surplus
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2.5 border-t border-gray-100 pt-3">
          <div className="rounded-xl border border-green-100 bg-green-50/60 px-3 py-2">
            <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500">
              Funds In (Deposits)
            </div>
            <div className="mt-0.5 text-[13px] font-extrabold text-[#0E793C]">+ ₹2,10,000</div>
          </div>
          <div className="rounded-xl border border-pink-100 bg-pink-50/60 px-3 py-2">
            <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500">
              Team Advances &amp; Exp
            </div>
            <div className="mt-0.5 text-[13px] font-extrabold text-[#9D0052]">− ₹65,000</div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-gray-100 pt-2.5 text-[9px] font-bold text-gray-500">
          <div className="flex items-center gap-1 whitespace-nowrap">
            <Zap className="h-3 w-3 text-[#FFD700]" fill="currentColor" />
            Instant UPI QR
          </div>
          <div className="h-3 w-px bg-gray-200" />
          <div className="flex items-center gap-1 whitespace-nowrap">
            <FileText className="h-3 w-3 text-[#1048A4]" />
            PDF/CSV Export
          </div>
          <div className="h-3 w-px bg-gray-200" />
          <div className="flex items-center gap-1 whitespace-nowrap">
            <Cloud className="h-3 w-3 text-[#0E793C]" />
            Offline Sync
          </div>
        </div>
      </section>

      {/* BOTTOM LOGIN ACTION SHEET */}
        <section className="relative z-30 mt-3 rounded-t-3xl border-t border-gray-100 bg-white px-6 pb-4 pt-3 shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-gray-200" />
            <div className="text-[20px] font-bold tracking-tight text-gray-900">Welcome Back</div>
            <div className="mb-3 mt-0.5 text-[12px] font-medium leading-relaxed text-gray-500">
            Sign in with your Google account to sync your manager cashbook and team ledgers.
            </div>

            <button
            type="button"
            disabled={isSigningIn}
            onClick={handleGoogleLogin}
            className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-[15px] font-extrabold text-gray-800 shadow-sm transition-all hover:bg-gray-50 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
            <GoogleLogo />
            {isSigningIn ? "Signing in..." : "Continue with Google"}
            </button>

            <div className="mt-4 flex items-center justify-center gap-1.5 text-center pb-2">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#0E793C]" />
            <span className="text-[11px] font-semibold text-gray-400">
                256-Bit Encrypted • Instant Cloud Backup • Free Forever
            </span>
            </div>
        </section>
    </main>
  );
}