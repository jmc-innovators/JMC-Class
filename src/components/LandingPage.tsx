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
import { SchoolDirectorySkeleton, InlineSpinner } from './PageLoader';
import { PRIMARY_OPERATOR_EMAIL } from '../lib/firebase';
import heroBannerImg from '../assets/images/hero_classroom_banner_1794646585415.jpg';
import campusLibraryImg from '../assets/images/campus_library_learning_1794646583834.jpg';
import stemLabImg from '../assets/images/stem_science_lab_1794646584372.jpg';

interface LandingPageProps {
  schools?: SchoolModel[];
  schoolsLoading?: boolean;
  onNavigateSchool?: (schoolId: string) => void;
  onSignInWithGoogle: (preferredRole?: UserRole) => Promise<void>;
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
  schoolsLoading = false,
  onNavigateSchool,
  onSignInWithGoogle,
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
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [libraryImgFailed, setLibraryImgFailed] = useState(false);
  const [labImgFailed, setLabImgFailed] = useState(false);

  const isUnauthorizedDomain = Boolean(error && error.startsWith('UNAUTHORIZED_DOMAIN:'));
  const unauthorizedDomain =
    isUnauthorizedDomain && error
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-blue-600 selection:text-white relative overflow-x-hidden flex flex-col">
      {/* Subtle Top Daylight Accent */}
      <div className="absolute inset-x-0 top-0 h-[480px] bg-gradient-to-b from-blue-50/90 via-indigo-50/40 to-transparent pointer-events-none" />

