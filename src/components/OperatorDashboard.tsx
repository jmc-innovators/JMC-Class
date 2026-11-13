import React, { useState, useEffect, useCallback } from 'react';
import { School, UserProfile, AuditLog, SchoolApplication, ApplicationStatus } from '../types';
import {
  Shield,
  School as SchoolIcon,
  Plus,
  Trash2,
  ExternalLink,
  ClipboardList,
  Building2,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  FileCheck,
  RefreshCw,
  MapPin,
  Phone,
  Mail,
  Calendar,
  AlertCircle,
  Globe,
  Loader2,
  FileText,
  UserCheck,
  Building,
  Check,
  X,
  Sparkles,
} from 'lucide-react';
import {
  fetchSchoolApplications,
  approveSchoolApplication,
  rejectSchoolApplication,
} from '../lib/firestoreService';

interface OperatorDashboardProps {
  user: UserProfile;
  schools: School[];
  currentSchool: School | null;
  onSelectSchool: (school: School) => void;
  onCreateSchool: (data: {
    name: string;
    adminEmail: string;
    principalName: string;
    schoolType: string;
    district: string;
    province: string;
    phone: string;
    email: string;
    website: string;
    academicYear: string;
  }) => Promise<void>;
  onDeleteSchool: (schoolId: string) => Promise<void>;
  onRefreshSchools?: () => Promise<void>;
  auditLogs: AuditLog[];
  loading: boolean;
}

