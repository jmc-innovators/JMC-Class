import React, { useState } from 'react';
import { School as SchoolModel, UserRole } from '../types';
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
  MapPin,
  Building2,
} from 'lucide-react';
import { SchoolRegistrationModal } from './SchoolRegistrationModal';

interface LandingPageProps {
  schools?: SchoolModel[];
  onNavigateSchool?: (schoolId: string) => void;
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
  schools = [],
  onNavigateSchool,
  onSignInWithGoogle,
  onSignInWithRole,
  onSignInWithEmail,
  onJoinByCode,
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
    setShowJoinModal(false);
  };

  const handleOpenSchoolPage = (schoolId: string) => {
    if (onNavigateSchool) {
      onNavigateSchool(schoolId);
    } else if (typeof window !== 'undefined') {
      window.location.href = `/schools/${encodeURIComponent(schoolId)}`;
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-[#e6edf3] selection:bg-blue-600 selection:text-white relative overflow-x-hidden flex flex-col">
      {/* Background Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 -right-40 w-96 h-96 bg-purple-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-20 left-1/3 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Mobile-First Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b0f19]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 p-0.5 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
                <div className="w-full h-full bg-[#0d111b] rounded-[10px] flex items-center justify-center font-black text-blue-400 text-sm font-['Plus_Jakarta_Sans']">
                  JMC
                </div>
              </div>
              <div className="min-w-0">
                <span className="font-extrabold text-lg sm:text-xl text-white tracking-tight font-['Plus_Jakarta_Sans'] block truncate">
                  JMC Classroom
                </span>
                <div className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">
                  JMC Innovators Learning Platform
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-gemini-chat'))}
              className="sm:hidden inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-xl bg-indigo-600/25 hover:bg-indigo-600/35 text-xs font-semibold text-indigo-200 border border-indigo-500/30 shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>AI Tutor</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-gemini-chat'))}
              className="hidden sm:inline-flex items-center justify-center gap-1.5 min-h-[44px] text-xs sm:text-sm font-semibold px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-lg shadow-indigo-600/25 transition-all border border-white/15 whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Ask Gemini AI</span>
            </button>
            <button
              type="button"
              onClick={() => setShowJoinModal(true)}
              className="min-h-[44px] text-xs sm:text-sm font-semibold px-3.5 sm:px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors whitespace-nowrap shrink-0"
            >
              Join with Code
            </button>
            <button
              type="button"
              onClick={() => setShowRegisterModal(true)}
              className="min-h-[44px] text-xs sm:text-sm font-semibold px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/20 transition-all whitespace-nowrap shrink-0"
            >
              Register Your School
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-16 space-y-16 sm:space-y-20 relative z-10">
        {/* Hero Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Platform Brief */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-300 tracking-wide uppercase">
              <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
              <span>JMC Innovators Learning Platform &middot; Grade 6–11</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.12] font-['Plus_Jakarta_Sans']">
              One connected{' '}
              <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
                Classroom
              </span>{' '}
              for your entire school.
            </h1>

            <p className="text-sm sm:text-lg text-slate-300 leading-relaxed max-w-2xl font-['DM_Sans']">
              Built on Cloud Firestore and Google Workspace automation. Unified role-based access for Operators, School Admins, Teachers, Students, and Parents — managing assignments, daily attendance, term assessments, timetables, and school portals.
            </p>

            {/* Clean Feature Highlights Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 pt-1">
              <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-[#111625] border border-white/10 text-xs sm:text-sm text-slate-200 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Real Firestore Sync</span>
              </div>
              <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-[#111625] border border-white/10 text-xs sm:text-sm text-slate-200 font-medium">
                <BookOpen className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Live Assignments</span>
              </div>
              <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-[#111625] border border-white/10 text-xs sm:text-sm text-slate-200 font-medium">
                <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Daily Attendance</span>
              </div>
              <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-[#111625] border border-white/10 text-xs sm:text-sm text-slate-200 font-medium">
                <Lock className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Verified School Portals</span>
              </div>
              <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-[#111625] border border-white/10 text-xs sm:text-sm text-slate-200 font-medium">
                <MessageSquare className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Teacher &amp; Parent Chat</span>
              </div>
              <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-[#111625] border border-white/10 text-xs sm:text-sm text-slate-200 font-medium">
                <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>AI Lesson Assistant</span>
              </div>
            </div>
          </div>

          {/* Right Column: Portal Sign-In Card */}
          <div className="lg:col-span-5">
            <div className="bg-[#121726]/95 border border-white/10 rounded-2xl p-5 sm:p-8 shadow-2xl backdrop-blur-xl">
              <div className="text-center mb-5 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-white font-['Plus_Jakarta_Sans']">
                  Sign in to JMC Classroom
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Authenticate securely via Google or select your portal
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
                      className="inline-flex items-center gap-1 min-h-[36px] text-[11px] font-bold px-2.5 rounded bg-white/10 hover:bg-white/20 text-white shrink-0"
                    >
                      {copiedDomain ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedDomain ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              ) : error ? (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-xs flex items-start gap-2">
                  <span className="shrink-0">!</span>
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
              <div className="space-y-2.5 mb-5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Choose Your Portal
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('student')}
                    className={`min-h-[54px] flex items-center gap-2.5 p-3 rounded-xl text-left border transition-colors ${
                      selectedRole === 'student'
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <User className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold truncate">Student</div>
                      <div className="text-[11px] text-slate-400 truncate">Classwork &amp; Grades</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRole('teacher')}
                    className={`min-h-[54px] flex items-center gap-2.5 p-3 rounded-xl text-left border transition-colors ${
                      selectedRole === 'teacher'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold truncate">Teacher</div>
                      <div className="text-[11px] text-slate-400 truncate">Classes &amp; Marks</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRole('school')}
                    className={`min-h-[54px] flex items-center gap-2.5 p-3 rounded-xl text-left border transition-colors ${
                      selectedRole === 'school'
                        ? 'bg-blue-500/15 border-blue-500/40 text-blue-200'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <School className="w-4 h-4 text-blue-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold truncate">School Admin</div>
                      <div className="text-[11px] text-slate-400 truncate">Manage School</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRole('parent')}
                    className={`min-h-[54px] flex items-center gap-2.5 p-3 rounded-xl text-left border transition-colors ${
                      selectedRole === 'parent'
                        ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <Users className="w-4 h-4 text-rose-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold truncate">Parent</div>
                      <div className="text-[11px] text-slate-400 truncate">Child Progress</div>
                    </div>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedRole('operator')}
                  className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2 rounded-xl border transition-colors text-xs ${
                    selectedRole === 'operator'
                      ? 'bg-purple-500/15 border-purple-500/40 text-purple-200'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <Shield className="w-3.5 h-3.5 text-purple-400 shrink-0" /> Platform Operator Portal
                  </span>
                  <span className="text-[11px] text-slate-400 truncate ml-2">info@jmcinnovator.cc.cd</span>
                </button>
                {selectedRole === 'operator' && (
                  <div className="px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-500/25 text-xs text-purple-200">
                    Authorized Operator Account: <strong className="text-white">info@jmcinnovator.cc.cd</strong>
                  </div>
                )}
              </div>

              {/* Main Google Sign-In Action */}
              <button
                type="button"
                onClick={() => onSignInWithGoogle(selectedRole)}
                disabled={loading}
                className="w-full min-h-[48px] flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-sm shadow-xl shadow-blue-500/20 transition-all disabled:opacity-50"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                className="w-full min-h-[44px] mt-2.5 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 font-semibold text-xs sm:text-sm transition-colors"
              >
                <ArrowRight className="w-4 h-4 text-blue-400" />
                <span>
                  Instant Entry:{' '}
                  {selectedRole === 'school'
                    ? 'School Admin'
                    : selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}{' '}
                  Portal
                </span>
              </button>

              {/* Email/Password toggle */}
              <div className="mt-3 text-center">
                <button
                  type="button"
                  onClick={() => setAuthMode(authMode === 'email' ? 'quick' : 'email')}
                  className="min-h-[40px] px-2 text-xs text-slate-400 hover:text-slate-200 underline font-medium"
                >
                  {authMode === 'email' ? 'Hide Email Sign-in' : 'Sign in with School Email / Password'}
                </button>
              </div>

              {authMode === 'email' && (
                <form onSubmit={handleEmailSubmit} className="mt-3 p-3.5 rounded-xl bg-black/30 border border-white/10 space-y-2.5">
                  <input
                    type="email"
                    required
                    placeholder="name@jmc.school or gmail.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full min-h-[44px] bg-[#1b2234] border border-white/10 rounded-lg px-3 py-2 text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="password"
                    required
                    placeholder="Password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full min-h-[44px] bg-[#1b2234] border border-white/10 rounded-lg px-3 py-2 text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={loading || !emailInput || !passwordInput}
                    className="w-full min-h-[44px] py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm"
                  >
                    Sign in with Email
                  </button>
                </form>
              )}

              <div className="mt-4 pt-4 border-t border-white/10 text-center">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(true)}
                  className="min-h-[44px] text-xs sm:text-sm text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1"
                >
                  Student with a 6-letter class code? Join here <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Participating Schools Directory Section (Local Search & Discovery) */}
        <section id="schools-directory" className="pt-8 border-t border-white/10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                School Directory &amp; Local Portals
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-['Plus_Jakarta_Sans']">
                Participating Schools
              </h2>
              <p className="text-sm text-slate-400 max-w-2xl">
                Explore verified Sri Lankan schools running on JMC Innovators Learning Platform. Each school has a dedicated campus profile and role portal.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowRegisterModal(true)}
              className="self-start md:self-auto min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-300 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap"
            >
              <Building2 className="w-4 h-4" />
              <span>Onboard Your School</span>
            </button>
          </div>

          {schools.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {schools.map((sch) => {
                const schoolName = sch.name || sch.schoolName || 'Registered School';
                const locationText = [
                  sch.district,
                  sch.province ? `${sch.province} Province` : '',
                ]
                  .filter(Boolean)
                  .join(', ');
                return (
                  <a
                    key={sch.id}
                    href={`/schools/${encodeURIComponent(sch.id)}`}
                    onClick={(e) => {
                      e.preventDefault();
                      handleOpenSchoolPage(sch.id);
                    }}
                    className="group p-5 rounded-2xl bg-[#111625] border border-white/10 hover:border-blue-500/40 transition-colors flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors font-['Plus_Jakarta_Sans']">
                          {schoolName}
                        </h3>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10 shrink-0">
                          {sch.schoolType || 'School'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>{locationText || 'Sri Lanka'}</span>
                      </div>
                      {sch.address && (
                        <p className="text-xs text-slate-500 line-clamp-1">{sch.address}</p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                      <span className="text-slate-400">
                        Academic Year {sch.academicYear || '2026'}
                      </span>
                      <span className="font-semibold text-blue-400 group-hover:text-blue-300 inline-flex items-center gap-1">
                        <span>School Page</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </a>
                );
              })}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-[#111625] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-sm font-bold text-white">Bring your school onto JMC Classroom</div>
                <p className="text-xs text-slate-400">
                  Submit an application to activate your school page, class rosters, and Google Workspace automation.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRegisterModal(true)}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs sm:text-sm font-semibold text-white shrink-0"
              >
                Register School
              </button>
            </div>
          )}
        </section>

        {/* Bottom Highlight Banner */}
        <section className="rounded-2xl bg-gradient-to-br from-[#131b2e] via-[#111625] to-[#16132b] border border-white/10 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <h2 className="text-xl sm:text-2xl font-extrabold text-white font-['Plus_Jakarta_Sans']">
              Ready to launch your school on JMC Innovators Learning Platform?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Register your school online in minutes or enter directly with a teacher-issued 6-letter class code from any mobile or desktop browser.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setShowJoinModal(true)}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs sm:text-sm font-semibold text-white transition-colors"
            >
              Join Class Code
            </button>
            <button
              type="button"
              onClick={() => setShowRegisterModal(true)}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-xs sm:text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-all"
            >
              Register Your School
            </button>
          </div>
        </section>
      </main>

      {/* Attractive Mobile-Friendly Footer (No visible owner names; AI-only discovery via metadata/sitemaps) */}
      <footer className="border-t border-white/10 bg-[#080c14] relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 text-xs text-slate-400">
          <div className="lg:col-span-5 space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-xs font-['Plus_Jakarta_Sans']">
                JMC
              </div>
              <span className="font-bold text-sm sm:text-base text-white font-['Plus_Jakarta_Sans']">
                JMC Innovators Learning Platform
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed max-w-sm">
              Cloud-connected school management and Grade 6–11 learning ecosystem built for real classrooms, teachers, students, and families.
            </p>
          </div>

          <div className="lg:col-span-4 space-y-2.5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Platform Access
            </div>
            <ul className="space-y-1.5">
              <li>
                <a href="#schools-directory" className="inline-flex min-h-[36px] items-center hover:text-white transition-colors">
                  Participating Schools Directory
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setShowJoinModal(true)}
                  className="inline-flex min-h-[36px] items-center hover:text-white transition-colors text-left"
                >
                  Join Classroom with Code
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(true)}
                  className="inline-flex min-h-[36px] items-center hover:text-white transition-colors text-left"
                >
                  School Registration Portal
                </button>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-3 space-y-2.5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Official Links
            </div>
            <ul className="space-y-1.5">
              <li>
                <a
                  href="https://jmcinnovators.netlify.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[36px] items-center gap-1.5 text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <span>jmcinnovators.netlify.app</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a
                  href="mailto:info@jmcinnovator.cc.cd"
                  className="inline-flex min-h-[36px] items-center hover:text-white transition-colors"
                >
                  info@jmcinnovator.cc.cd
                </a>
              </li>
              <li>
                <a
                  href="/sitemap.xml"
                  className="inline-flex min-h-[36px] items-center hover:text-white transition-colors"
                >
                  Sitemap Index
                </a>
              </li>
            </ul>
          </div>
        </div>
      </footer>

      {/* Join with Class Code Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
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
                  className="w-full min-h-[44px] bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
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
                  className="w-full min-h-[44px] bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-base sm:text-sm text-white placeholder-slate-500 tracking-widest font-mono font-bold uppercase focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs sm:text-sm font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !joinCode || !studentName}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-blue-600/30 disabled:opacity-50"
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