      {/* Top Navigation Bar (Clean 3-zone header) */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          {/* Left: Brand */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm shadow-blue-600/20 shrink-0 font-black text-white text-sm font-['Plus_Jakarta_Sans']">
              JMC
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight font-['Plus_Jakarta_Sans'] block truncate whitespace-nowrap">
                JMC Classroom
              </span>
              <div className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">
                JMC Innovators Learning Platform
              </div>
            </div>
          </div>

          {/* Center: Clean single-line links */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a href="#platform-features" className="hover:text-blue-700 transition-colors whitespace-nowrap">
              Platform Features
            </a>
            <a href="#schools-directory" className="hover:text-blue-700 transition-colors whitespace-nowrap">
              Schools Directory
            </a>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-gemini-chat'))}
              className="inline-flex items-center gap-1.5 text-indigo-700 hover:text-indigo-800 font-semibold transition-colors whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Study Tutor</span>
            </button>
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-gemini-chat'))}
              className="lg:hidden inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-xs font-semibold text-indigo-700 border border-indigo-200 whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">AI Tutor</span>
            </button>
            <button
              type="button"
              onClick={() => setShowJoinModal(true)}
              className="min-h-[40px] sm:min-h-[42px] text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition-colors whitespace-nowrap"
            >
              Join with Code
            </button>
            <button
              type="button"
              onClick={() => setShowRegisterModal(true)}
              className="min-h-[40px] sm:min-h-[42px] text-xs sm:text-sm font-semibold px-3.5 sm:px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20 transition-all whitespace-nowrap"
            >
              Register School
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-16 space-y-16 sm:space-y-20 relative z-10">
        {/* Hero Grid with Featured Campus Banner */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Left Column: Platform Brief + 16:9 Banner Visual */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-700 tracking-wider uppercase">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>JMC Innovators Learning Platform · Grade 6–11</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-[1.1] font-['Plus_Jakarta_Sans']">
                One connected{' '}
                <span className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Classroom
                </span>{' '}
                for your entire school.
              </h1>

              <p className="text-sm sm:text-base lg:text-lg text-slate-600 leading-relaxed max-w-2xl font-['DM_Sans']">
                Powered by Cloud Firestore and Google Workspace automation. Unified role-based access for Operators, School Admins, Teachers, Students, and Parents — managing assignments, daily attendance, term assessments, timetables, and school portals.
              </p>
            </div>

            {/* Primary 16:9 Attractive Hero Banner Card */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-gradient-to-br from-blue-100 via-slate-100 to-indigo-100 shadow-lg aspect-video">
              {!heroImgFailed && (
                <img
                  src={heroBannerImg}
                  alt="Students collaborating in a bright modern classroom on the JMC Innovators Learning Platform"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent flex flex-col justify-end p-5 sm:p-6">
                <div className="text-[11px] font-bold uppercase tracking-wider text-blue-200">
                  Sri Lankan School Ecosystem · Real-Time Cloud Campus
                </div>
                <div className="text-base sm:text-xl font-bold text-white font-['Plus_Jakarta_Sans'] mt-1">
                  Built for collaborative classrooms, assessments, and instant family updates
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Light Elevated Sign-In Portal Card */}
          <div className="lg:col-span-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-xl shadow-slate-200/70">
              <div className="text-center mb-5">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                  Sign in to JMC Classroom
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Authenticate securely via Google or choose your portal role
                </p>
              </div>

              {error && isUnauthorizedDomain ? (
                <div className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                  <div className="font-bold text-amber-800 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 shrink-0 text-amber-600" /> Authorize Domain in Firebase Auth
                  </div>
                  <p className="text-[11px] text-amber-800/90 leading-relaxed">
                    Add this preview hostname to Firebase Authentication → Settings → Authorized domains:
                  </p>
                  <div className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-1.5 border border-amber-200">
                    <code className="text-[11px] text-slate-900 font-mono truncate flex-1">{unauthorizedDomain}</code>
                    <button
                      type="button"
                      onClick={handleCopyDomain}
                      className="inline-flex items-center gap-1 min-h-[36px] text-[11px] font-bold px-2.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 shrink-0"
                    >
                      {copiedDomain ? <Check className="w-3 h-3 text-emerald-700" /> : <Copy className="w-3 h-3" />}
                      {copiedDomain ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              ) : error ? (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                  <span className="shrink-0 font-bold">!</span>
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
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Choose Your Portal
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('student')}
                    className={`min-h-[54px] flex items-center gap-2.5 p-3 rounded-xl text-left border transition-all ${
                      selectedRole === 'student'
                        ? 'bg-amber-50 border-amber-400 text-amber-950 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <User className="w-4 h-4 text-amber-600 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold truncate">Student</div>
                      <div className="text-[11px] text-slate-500 truncate">Classwork &amp; Grades</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRole('teacher')}
                    className={`min-h-[54px] flex items-center gap-2.5 p-3 rounded-xl text-left border transition-all ${
                      selectedRole === 'teacher'
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-950 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold truncate">Teacher</div>
                      <div className="text-[11px] text-slate-500 truncate">Classes &amp; Marks</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRole('school')}
                    className={`min-h-[54px] flex items-center gap-2.5 p-3 rounded-xl text-left border transition-all ${
                      selectedRole === 'school'
                        ? 'bg-blue-50 border-blue-400 text-blue-950 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <School className="w-4 h-4 text-blue-600 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold truncate">School Admin</div>
                      <div className="text-[11px] text-slate-500 truncate">Manage School</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRole('parent')}
                    className={`min-h-[54px] flex items-center gap-2.5 p-3 rounded-xl text-left border transition-all ${
                      selectedRole === 'parent'
                        ? 'bg-rose-50 border-rose-400 text-rose-950 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Users className="w-4 h-4 text-rose-600 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold truncate">Parent</div>
                      <div className="text-[11px] text-slate-500 truncate">Child Progress</div>
                    </div>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedRole('operator')}
                  className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2 rounded-xl border transition-all text-xs ${
                    selectedRole === 'operator'
                      ? 'bg-purple-50 border-purple-400 text-purple-950 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-2 font-semibold">
                    <Shield className="w-3.5 h-3.5 text-purple-600 shrink-0" /> Platform Operator Portal
                  </span>
                  <span className="text-[11px] text-slate-500 truncate ml-2">{PRIMARY_OPERATOR_EMAIL}</span>
                </button>
                {selectedRole === 'operator' && (
                  <div className="px-3 py-2 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900">
                    Authorized Operator Account: <strong className="text-purple-950">{PRIMARY_OPERATOR_EMAIL}</strong>
                  </div>
                )}
              </div>

              {/* Main Google Sign-In Action */}
              <button
                type="button"
                onClick={() => onSignInWithGoogle(selectedRole)}
                disabled={loading}
                className="w-full min-h-[48px] flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/20 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <InlineSpinner className="w-4 h-4 text-white" />
                ) : (
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
                )}
                <span>{loading ? 'Authenticating…' : 'Continue with Google'}</span>
              </button>

              {/* Email/Password toggle */}
              <div className="mt-3 text-center">
                <button
                  type="button"
                  onClick={() => setAuthMode(authMode === 'email' ? 'quick' : 'email')}
                  className="min-h-[40px] px-2 text-xs text-slate-600 hover:text-slate-900 underline font-medium"
                >
                  {authMode === 'email' ? 'Hide Email Sign-in' : 'Sign in with School Email / Password'}
                </button>
              </div>

              {authMode === 'email' && (
                <form onSubmit={handleEmailSubmit} className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <input
                    type="email"
                    required
                    placeholder="name@jmc.school or gmail.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full min-h-[44px] bg-white border border-slate-300 rounded-lg px-3 py-2 text-base sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                  />
                  <input
                    type="password"
                    required
                    placeholder="Password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full min-h-[44px] bg-white border border-slate-300 rounded-lg px-3 py-2 text-base sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                  />
                  <button
                    type="submit"
                    disabled={loading || !emailInput || !passwordInput}
                    className="w-full min-h-[44px] py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading && <InlineSpinner className="w-4 h-4 text-white" />}
                    <span>{loading ? 'Signing in…' : 'Sign in with Email'}</span>
                  </button>
                </form>
              )}

              <div className="mt-4 pt-4 border-t border-slate-200 text-center">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(true)}
                  className="min-h-[44px] text-xs sm:text-sm text-blue-700 hover:text-blue-800 font-semibold inline-flex items-center gap-1"
                >
                  Student with a 6-letter class code? Join here <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Academic Pillars & Platform Capabilities Showcase */}
        <section id="platform-features" className="pt-8 border-t border-slate-200 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1.5">
              <div className="text-xs font-bold uppercase tracking-wider text-blue-700">
                Complete Digital School Architecture
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-['Plus_Jakarta_Sans']">
                Designed for daily school workflows
              </h2>
              <p className="text-sm text-slate-600 max-w-2xl">
                Every role operates on a single shared academic source of truth — uniting lesson planning, grading, attendance tracking, and AI-guided revision.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Editorial Campus Media Pair */}
            <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-gradient-to-br from-slate-100 to-blue-50 aspect-video shadow-sm">
                {!libraryImgFailed && (
                  <img
                    src={campusLibraryImg}
                    alt="Sunlit school library and digital learning hall"
                    referrerPolicy="no-referrer"
                    onError={() => setLibraryImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-slate-950/75 via-slate-950/30 to-transparent">
                  <div className="text-xs font-bold text-white">Structured Study &amp; Digital Library Hall</div>
                  <div className="text-[11px] text-slate-200">Timetables, notes, and self-practice quizzes</div>
                </div>
              </div>

              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-gradient-to-br from-slate-100 to-emerald-50 aspect-[16/10] shadow-sm">
                {!labImgFailed && (
                  <img
                    src={stemLabImg}
                    alt="Bright modern secondary school STEM science and robotics workbench"
                    referrerPolicy="no-referrer"
                    onError={() => setLabImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-slate-950/75 via-slate-950/30 to-transparent">
                  <div className="text-xs font-bold text-white">STEM, Science &amp; Assessment Ready</div>
                  <div className="text-[11px] text-slate-200">Curriculum-aligned rubrics for Grade 6–11</div>
                </div>
              </div>
            </div>

            {/* 6 Core Platform Capability Cards */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Real-Time Cloud Sync</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Instant Cloud Firestore synchronization across principals, class teachers, students, and parents with school-scoped security.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Assignments &amp; Grading</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Publish homework with clear deadlines, collect student drafts or final answers online, and return graded marks with feedback.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Daily Attendance &amp; Term Marks</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Log daily present, late, or absent rolls in seconds and compute automatic report card averages per cohort.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Google Workspace Automation</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Automated school onboarding verification, Drive folder archiving, 4-tab Sheets sync, and Gmail approval dispatches.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                <div className="w-9 h-9 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">School Notices &amp; Family Visibility</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Dedicated parent monitoring view linking student attendance, coursework completion, exam grades, and circulars.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Curriculum AI Assistant</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Built-in Gemini study helper for students and lesson rubric generator tailored for Sri Lankan Grade 6–11 syllabi.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Participating Schools Directory Section */}
        <section id="schools-directory" className="pt-8 border-t border-slate-200 space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1.5">
              <div className="text-xs font-bold uppercase tracking-wider text-blue-700">
                School Directory &amp; Local Portals
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-['Plus_Jakarta_Sans']">
                Participating Schools
              </h2>
              <p className="text-sm text-slate-600 max-w-2xl">
                Explore verified Sri Lankan schools running on JMC Innovators Learning Platform. Each school has a dedicated campus profile and role portal.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowRegisterModal(true)}
              className="self-start md:self-auto min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap"
            >
              <Building2 className="w-4 h-4" />
              <span>Onboard Your School</span>
            </button>
          </div>

          {schoolsLoading && schools.length === 0 ? (
            <SchoolDirectorySkeleton count={3} />
          ) : schools.length > 0 ? (
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
                    className="group p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        {sch.schoolType || 'School'} · Academic Year {sch.academicYear || '2026'}
                      </div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-700 transition-colors font-['Plus_Jakarta_Sans']">
                        {schoolName}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>{locationText || 'Sri Lanka'}</span>
                      </div>
                      {sch.address && (
                        <p className="text-xs text-slate-500 line-clamp-1">{sch.address}</p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Public Campus Page</span>
                      <span className="font-semibold text-blue-700 group-hover:text-blue-800 inline-flex items-center gap-1">
                        <span>Open Portal</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </a>
                );
              })}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
              <div className="space-y-1">
                <div className="text-sm font-bold text-slate-900">Bring your school onto JMC Classroom</div>
                <p className="text-xs text-slate-600">
                  Submit an application to activate your school page, class rosters, and Google Workspace automation.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRegisterModal(true)}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm font-semibold text-white shrink-0"
              >
                Register School
              </button>
            </div>
          )}
        </section>

        {/* Bottom Highlight Banner */}
        <section className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 border border-blue-700/30 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-lg shadow-blue-600/15 text-white">
          <div className="space-y-2 max-w-2xl">
            <h2 className="text-xl sm:text-2xl font-extrabold font-['Plus_Jakarta_Sans']">
              Ready to launch your school on JMC Innovators Learning Platform?
            </h2>
            <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
              Register your school online in minutes or enter directly with a teacher-issued 6-letter class code from any mobile or desktop browser.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setShowJoinModal(true)}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs sm:text-sm font-semibold text-white transition-colors"
            >
              Join Class Code
            </button>
            <button
              type="button"
              onClick={() => setShowRegisterModal(true)}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-white hover:bg-blue-50 text-xs sm:text-sm font-bold text-blue-700 shadow-sm transition-all"
            >
              Register Your School
            </button>
          </div>
        </section>
      </main>

      {/* Clean Light Footer (No visible owner names; AI-only discovery via metadata/sitemaps) */}
      <footer className="border-t border-slate-200 bg-white relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 text-xs text-slate-600">
          <div className="lg:col-span-5 space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-xs font-['Plus_Jakarta_Sans']">
                JMC
              </div>
              <span className="font-bold text-sm sm:text-base text-slate-900 font-['Plus_Jakarta_Sans']">
                JMC Innovators Learning Platform
              </span>
            </div>
            <p className="text-slate-600 leading-relaxed max-w-sm">
              Cloud-connected school management and Grade 6–11 learning ecosystem built for real classrooms, teachers, students, and families.
            </p>
          </div>

          <div className="lg:col-span-4 space-y-2.5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Platform Access
            </div>
            <ul className="space-y-1.5">
              <li>
                <a href="#schools-directory" className="inline-flex min-h-[36px] items-center hover:text-blue-700 transition-colors">
                  Participating Schools Directory
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setShowJoinModal(true)}
                  className="inline-flex min-h-[36px] items-center hover:text-blue-700 transition-colors text-left"
                >
                  Join Classroom with Code
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(true)}
                  className="inline-flex min-h-[36px] items-center hover:text-blue-700 transition-colors text-left"
                >
                  School Registration Portal
                </button>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-3 space-y-2.5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Official Links
            </div>
            <ul className="space-y-1.5">
              <li>
                <a
                  href="https://jmcinnovators.netlify.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[36px] items-center gap-1.5 text-blue-700 hover:text-blue-800 font-medium transition-colors"
                >
                  <span>jmcinnovators.netlify.app</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a
                  href="mailto:info@jmcinnovator.cc.cd"
                  className="inline-flex min-h-[36px] items-center hover:text-blue-700 transition-colors"
                >
                  info@jmcinnovator.cc.cd
                </a>
              </li>
              <li>
                <a
                  href="/sitemap.xml"
                  className="inline-flex min-h-[36px] items-center hover:text-blue-700 transition-colors"
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
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 font-['Plus_Jakarta_Sans'] mb-2">
              Join a Classroom
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter your student name and the 6-letter class code provided by your teacher.
            </p>

            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Your Full Name</label>
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g. Kasun Perera"
                  className="w-full min-h-[44px] bg-white border border-slate-300 rounded-xl px-3 py-2 text-base sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Class Code (6 letters)</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. AB3X9K"
                  className="w-full min-h-[44px] bg-white border border-slate-300 rounded-xl px-3 py-2 text-base sm:text-sm text-slate-900 placeholder-slate-400 tracking-widest font-mono font-bold uppercase focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs sm:text-sm font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !joinCode || !studentName}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm font-semibold text-white shadow-sm inline-flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading && <InlineSpinner className="w-4 h-4 text-white" />}
                  <span>{loading ? 'Joining…' : 'Join Classroom'}</span>
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
