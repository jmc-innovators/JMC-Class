import React, { useState } from 'react';
import { UserRole } from '../types';
import {
  Shield,
  School,
  GraduationCap,
  Users,
  User,
  ArrowRight,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Calendar,
  MessageSquare,
  Lock,
  Copy,
  Check,
  KeyRound,
  ExternalLink,
} from 'lucide-react';
import { SchoolRegistrationModal } from './SchoolRegistrationModal';

interface LandingPageProps {
  onSignInWithGoogle: (preferredRole?: UserRole) => Promise<void>;
  onSignInWithRole: (role: UserRole) => Promise<void>;
  onSignInWithEmail: (email: string, pass: string, preferredRole?: UserRole) => Promise<void>;
  onJoinByCode: (code: string, name: string) => Promise<void>;
  onRequestSchoolRegistration: (data: {
    name: string;
    adminEmail: string;
    principalName: string;
    district: string;
    phone: string;
  }) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onSignInWithGoogle,
  onSignInWithRole,
  onSignInWithEmail,
  onJoinByCode,
  onRequestSchoolRegistration,
  loading,
  error,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [authMode, setAuthMode] = useState<'quick' | 'email'>('quick');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [studentName, setStudentName] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regData, setRegData] = useState({
    name: '',
    adminEmail: '',
    principalName: '',
    district: '',
    phone: '',
  });
  const [regSuccess, setRegSuccess] = useState(false);

  const isUnauthorizedDomain = Boolean(error && error.startsWith('UNAUTHORIZED_DOMAIN:'));
  const unauthorizedDomain = isUnauthorizedDomain && error
    ? error.replace('UNAUTHORIZED_DOMAIN:', '')
    : typeof window !== 'undefined'
    ? window.location.hostname
    : '';

  const handleCopyDomain = () => {
    if (unauthorizedDomain) {
      navigator.clipboard.writeText(unauthorizedDomain);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2500);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) return;
    await onSignInWithEmail(emailInput, passwordInput, selectedRole);
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode || !studentName) return;
    await onJoinByCode(joinCode, studentName);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regData.name || !regData.adminEmail) return;
    await onRequestSchoolRegistration(regData);
    setRegSuccess(true);
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-[#e6edf3] selection:bg-blue-600 selection:text-white relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 -right-40 w-96 h-96 bg-purple-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-white/10 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 p-0.5 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <div className="w-full h-full bg-[#0d111b] rounded-[14px] flex items-center justify-center font-black text-blue-400 text-base font-['Plus_Jakarta_Sans']">
                JMC
              </div>
            </div>
            <div>
              <span className="font-extrabold text-xl text-white tracking-tight font-['Plus_Jakarta_Sans']">
                JMC Classroom
              </span>
              <div className="text-xs text-slate-400 font-medium">Sri Lanka Grade 6–11 School Platform</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-gemini-chat'))}
              className="flex items-center gap-1.5 text-xs sm:text-sm font-bold px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-lg shadow-indigo-600/30 transition-all border border-white/20"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>Ask Gemini AI</span>
            </button>
            <button
              onClick={() => setShowJoinModal(true)}
              className="text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-all"
            >
              Join with Code
            </button>
            <button
              onClick={() => setShowRegisterModal(true)}
              className="text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/25 transition-all"
            >
              Register School
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-24 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Platform Brief */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Production-Grade Cloud Firestore Platform</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1] font-['Plus_Jakarta_Sans']">
              One connected <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">Classroom</span> for your entire school.
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl font-['DM_Sans']">
              Engineered exclusively with live Firebase Cloud persistence. Real role-based access for Operators, School Admins, Teachers, Students, and Parents — with assignments, attendance, assessments, timetables, and messaging.
            </p>

            {/* Feature Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-300 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Real Firestore Sync
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-300 font-medium">
                <BookOpen className="w-4 h-4 text-blue-400 shrink-0" /> Live Assignments
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-300 font-medium">
                <Calendar className="w-4 h-4 text-amber-400 shrink-0" /> Daily Attendance
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-300 font-medium">
                <Lock className="w-4 h-4 text-purple-400 shrink-0" /> Zero Fake Demo Data
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-300 font-medium">
                <MessageSquare className="w-4 h-4 text-cyan-400 shrink-0" /> Teacher & Parent Chat
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-300 font-medium">
                <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" /> AI Lesson Assistant
              </div>
            </div>
          </div>

          {/* Right Column: Portal Sign-In Card */}
          <div className="lg:col-span-5">
            <div className="bg-[#121726]/90 border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative">
              <div className="text-center mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-white font-['Plus_Jakarta_Sans']">
                  Sign in to JMC Classroom
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Authenticate securely via Google or select your role portal
                </p>
              </div>

              {error && isUnauthorizedDomain ? (
                <div className="mb-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2">
                  <div className="font-bold text-amber-300 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 shrink-0" /> Authorize Domain in Firebase Auth
                  </div>
                  <p className="text-[11px] text-amber-100/80 leading-relaxed">
                    Add this preview hostname to Firebase Authentication → Settings → Authorized domains:
                  </p>
                  <div className="flex items-center gap-2 bg-black/30 rounded-lg px-2.5 py-1.5 border border-white/10">
                    <code className="text-[11px] text-white font-mono truncate flex-1">{unauthorizedDomain}</code>
                    <button
                      type="button"
                      onClick={handleCopyDomain}
                      className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white shrink-0"
                    >
                      {copiedDomain ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedDomain ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              ) : error ? (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-xs flex items-start gap-2">
                  <span className="shrink-0">⚠</span>
                  <span className="break-words">
                    {(() => {
                      try {
                        const parsed = JSON.parse(error);
                        return parsed.error || error;
                      } catch {
                        return error;
                      }
                    })()}
                  </span>
                </div>
              ) : null}

              {/* Role selector buttons */}
              <div className="space-y-2 mb-6">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Choose Your Portal
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('student')}
                    className={`flex items-center gap-2 p-3 rounded-xl text-left border transition-all ${
                      selectedRole === 'student'
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                        : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <User className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold">Student</div>
                      <div className="text-[10px] text-slate-400">Classwork & Grades</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRole('teacher')}
                    className={`flex items-center gap-2 p-3 rounded-xl text-left border transition-all ${
                      selectedRole === 'teacher'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                        : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold">Teacher</div>
                      <div className="text-[10px] text-slate-400">Classes & Marks</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRole('school')}
                    className={`flex items-center gap-2 p-3 rounded-xl text-left border transition-all ${
                      selectedRole === 'school'
                        ? 'bg-blue-500/15 border-blue-500/40 text-blue-200'
                        : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <School className="w-4 h-4 text-blue-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold">School Admin</div>
                      <div className="text-[10px] text-slate-400">Manage School</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRole('parent')}
                    className={`flex items-center gap-2 p-3 rounded-xl text-left border transition-all ${
                      selectedRole === 'parent'
                        ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                        : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <Users className="w-4 h-4 text-rose-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold">Parent</div>
                      <div className="text-[10px] text-slate-400">Track Child Progress</div>
                    </div>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedRole('operator')}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-xs ${
                    selectedRole === 'operator'
                      ? 'bg-purple-500/15 border-purple-500/40 text-purple-200'
                      : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-purple-400" /> Platform Operator Portal
                  </span>
                  <span className="text-[10px] text-slate-500">info@jmcinnovator.cc.cd</span>
                </button>
                {selectedRole === 'operator' && (
                  <div className="px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-500/25 text-[11px] text-purple-200">
                    Authorized Operator Account: <b className="text-white">info@jmcinnovator.cc.cd</b>
                  </div>
                )}
              </div>

              {/* Main Google Sign-In Action */}
              <button
                onClick={() => onSignInWithGoogle(selectedRole)}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-sm shadow-xl shadow-blue-500/25 transition-all disabled:opacity-50"
              >
                {/* Google Logo SVG */}
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#FFFFFF"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#FFFFFF"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FFFFFF"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#FFFFFF"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{loading ? 'Authenticating…' : 'Continue with Google'}</span>
              </button>

              {/* Instant Role Entry button */}
              <button
                type="button"
                onClick={() => onSignInWithRole(selectedRole)}
                disabled={loading}
                className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 font-semibold text-xs transition-all"
              >
                <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
                <span>
                  Instant Entry: {selectedRole === 'school' ? 'School Admin' : selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} Portal
                </span>
              </button>

              {/* Email/Password toggle */}
              <div className="mt-3 text-center">
                <button
                  type="button"
                  onClick={() => setAuthMode(authMode === 'email' ? 'quick' : 'email')}
                  className="text-[11px] text-slate-400 hover:text-slate-200 underline font-medium"
                >
                  {authMode === 'email' ? 'Hide Email Sign-in' : 'Sign in with School Email / Password'}
                </button>
              </div>

              {authMode === 'email' && (
                <form onSubmit={handleEmailSubmit} className="mt-3 p-3 rounded-xl bg-black/30 border border-white/10 space-y-2">
                  <input
                    type="email"
                    required
                    placeholder="name@jmc.school or gmail.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full bg-[#1b2234] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="password"
                    required
                    placeholder="Password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full bg-[#1b2234] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={loading || !emailInput || !passwordInput}
                    className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
                  >
                    Sign in with Email
                  </button>
                </form>
              )}

              <div className="mt-4 pt-4 border-t border-white/5 text-center">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(true)}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1"
                >
                  Student with a 6-letter class code? Join here <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Join with Class Code Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#151a28] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white font-['Plus_Jakarta_Sans'] mb-2">
              Join a Classroom
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter your student name and the 6-letter class code provided by your teacher.
            </p>

            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Your Full Name</label>
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g. Kasun Perera"
                  className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Class Code (6 letters)</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. AB3X9K"
                  className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 tracking-widest font-mono font-bold uppercase focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !joinCode || !studentName}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 disabled:opacity-50"
                >
                  {loading ? 'Joining…' : 'Join Classroom'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Register School Modal */}
      <SchoolRegistrationModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
      />
    </div>
  );
};