export const OperatorDashboard: React.FC<OperatorDashboardProps> = ({
  user,
  schools,
  currentSchool,
  onSelectSchool,
  onCreateSchool,
  onDeleteSchool,
  onRefreshSchools,
  auditLogs,
  loading,
}) => {
  const [activeTab, setActiveTab] = useState<'schools' | 'applications' | 'audit'>('applications');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    adminEmail: '',
    principalName: '',
    schoolType: 'National School',
    district: 'Jaffna',
    province: 'Northern Province',
    phone: '',
    email: '',
    website: '',
    academicYear: '2026',
  });
  const [submitting, setSubmitting] = useState(false);

  // Applications State
  const [applications, setApplications] = useState<SchoolApplication[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [appStatusTab, setAppStatusTab] = useState<ApplicationStatus>('PENDING');
  const [appSearch, setAppSearch] = useState('');
  const [selectedApp, setSelectedApp] = useState<SchoolApplication | null>(null);
  const [operatorRemarks, setOperatorRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [appsError, setAppsError] = useState<string | null>(null);
  const [confirmDeleteSchoolId, setConfirmDeleteSchoolId] = useState<string | null>(null);

  // Load applications
  const loadApplications = useCallback(async () => {
    setLoadingApps(true);
    setAppsError(null);
    try {
      const data = await fetchSchoolApplications(user.email);
      setApplications(data);
    } catch (err: any) {
      console.error('Failed to load applications:', err);
      let msg = err?.message || 'Failed to load school registration applications.';
      try {
        const parsed = JSON.parse(msg);
        if (parsed.error) msg = parsed.error;
      } catch {}
      setAppsError(msg);
    } finally {
      setLoadingApps(false);
    }
  }, [user.email]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const filteredSchools = schools.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.adminEmail || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.district || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.adminEmail) return;
    setSubmitting(true);
    try {
      await onCreateSchool(formData);
      setShowAddModal(false);
      setFormData({
        name: '',
        adminEmail: '',
        principalName: '',
        schoolType: 'National School',
        district: 'Jaffna',
        province: 'Northern Province',
        phone: '',
        email: '',
        website: '',
        academicYear: '2026',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Application Stats
  const totalAppsCount = applications.length;
  const pendingAppsCount = applications.filter((a) => a.status === 'PENDING').length;
  const approvedAppsCount = applications.filter((a) => a.status === 'APPROVED').length;
  const rejectedAppsCount = applications.filter((a) => a.status === 'REJECTED').length;

  // Filtered Applications by sub-tab and search
  const displayedApplications = applications.filter((app) => {
    const matchesTab = app.status === appStatusTab;
    const matchesSearch =
      !appSearch ||
      app.schoolName.toLowerCase().includes(appSearch.toLowerCase()) ||
      app.administratorEmail.toLowerCase().includes(appSearch.toLowerCase()) ||
      app.principalName.toLowerCase().includes(appSearch.toLowerCase()) ||
      app.district.toLowerCase().includes(appSearch.toLowerCase()) ||
      app.id.toLowerCase().includes(appSearch.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleOpenAppDetail = (app: SchoolApplication) => {
    setSelectedApp(app);
    setOperatorRemarks(app.operatorRemarks || '');
    setActionMessage(null);
  };

  const handleApprove = async () => {
    if (!selectedApp) return;
    setActionLoading(true);
    setActionMessage(null);

    try {
      const { schoolId } = await approveSchoolApplication(
        selectedApp.id,
        operatorRemarks.trim() || 'Verified and approved by JMC Platform Operator',
        user.uid,
        user.displayName || 'Platform Operator',
        user.email,
        selectedApp
      );

      // Refresh applications & school lists
      await loadApplications();
      if (onRefreshSchools) {
        await onRefreshSchools();
      }

      setActionMessage({
        type: 'success',
        text: `School approved successfully! Generated School ID: ${schoolId}. School document created in Firestore and automated approval email dispatched.`,
      });

      // Update selectedApp view
      setSelectedApp((prev) =>
        prev
          ? {
              ...prev,
              status: 'APPROVED',
              schoolId,
              approvalDate: new Date().toISOString(),
              operatorRemarks: operatorRemarks.trim() || 'Verified and approved by JMC Platform Operator',
            }
          : null
      );
    } catch (err: any) {
      console.error('Approval failed:', err);
      setActionMessage({
        type: 'error',
        text: err.message || 'Failed to approve school application. Please try again.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApp) return;
    setActionLoading(true);
    setActionMessage(null);

    try {
      const remarks = operatorRemarks.trim() || 'Application did not meet verification criteria.';
      await rejectSchoolApplication(
        selectedApp.id,
        remarks,
        user.uid,
        user.displayName || 'Platform Operator',
        user.email,
        selectedApp
      );

      await loadApplications();

      setActionMessage({
        type: 'success',
        text: 'Application rejected. Google Sheet updated and automated rejection update email dispatched.',
      });

      setSelectedApp((prev) =>
        prev
          ? {
              ...prev,
              status: 'REJECTED',
              operatorRemarks: remarks,
            }
          : null
      );
    } catch (err: any) {
      console.error('Rejection failed:', err);
      setActionMessage({
        type: 'error',
        text: err.message || 'Failed to reject school application.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-blue-900/40 border border-purple-500/20 backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 border border-purple-500/30">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white font-['Plus_Jakarta_Sans']">
              Platform Operator Control
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">
              Signed in as <b className="text-purple-300">{user.email}</b> · Comprehensive school oversight &amp; registration approvals
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => loadApplications()}
            disabled={loadingApps}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold border border-white/10 transition-all"
            title="Refresh Requests"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingApps ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-lg shadow-purple-600/30 transition-all"
          >
            <Plus className="w-4 h-4" /> Quick Add School
          </button>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('applications')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all relative ${
            activeTab === 'applications'
              ? 'bg-gradient-to-r from-amber-600/20 to-orange-600/20 text-amber-300 border border-amber-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileCheck className="w-4 h-4 text-amber-400" />
          <span>SCHOOL REGISTRATION REQUESTS</span>
          {pendingAppsCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-black animate-pulse">
              {pendingAppsCount} PENDING
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('schools')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'schools'
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Building2 className="w-4 h-4" /> Registered Schools ({schools.length})
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'audit'
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ClipboardList className="w-4 h-4" /> Audit Activity Logs ({auditLogs.length})
        </button>
      </div>

      {/* ========================================================= */}
      {/* SECTION: SCHOOL REGISTRATION REQUESTS                     */}
      {/* ========================================================= */}
      {activeTab === 'applications' && (
        <div className="space-y-6">
          {/* Dashboard Statistics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[#111624] border border-blue-500/20 space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                Total Applications
              </div>
              <div className="text-2xl font-black text-white font-['Plus_Jakarta_Sans']">
                {totalAppsCount}
              </div>
              <div className="text-[11px] text-slate-400">All submitted applications</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#111624] border border-amber-500/30 space-y-1 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-bl-full pointer-events-none" />
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                Pending Applications
              </div>
              <div className="text-2xl font-black text-amber-300 font-['Plus_Jakarta_Sans']">
                {pendingAppsCount}
              </div>
              <div className="text-[11px] text-amber-400/80">Awaiting operator review</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#111624] border border-emerald-500/30 space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                Approved Schools
              </div>
              <div className="text-2xl font-black text-emerald-300 font-['Plus_Jakarta_Sans']">
                {approvedAppsCount}
              </div>
              <div className="text-[11px] text-slate-400">Activated in Firestore</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#111624] border border-rose-500/20 space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
                Rejected Applications
              </div>
              <div className="text-2xl font-black text-rose-300 font-['Plus_Jakarta_Sans']">
                {rejectedAppsCount}
              </div>
              <div className="text-[11px] text-slate-400">Declined requests</div>
            </div>
          </div>

          {/* Sub-Tabs (PENDING, APPROVED, REJECTED) & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#111624] p-3 rounded-2xl border border-white/10">
            <div className="flex items-center gap-1.5 p-1 bg-[#0b0f19] rounded-xl border border-white/10">
              <button
                onClick={() => setAppStatusTab('PENDING')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  appStatusTab === 'PENDING'
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>PENDING</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 font-black">
                  {pendingAppsCount}
                </span>
              </button>

              <button
                onClick={() => setAppStatusTab('APPROVED')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  appStatusTab === 'APPROVED'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>APPROVED</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-black">
                  {approvedAppsCount}
                </span>
              </button>

              <button
                onClick={() => setAppStatusTab('REJECTED')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  appStatusTab === 'REJECTED'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>REJECTED</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-black">
                  {rejectedAppsCount}
                </span>
              </button>
            </div>

            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={appSearch}
                onChange={(e) => setAppSearch(e.target.value)}
                placeholder="Search by school, admin email, district, ID…"
                className="w-full bg-[#0b0f19] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {appsError && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{appsError}</span>
              </span>
              <button
                type="button"
                onClick={() => loadApplications()}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold shrink-0"
              >
                Retry
              </button>
            </div>
          )}

          {/* Applications List View */}
          {loadingApps ? (
            <div className="p-12 text-center rounded-2xl bg-[#111624] border border-white/5 space-y-3">
              <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Loading school registration requests…</p>
            </div>
          ) : displayedApplications.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#111624] border border-white/5 space-y-3">
              <div className="w-12 h-12 rounded-full bg-white/5 text-slate-400 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-white">
                No {appStatusTab} applications found
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {appStatusTab === 'PENDING'
                  ? 'All submitted school registrations have been reviewed. New submissions from visitors will appear here in real-time.'
                  : `There are currently no applications marked as ${appStatusTab}.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedApplications.map((app) => {
                const statusBadge =
                  app.status === 'PENDING'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : app.status === 'APPROVED'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40';

                return (
                  <div
                    key={app.id}
                    className="p-5 rounded-2xl bg-[#111624] border border-white/10 hover:border-amber-500/30 transition-all flex flex-col justify-between space-y-4 shadow-lg group"
                  >
                    <div className="space-y-3">
                      {/* Top Row: ID & Status Badge */}
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                          {app.id}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${statusBadge}`}
                        >
                          {app.status}
                        </span>
                      </div>

                      {/* School & Principal */}
                      <div>
                        <h3 className="text-base font-bold text-white font-['Plus_Jakarta_Sans'] group-hover:text-amber-300 transition-colors">
                          {app.schoolName}
                        </h3>
                        <div className="text-xs text-slate-300 flex items-center gap-1.5 mt-0.5">
                          <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                          <span>Principal: {app.principalName}</span>
                        </div>
                      </div>

                      {/* Contact & District info */}
                      <div className="space-y-1.5 text-xs text-slate-400 border-t border-white/5 pt-2.5">
                        <div className="flex items-center gap-2 text-slate-300">
                          <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span className="truncate">{app.administratorEmail}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{app.contactNumber}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{app.district}, {app.province}</span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
                          <Calendar className="w-3 h-3" />
                          <span>Submitted: {new Date(app.submissionDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action: Open Details */}
                    <button
                      onClick={() => handleOpenAppDetail(app)}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 border border-white/10 transition-colors mt-2"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Review Details</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* ========================================================= */}
          {/* APPLICATION DETAILS & APPROVAL / REJECTION MODAL           */}
          {/* ========================================================= */}
          {selectedApp && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
              <div className="bg-[#111624] border border-white/10 rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative my-auto max-h-[92vh] flex flex-col">
                {/* Modal Header */}
                <div className="flex items-start justify-between pb-4 border-b border-white/10 shrink-0">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded border border-blue-500/20">
                        {selectedApp.id}
                      </span>
                      <span
                        className={`text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                          selectedApp.status === 'PENDING'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : selectedApp.status === 'APPROVED'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        }`}
                      >
                        {selectedApp.status}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-white font-['Plus_Jakarta_Sans']">
                      {selectedApp.schoolName}
                    </h2>
                  </div>

                  <button
                    onClick={() => setSelectedApp(null)}
                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Feedback Banner */}
                {actionMessage && (
                  <div
                    className={`mt-4 p-3 rounded-xl text-xs flex items-start gap-2.5 ${
                      actionMessage.type === 'success'
                        ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                    }`}
                  >
                    {actionMessage.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    )}
                    <span>{actionMessage.text}</span>
                  </div>
                )}

                {/* Modal Body: Complete Submitted Information */}
                <div className="overflow-y-auto py-4 flex-1 space-y-4 pr-1 text-xs">
                  {/* Grid of All Submitted Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-[#171d2d] p-4 rounded-xl border border-white/10">
                    <div>
                      <span className="text-slate-400 block text-[11px]">1. School Name</span>
                      <span className="font-semibold text-white text-sm">{selectedApp.schoolName}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">2. Principal Name</span>
                      <span className="font-semibold text-white text-sm">{selectedApp.principalName}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">3. Administrator Name</span>
                      <span className="font-semibold text-white">{selectedApp.administratorName}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">4. Administrator Google Email</span>
                      <span className="font-semibold text-indigo-300 break-all">{selectedApp.administratorEmail}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">5. Contact Number</span>
                      <span className="font-semibold text-white">{selectedApp.contactNumber}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">9. School Type</span>
                      <span className="font-semibold text-white">{selectedApp.schoolType}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">6. Province</span>
                      <span className="font-semibold text-white">{selectedApp.province}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">7. District</span>
                      <span className="font-semibold text-white">{selectedApp.district}</span>
                    </div>

                    <div className="sm:col-span-2">
                      <span className="text-slate-400 block text-[11px]">8. School Physical Address</span>
                      <span className="font-semibold text-white">{selectedApp.address}</span>
                    </div>

                    {selectedApp.website && (
                      <div className="sm:col-span-2">
                        <span className="text-slate-400 block text-[11px]">10. School Website</span>
                        <a
                          href={selectedApp.website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-400 hover:underline flex items-center gap-1 font-medium"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>{selectedApp.website}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}

                    {selectedApp.additionalInfo && (
                      <div className="sm:col-span-2">
                        <span className="text-slate-400 block text-[11px]">11. Additional Information</span>
                        <p className="text-slate-200 bg-[#111624] p-2.5 rounded-lg border border-white/5 whitespace-pre-wrap">
                          {selectedApp.additionalInfo}
                        </p>
                      </div>
                    )}

                    <div className="sm:col-span-2 pt-2 border-t border-white/10 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
                      <span>Submitted: {new Date(selectedApp.submissionDate).toLocaleString()}</span>
                      {selectedApp.schoolId && (
                        <span className="text-emerald-400 font-mono font-bold">
                          Assigned School ID: {selectedApp.schoolId}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Existing Operator Remarks if already reviewed */}
                  {selectedApp.status !== 'PENDING' && selectedApp.operatorRemarks && (
                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Operator Remarks
                      </span>
                      <p className="text-xs text-slate-200">{selectedApp.operatorRemarks}</p>
                    </div>
                  )}

                  {/* Review / Decision Controls (For PENDING status) */}
                  {selectedApp.status === 'PENDING' && (
                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                          Operator Remarks / Verification Notes <span className="text-slate-500">(Optional for approval, sent to administrator on rejection)</span>
                        </label>
                        <textarea
                          rows={2}
                          value={operatorRemarks}
                          onChange={(e) => setOperatorRemarks(e.target.value)}
                          placeholder="e.g. Verified by Regional Education Officer; contact confirmed."
                          className="w-full bg-[#171d2d] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      {/* Prominent Action Buttons */}
                      <div className="p-4 rounded-xl bg-[#171d2d] border border-white/10 space-y-3">
                        <div className="text-xs text-slate-300">
                          <span className="font-bold text-white">Execute Operator Decision:</span>
                          <p className="text-slate-400 text-[11px] mt-0.5">
                            Approving creates the school record in Cloud Firestore, generates a School ID, updates Google Sheets, and dispatches the automatic approval email.
                          </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 justify-end pt-1">
                          <button
                            type="button"
                            onClick={handleReject}
                            disabled={actionLoading}
                            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 disabled:opacity-50 transition-all"
                          >
                            {actionLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                            <span>REJECT APPLICATION</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleApprove}
                            disabled={actionLoading}
                            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 disabled:opacity-50 transition-all"
                          >
                            {actionLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4" />
                            )}
                            <span>APPROVE SCHOOL</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="pt-3 border-t border-white/10 flex justify-end shrink-0">
                  <button
                    onClick={() => setSelectedApp(null)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION: REGISTERED SCHOOLS                               */}
      {/* ========================================================= */}
      {activeTab === 'schools' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search schools by name, admin email, district…"
                className="w-full bg-[#121724] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
            <span className="text-xs text-slate-400">
              Showing {filteredSchools.length} of {schools.length} schools
            </span>
          </div>

          {filteredSchools.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#101420] border border-white/5 space-y-3">
              <div className="w-12 h-12 rounded-full bg-white/5 text-slate-400 flex items-center justify-center mx-auto">
                <SchoolIcon className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-white">No schools have been added yet.</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Review pending registration requests or click &quot;Quick Add School&quot; to onboard an institution.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSchools.map((sch) => {
                const isSelected = currentSchool?.id === sch.id;
                return (
                  <div
                    key={sch.id}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                      isSelected
                        ? 'bg-purple-900/20 border-purple-500/40 shadow-lg shadow-purple-500/10'
                        : 'bg-[#121724] border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                          {sch.schoolType || 'National School'}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400">
                          {sch.academicYear || '2026'}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white font-['Plus_Jakarta_Sans'] line-clamp-1">
                        {sch.name}
                      </h3>

                      <div className="space-y-1 text-xs text-slate-400">
                        <div>Principal: <b className="text-slate-300">{sch.principalName || 'Not Set'}</b></div>
                        <div>District: <b className="text-slate-300">{sch.district || 'Jaffna'}</b>, {sch.province || 'Northern'}</div>
                        <div className="truncate">Admin Email: <b className="text-purple-300">{sch.adminEmail}</b></div>
                        {sch.phone && <div>Phone: <b className="text-slate-300">{sch.phone}</b></div>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-white/10">
                      <button
                        onClick={() => onSelectSchool(sch)}
                        className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-purple-600 text-white'
                            : 'bg-white/5 hover:bg-white/10 text-slate-300'
                        }`}
                      >
                        {isSelected ? 'Currently Selected' : 'Select Scope'}
                      </button>

                      {confirmDeleteSchoolId === sch.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={async () => {
                              await onDeleteSchool(sch.id);
                              setConfirmDeleteSchoolId(null);
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteSchoolId(null)}
                            className="px-2 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-[11px]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteSchoolId(sch.id)}
                          className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Delete School"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION: AUDIT ACTIVITY LOGS                             */}
      {/* ========================================================= */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Security &amp; Administrative Event Audit Trail</h2>
            <span className="text-xs text-slate-400">{auditLogs.length} total events recorded</span>
          </div>

          {auditLogs.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#101420] border border-white/5 space-y-2">
              <ClipboardList className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-xs text-slate-400">No administrative events logged yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5 rounded-2xl bg-[#101420] border border-white/10 overflow-hidden">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-4 flex items-center justify-between gap-4 text-xs hover:bg-white/[0.02]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{log.action}</span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white/5 text-purple-300 border border-white/10">
                        {log.actorRole}
                      </span>
                    </div>
                    <div className="text-slate-400">
                      Actor: <b className="text-slate-300">{log.actorName}</b> on target <b className="text-slate-300">{log.targetType}</b> ({log.targetId})
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick Add School Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#151a28] border border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white font-['Plus_Jakarta_Sans'] mb-4">
              Add New Educational Institution
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">School Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Mahajana College, Tellippalai"
                  className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Administrator Google Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.adminEmail}
                  onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                  placeholder="e.g. principal@mahajana.lk"
                  className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Principal Name</label>
                  <input
                    type="text"
                    value={formData.principalName}
                    onChange={(e) => setFormData({ ...formData, principalName: e.target.value })}
                    placeholder="e.g. Mr. K. Pushparathanam"
                    className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">District</label>
                  <input
                    type="text"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Province</label>
                  <input
                    type="text"
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                    className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="076 391 XXXX"
                    className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white shadow-lg shadow-purple-600/30 disabled:opacity-50"
                >
                  {submitting ? 'Creating…' : 'Create School'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
