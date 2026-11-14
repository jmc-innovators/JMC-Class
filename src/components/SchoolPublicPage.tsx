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
import { PageLoader, InlineSpinner } from './PageLoader';
import campusLibraryImg from '../assets/images/campus_library_learning_1794646583834.jpg';

interface SchoolPublicPageProps {
  school: School | null;
  schoolId: string;
  allSchools: School[];
  schoolsLoading: boolean;
  onBackHome: () => void;
  onSelectSchoolPage: (schoolId: string) => void;
  onSignInWithGoogle: (preferredRole?: UserRole, targetSchoolId?: string) => Promise<void>;
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
  const [bannerImgFailed, setBannerImgFailed] = useState(false);

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
    return <PageLoader variant="school" />;
  }

  if (!school) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
        <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onBackHome}
              className="inline-flex items-center gap-2 min-h-[44px] px-3 rounded-xl text-sm font-semibold text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-blue-600" />
              <span>JMC Innovators Learning Platform</span>
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-16 text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-500">
            <SchoolIcon className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
            School Profile Not Found
          </h1>
          <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            The requested school record ({schoolId}) could not be located or may not yet be published. Explore active schools on the platform or submit a school registration request.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={onBackHome}
              className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
            >
              Return to Learning Platform
            </button>
            <button
              type="button"
              onClick={() => setShowRegisterModal(true)}
              className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-sm font-semibold transition-colors"
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col selection:bg-blue-600 selection:text-white relative overflow-x-hidden">
      {/* Navigation Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onBackHome();
            }}
            className="inline-flex items-center gap-2.5 min-h-[44px] text-left group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-white text-xs font-['Plus_Jakarta_Sans'] shrink-0 shadow-sm">
              JMC
            </div>
            <div>
              <div className="font-bold text-sm sm:text-base text-slate-900 tracking-tight font-['Plus_Jakarta_Sans'] group-hover:text-blue-700 transition-colors">
                JMC Classroom
              </div>
              <div className="text-[11px] text-slate-500 hidden sm:block">
                JMC Innovators Learning Platform
              </div>
            </div>
          </a>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onBackHome}
              className="inline-flex items-center gap-1.5 min-h-[42px] px-3 sm:px-3.5 rounded-xl bg-white hover:bg-slate-50 text-xs sm:text-sm font-semibold text-slate-700 border border-slate-300 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
              <span>All Schools</span>
            </button>
            <button
              type="button"
              onClick={() => setShowJoinModal(true)}
              className="min-h-[42px] px-3.5 sm:px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm font-semibold text-white transition-colors shadow-sm"
            >
              Join Class Code
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10 relative z-10 space-y-10">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onBackHome();
            }}
            className="hover:text-blue-700 transition-colors"
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
            className="hover:text-blue-700 transition-colors"
          >
            Schools
          </a>
          <span aria-hidden="true">/</span>
          <span className="text-slate-900 font-semibold truncate max-w-[240px] sm:max-w-none">{schoolName}</span>
        </nav>

        {/* Campus Banner Hero & Portal Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* School Overview + 16:9 Campus Banner */}
          <section className="lg:col-span-7 space-y-6">
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-gradient-to-br from-blue-100 to-indigo-100 aspect-video shadow-md">
              {!bannerImgFailed && (
                <img
                  src={campusLibraryImg}
                  alt={`${schoolName} digital campus study hall`}
                  referrerPolicy="no-referrer"
                  onError={() => setBannerImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/35 to-transparent flex flex-col justify-end p-5 sm:p-7">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-200 uppercase tracking-wider">
                  <MapPin className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                  <span>{locationLabel}</span>
                </div>
                <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight font-['Plus_Jakarta_Sans'] mt-1">
                  {schoolName}
                </h1>
                <p className="text-xs sm:text-sm text-slate-200 mt-1.5 max-w-xl">
                  {schoolType} · Academic Year {academicYear} · Grade 6–11 Digital Portal
                </p>
              </div>
            </div>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Official digital campus portal for <strong className="text-slate-900">{schoolName}</strong> ({schoolType}) on the{' '}
              <strong className="text-slate-900">JMC Innovators Learning Platform</strong>. Built for Grade 6–11 classrooms in{' '}
              {district}
              {province ? `, ${province} Province` : ''}, supporting teachers, students, school administrators, and parents.
            </p>

            {/* Structured Local Directory Metadata Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Location &amp; Address
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  {school.address ? `${school.address}, ${district}` : district}
                </div>
                <div className="text-xs text-slate-500">
                  {province ? `${province} Province, Sri Lanka` : 'Sri Lanka'}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Institution Profile
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  {schoolType} · Academic Year {academicYear}
                </div>
                <div className="text-xs text-slate-500">Grade 6 – Grade 11 Curriculum Support</div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Digital Classroom Features
                </div>
                <div className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Active Cloud Campus</span>
                </div>
                <div className="text-xs text-slate-500">Assignments, Attendance, Assessments &amp; Chat</div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  School Website
                </div>
                {school.website && /^https?:\/\//i.test(school.website) ? (
                  <a
                    href={school.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800 break-all"
                  >
                    <Globe className="w-4 h-4 shrink-0" />
                    <span>{school.website.replace(/^https?:\/\//i, '')}</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>
                ) : (
                  <div className="text-sm font-medium text-slate-700">
                    Managed via JMC Innovators Learning Platform
                  </div>
                )}
                <div className="text-xs text-slate-500">Verified Institution Record</div>
              </div>
            </div>

            {/* Crawlable Local Summary Block */}
            <article className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                Academic Portal &amp; Local Learning Access
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Students and teachers at {schoolName} in {locationLabel} can access real-time subject classes, digital homework submissions, daily attendance logs, term exam marks, and parent progress updates from mobile or desktop devices.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs text-slate-700 font-medium">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Grade 6–11 Subjects</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Daily Attendance Sync</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>AI Study Assistance</span>
                </div>
              </div>
            </article>
          </section>

          {/* Right Column: School-Scoped Sign-In Card */}
          <aside className="lg:col-span-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-xl shadow-slate-200/70 space-y-5">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                  Sign in to {schoolName}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Choose your portal role to enter {schoolName}
                </p>
              </div>

              {error && isUnauthorizedDomain ? (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                  <div className="font-bold text-amber-800 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 shrink-0 text-amber-600" /> Authorize Domain in Firebase Auth
                  </div>
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
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs break-words">
                  {error}
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedRole('student')}
                  className={`min-h-[52px] flex items-center gap-2 p-3 rounded-xl text-left border transition-colors ${
                    selectedRole === 'student'
                      ? 'bg-amber-50 border-amber-400 text-amber-950 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <User className="w-4 h-4 text-amber-600 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">Student</div>
                    <div className="text-[10px] text-slate-500 truncate">Classwork</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('teacher')}
                  className={`min-h-[52px] flex items-center gap-2 p-3 rounded-xl text-left border transition-colors ${
                    selectedRole === 'teacher'
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-950 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <GraduationCap className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">Teacher</div>
                    <div className="text-[10px] text-slate-500 truncate">Classes &amp; Marks</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('school')}
                  className={`min-h-[52px] flex items-center gap-2 p-3 rounded-xl text-left border transition-colors ${
                    selectedRole === 'school'
                      ? 'bg-blue-50 border-blue-400 text-blue-950 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <SchoolIcon className="w-4 h-4 text-blue-600 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">School Admin</div>
                    <div className="text-[10px] text-slate-500 truncate">Manage School</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('parent')}
                  className={`min-h-[52px] flex items-center gap-2 p-3 rounded-xl text-left border transition-colors ${
                    selectedRole === 'parent'
                      ? 'bg-rose-50 border-rose-400 text-rose-950 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Users className="w-4 h-4 text-rose-600 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">Parent</div>
                    <div className="text-[10px] text-slate-500 truncate">Progress</div>
                  </div>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRole('operator')}
                className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2 rounded-xl border transition-colors text-xs ${
                  selectedRole === 'operator'
                    ? 'bg-purple-50 border-purple-400 text-purple-950 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-2 font-semibold">
                  <Shield className="w-3.5 h-3.5 text-purple-600" /> Platform Operator
                </span>
                <span className="text-[11px] text-slate-500">System Admin</span>
              </button>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => onSignInWithGoogle(selectedRole, school.id)}
                  disabled={loading}
                  className="w-full min-h-[46px] flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/20 transition-all disabled:opacity-50"
                >
                  {loading && <InlineSpinner className="w-4 h-4 text-white" />}
                  <span>{loading ? 'Authenticating…' : 'Continue with Google'}</span>
                </button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setAuthMode(authMode === 'email' ? 'quick' : 'email')}
                  className="min-h-[40px] px-2 text-xs text-slate-600 hover:text-slate-900 underline font-medium"
                >
                  {authMode === 'email' ? 'Hide Email Sign-in' : 'Sign in with School Email & Password'}
                </button>
              </div>

              {authMode === 'email' && (
                <form onSubmit={handleEmailSubmit} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <input
                    type="email"
                    required
                    placeholder="School Email Address"
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

              <div className="pt-3 border-t border-slate-200 text-center">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(true)}
                  className="min-h-[44px] text-xs sm:text-sm text-blue-700 hover:text-blue-800 font-semibold inline-flex items-center gap-1"
                >
                  Student with a 6-letter class code? Join here <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </aside>
        </div>

        {/* Other Participating Schools Discovery Strip */}
        {otherSchools.length > 0 && (
          <section className="pt-6 border-t border-slate-200 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                  More Schools on JMC Innovators Learning Platform
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                  Browse local school portals indexed across Sri Lanka.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRegisterModal(true)}
                className="self-start sm:self-auto min-h-[44px] px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-xs sm:text-sm font-semibold text-slate-800 transition-colors"
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
                  className="group p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                      {item.name}
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      {[item.district, item.province ? `${item.province} Province` : '']
                        .filter(Boolean)
                        .join(', ') || 'Sri Lanka'}
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-blue-700 inline-flex items-center gap-1">
                    <span>Open School Portal</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Light Footer (No visible owner names) */}
      <footer className="border-t border-slate-200 bg-white relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-600">
          <div className="space-y-1">
            <div className="font-bold text-sm text-slate-900 font-['Plus_Jakarta_Sans']">
              JMC Innovators Learning Platform
            </div>
            <p className="text-slate-600">
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
              className="min-h-[40px] inline-flex items-center hover:text-blue-700 transition-colors"
            >
              Platform Home
            </a>
            <a
              href="https://jmcinnovators.netlify.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[40px] inline-flex items-center gap-1 text-blue-700 hover:text-blue-800 transition-colors"
            >
              <span>jmcinnovators.netlify.app</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a href="mailto:info@jmcinnovator.cc.cd" className="min-h-[40px] inline-flex items-center hover:text-blue-700 transition-colors">
              info@jmcinnovator.cc.cd
            </a>
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
                  placeholder="e.g. MC9A82"
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
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm font-semibold text-white inline-flex items-center justify-center gap-2 disabled:opacity-50"
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
