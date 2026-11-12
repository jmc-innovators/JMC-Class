import React, { useState } from 'react';
import { School, UserProfile, AuditLog } from '../types';
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
} from 'lucide-react';

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
  auditLogs,
  loading,
}) => {
  const [activeTab, setActiveTab] = useState<'schools' | 'audit'>('schools');
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
              Signed in as <b className="text-purple-300">{user.email}</b> · Comprehensive school oversight &amp; access control
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-lg shadow-purple-600/30 transition-all self-start md:self-auto"
        >
          <Plus className="w-4 h-4" /> Add New School
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('schools')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'schools'
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Building2 className="w-4 h-4" /> Registered Schools ({schools.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'audit'
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ClipboardList className="w-4 h-4" /> Audit Activity Logs ({auditLogs.length})
        </button>
      </div>

      {/* Tab: Schools */}
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
                Begin by clicking &quot;Add New School&quot; to onboard an institution and grant its principal or admin Google email access.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSchools.map((sch) => {
                const isSelected = currentSchool?.id === sch.id;
                return (
                  <div
                    key={sch.id}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#151c2e] border-purple-500/50 ring-1 ring-purple-500/20'
                        : 'bg-[#101522] border-white/5 hover:border-white/15'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-sm">
                            {sch.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-white line-clamp-1">{sch.name}</h3>
                            <div className="text-[11px] text-slate-400">{sch.schoolType || 'School'} · {sch.district || 'Sri Lanka'}</div>
                          </div>
                        </div>

                        {isSelected && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            Active
                          </span>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/5 space-y-1.5 text-xs text-slate-300">
                        <div>
                          <span className="text-slate-500 font-medium">Admin:</span>{' '}
                          <span className="text-white font-mono text-[11px]">{sch.adminEmail}</span>
                        </div>
                        {sch.principalName && (
                          <div>
                            <span className="text-slate-500 font-medium">Principal:</span> {sch.principalName}
                          </div>
                        )}
                        {sch.academicYear && (
                          <div>
                            <span className="text-slate-500 font-medium">Academic Year:</span> {sch.academicYear}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                      <button
                        onClick={() => onSelectSchool(sch)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/15 hover:bg-blue-600/25 text-blue-300 border border-blue-500/25 text-xs font-semibold"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Manage School
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to remove school "${sch.name}"? This cannot be undone.`)) {
                            onDeleteSchool(sch.id);
                          }
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/15 text-slate-400 hover:text-red-400 transition-colors"
                        title="Remove school"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-[#101420] border border-white/5 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Immutable Platform Audit Logs</h3>
            <span className="text-xs text-slate-400">{auditLogs.length} events logged</span>
          </div>

          {auditLogs.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No audit logs have been recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto font-mono text-xs">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-3.5 hover:bg-white/[0.02] flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-purple-400">[{log.action}]</span>
                      <span className="text-white">{log.actorName}</span>
                      <span className="text-slate-500">({log.actorRole})</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Target: {log.targetType} {log.targetId} {log.metadata ? `· ${JSON.stringify(log.metadata)}` : ''}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 shrink-0">
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add School Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#151a28] border border-white/10 rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white font-['Plus_Jakarta_Sans'] mb-1">
              Add New Educational Institution
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Provision a new school with live Cloud Firestore records and admin credentials.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3.5">
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
                  Administrator Google Account Email *
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
                    placeholder="e.g. Mr. K. Sivanesan"
                    className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Academic Year</label>
                  <input
                    type="text"
                    value={formData.academicYear}
                    onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                    placeholder="2026"
                    className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">District</label>
                  <input
                    type="text"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    placeholder="Jaffna"
                    className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Province</label>
                  <input
                    type="text"
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                    placeholder="Northern Province"
                    className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="021 222 XXXX"
                    className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">School Website</label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://"
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
