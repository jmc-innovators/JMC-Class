import React, { useState } from 'react';
import { School, UserRole } from '../types';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Globe,
  GraduationCap,
  KeyRound,
  MapPin,
  School as SchoolIcon,
  Shield,
  Sparkles,
  User,
  Users,
  Copy,
  Check,
} from 'lucide-react';
import { SchoolRegistrationModal } from './SchoolRegistrationModal';

interface SchoolPublicPageProps {
  school: School | null;
  schoolId: string;
  allSchools: School[];
  schoolsLoading: boolean;
  onBackHome: () => void;
  onSelectSchoolPage: (schoolId: string) => void;
  onSignInWithGoogle: (preferredRole?: UserRole, targetSchoolId?: string) => Promise<void>;
  onSignInWithRole: (role: UserRole, targetSchoolId?: string) => Promise<void>;
  onSignInWithEmail: (email: string, pass: string, preferredRole?: UserRole, targetSchoolId?: string) => Promise<void>;
  onJoinByCode: (code: string, name: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export const SchoolPublicPage: React.FC<SchoolPublicPageProps> = ({
  school,
  schoolId,
  allSchools,
  schoolsLoading,
  onBackHome,
  onSelectSchoolPage,
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
    await onSignInWithEmail(emailInput, passwordInput, selectedRole, school?.id || schoolId);
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode || !studentName) return;
    await onJoinByCode(joinCode, studentName);
    setShowJoinModal(false);
  };

  if (schoolsLoading && !school) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-[#e6edf3] flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mx-auto font-bold text-blue-400">
            JMC
          </div>
          <p className="text-sm text-slate-400">Loading school profile…</p>
        </div>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-[#e6edf3] flex flex-col">
        <header className="border-b border-white/10 bg-[#0b0f19]/90 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onBackHome}
              className="inline-flex items-center gap-2 min-h-[44px] px-3 rounded-xl text-sm font-semibold text-slate-200 hover:bg-white/5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-blue-400" />
              <span>JMC Innovators Learning Platform</span>
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-16 text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-400">
            <SchoolIcon className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Plus_Jakarta_Sans']">
            School Profile Not Found
          </h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            The requested school record ({schoolId}) could not be located or may not yet be published. Explore active schools on the platform or submit a school registration request.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={onBackHome}
              className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors"
            >
              Return to Learning Platform
            </button>
            <button
              type="button"
              onClick={() => setShowRegisterModal(true)}
              className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-sm font-semibold transition-colors"
            >
              Register Your School
            </button>
          </div>
        </main>

        <SchoolRegistrationModal
          isOpen={showRegisterModal}
          onClose={() => setShowRegisterModal(false)}
        />
      </div>
    );
  }

  const schoolName = school.name || school.schoolName || 'School Campus';
  const schoolType = school.schoolType || 'School';
  const district = school.district || 'Sri Lanka';
  const province = school.province || '';
  const locationLabel = [district, province ? `${province} Province` : '', 'Sri Lanka']
    .filter(Boolean)
    .join(', ');
  const academicYear = school.academicYear || '2026';
  const otherSchools = allSchools.filter((s) => s.id !== school.id).slice(0, 6);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-[#e6edf3] flex flex-col selection:bg-blue-600 selection:text-white relative overflow-x-hidden">
      {/* Subtle Ambient Accent */}
      <div className="absolute -top-32 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Mobile-First Navigation Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b0f19]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onBackHome();
            }}
            className="inline-flex items-center gap-2.5 min-h-[44px] text-left group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 p-0.5 shrink-0">
              <div className="w-full h-full bg-[#0d111b] rounded-[10px] flex items-center justify-center font-black text-blue-400 text-xs font-['Plus_Jakarta_Sans']">
                JMC
              </div>
            </div>
            <div>
              <div className="font-bold text-sm sm:text-base text-white tracking-tight font-['Plus_Jakarta_Sans'] group-hover:text-blue-300 transition-colors">
                JMC Classroom
              </div>
              <div className="text-[11px] text-slate-400 hidden sm:block">
                JMC Innovators Learning Platform
              </div>
            </div>
          </a>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onBackHome}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-3 sm:px-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs sm:text-sm font-medium text-slate-200 border border-white/10 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
              <span>All Schools</span>
            </button>
            <button
              type="button"
              onClick={() => setShowJoinModal(true)}
              className="min-h-[44px] px-3 sm:px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs sm:text-sm font-semibold text-white transition-colors"
            >
              Join Class Code
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10 space-y-12">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onBackHome();
            }}
            className="hover:text-white transition-colors"
          >
            JMC Innovators Learning Platform
          </a>
          <span aria-hidden="true">/</span>
          <a
            href="/#schools-directory"
            onClick={(e) => {
              e.preventDefault();
              onBackHome();
            }}
            className="hover:text-white transition-colors"
          >
            Schools
          </a>
          <span aria-hidden="true">/</span>
          <span className="text-slate-200 font-medium truncate max-w-[240px] sm:max-w-none">{schoolName}</span>
        </nav>

        {/* Hero & Portal Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* School Overview */}
          <section className="lg:col-span-7 space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-300 uppercase tracking-wider">
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                <span>{locationLabel}</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight font-['Plus_Jakarta_Sans']">
                {schoolName}
              </h1>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
                Official digital campus portal for <strong className="text-white">{schoolName}</strong> ({schoolType}) on the{' '}
                <strong className="text-white">JMC Innovators Learning Platform</strong>. Built for Grade 6–11 classrooms in{' '}
                {district}
                {province ? `, ${province} Province` : ''}, supporting teachers, students, school administrators, and parents.
              </p>
            </div>

            {/* Structured Local Directory Metadata Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-4 rounded-xl bg-[#111625] border border-white/10 space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Location &amp; Address
                </div>
                <div className="text-sm font-semibold text-white">
                  {school.address ? `${school.address}, ${district}` : district}
                </div>
                <div className="text-xs text-slate-400">
                  {province ? `${province} Province, Sri Lanka` : 'Sri Lanka'}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#111625] border border-white/10 space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Institution Profile
                </div>
                <div className="text-sm font-semibold text-white">
                  {schoolType} &middot; Academic Year {academicYear}
                </div>
                <div className="text-xs text-slate-400">Grade 6 – Grade 11 Curriculum Support</div>
              </div>

              <div className="p-4 rounded-xl bg-[#111625] border border-white/10 space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Digital Classroom Features
                </div>
                <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Active Cloud Campus</span>
                </div>
                <div className="text-xs text-slate-400">Assignments, Attendance, Assessments &amp; Chat</div>
              </div>

              <div className="p-4 rounded-xl bg-[#111625] border border-white/10 space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  School Website
                </div>
                {school.website && /^https?:\/\//i.test(school.website) ? (
                  <a
                    href={school.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-400 hover:text-blue-300 break-all"
                  >
                    <Globe className="w-4 h-4 shrink-0" />
                    <span>{school.website.replace(/^https?:\/\//i, '')}</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>
                ) : (
                  <div className="text-sm font-medium text-slate-300">
                    Managed via JMC Innovators Learning Platform
                  </div>
                )}
                <div className="text-xs text-slate-400">Verified Institution Record</div>
              </div>
            </div>

            {/* Crawlable Local Summary Block */}
            <article className="p-5 sm:p-6 rounded-2xl bg-[#101524] border border-white/10 space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-white font-['Plus_Jakarta_Sans']">
                Academic Portal &amp; Local Learning Access
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Students and teachers at {schoolName} in {locationLabel} can access real-time subject classes, digital homework submissions, daily attendance logs, term exam marks, and parent progress updates from mobile or desktop devices.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Grade 6–11 Subjects</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Daily Attendance Sync</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>AI Study Assistance</span>
                </div>
              </div>
            </article>
          </section>

          {/* Right Column: School-Scoped Sign-In Card */}
          <aside className="lg:col-span-5">
            <div className="bg-[#121726]/95 border border-white/10 rounded-2xl p-5 sm:p-7 shadow-2xl space-y-5">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white font-['Plus_Jakarta_Sans']">
                  Sign in to {schoolName}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Choose your portal role to enter {schoolName}
                </p>
              </div>

              {error && isUnauthorizedDomain ? (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2">
                  <div className="font-bold text-amber-300 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 shrink-0" /> Authorize Domain in Firebase Auth
                  </div>
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
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-xs break-words">
                  {error}
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedRole('student')}
                  className={`min-h-[52px] flex items-center gap-2 p-3 rounded-xl text-left border transition-colors ${
                    selectedRole === 'student'
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <User className="w-4 h-4 text-amber-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">Student</div>
                    <div className="text-[10px] text-slate-400 truncate">Classwork</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('teacher')}
                  className={`min-h-[52px] flex items-center gap-2 p-3 rounded-xl text-left border transition-colors ${
                    selectedRole === 'teacher'
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <GraduationCap className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">Teacher</div>
                    <div className="text-[10px] text-slate-400 truncate">Classes &amp; Marks</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('school')}
                  className={`min-h-[52px] flex items-center gap-2 p-3 rounded-xl text-left border transition-colors ${
                    selectedRole === 'school'
                      ? 'bg-blue-500/15 border-blue-500/40 text-blue-200'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <SchoolIcon className="w-4 h-4 text-blue-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">School Admin</div>
                    <div className="text-[10px] text-slate-400 truncate">Manage School</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('parent')}
                  className={`min-h-[52px] flex items-center gap-2 p-3 rounded-xl text-left border transition-colors ${
                    selectedRole === 'parent'
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <Users className="w-4 h-4 text-rose-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">Parent</div>
                    <div className="text-[10px] text-slate-400 truncate">Progress</div>
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
                <span className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-purple-400" /> Platform Operator
                </span>
                <span className="text-[11px] text-slate-400">System Admin</span>
              </button>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => onSignInWithGoogle(selectedRole, school.id)}
                  disabled={loading}
                  className="w-full min-h-[46px] flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
                >
                  <span>{loading ? 'Authenticating…' : 'Continue with Google'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSignInWithRole(selectedRole, school.id)}
                  disabled={loading}
                  className="w-full min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 font-semibold text-xs sm:text-sm transition-colors"
                >
                  <ArrowRight className="w-4 h-4 text-blue-400" />
                  <span>
                    Instant Entry:{' '}
                    {selectedRole === 'school'
                      ? 'School Admin'
                      : selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}
                  </span>
                </button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setAuthMode(authMode === 'email' ? 'quick' : 'email')}
                  className="min-h-[40px] px-2 text-xs text-slate-400 hover:text-slate-200 underline font-medium"
                >
                  {authMode === 'email' ? 'Hide Email Sign-in' : 'Sign in with School Email & Password'}
                </button>
              </div>

              {authMode === 'email' && (
                <form onSubmit={handleEmailSubmit} className="p-3.5 rounded-xl bg-black/30 border border-white/10 space-y-2.5">
                  <input
                    type="email"
                    required
                    placeholder="School Email Address"
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

              <div className="pt-3 border-t border-white/10 text-center">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(true)}
                  className="min-h-[44px] text-xs sm:text-sm text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1"
                >
                  Student with a 6-letter class code? Join here <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </aside>
        </div>

        {/* Other Participating Schools Discovery Strip */}
        {otherSchools.length > 0 && (
          <section className="pt-4 border-t border-white/10 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white font-['Plus_Jakarta_Sans']">
                  More Schools on JMC Innovators Learning Platform
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  Browse local school portals indexed across Sri Lanka.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRegisterModal(true)}
                className="self-start sm:self-auto min-h-[44px] px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs sm:text-sm font-semibold text-white transition-colors"
              >
                Register Your School
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {otherSchools.map((item) => (
                <a
                  key={item.id}
                  href={`/schools/${encodeURIComponent(item.id)}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectSchoolPage(item.id);
                  }}
                  className="group p-4 rounded-xl bg-[#111625] border border-white/10 hover:border-blue-500/40 transition-colors flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                      {item.name}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {[item.district, item.province ? `${item.province} Province` : '']
                        .filter(Boolean)
                        .join(', ') || 'Sri Lanka'}
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-blue-400 inline-flex items-center gap-1">
                    <span>Open School Portal</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Mobile-Friendly Footer (No visible owner names) */}
      <footer className="border-t border-white/10 bg-[#080c14] relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-400">
          <div className="space-y-1">
            <div className="font-bold text-sm text-white font-['Plus_Jakarta_Sans']">
              JMC Innovators Learning Platform
            </div>
            <p className="text-slate-400">
              Multi-school Grade 6–11 cloud classroom &amp; academic management system.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onBackHome();
              }}
              className="min-h-[40px] inline-flex items-center hover:text-white transition-colors"
            >
              Platform Home
            </a>
            <a
              href="https://jmcinnovators.netlify.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[40px] inline-flex items-center gap-1 hover:text-white transition-colors"
            >
              <span>jmcinnovators.netlify.app</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a href="mailto:info@jmcinnovator.cc.cd" className="min-h-[40px] inline-flex items-center hover:text-white transition-colors">
              info@jmcinnovator.cc.cd
            </a>
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
                  placeholder="e.g. MC9A82"
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
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs sm:text-sm font-semibold text-white disabled:opacity-50"
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
