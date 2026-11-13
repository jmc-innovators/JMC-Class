import React from 'react';
import { UserProfile, School } from '../types';
import { LogOut, School as SchoolIcon, Shield, GraduationCap, Users, User, RefreshCw } from 'lucide-react';

interface NavbarProps {
  user: UserProfile | null;
  currentSchool: School | null;
  schools: School[];
  onSelectSchool: (school: School) => void;
  onSignOut: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  dbStatus?: { connected: boolean; latencyMs: number; error?: string };
  onTestConnection?: () => void;
  isOperatorManagingSchool?: boolean;
  onReturnToOperator?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  currentSchool,
  schools,
  onSelectSchool,
  onSignOut,
  onRefresh,
  isRefreshing,
  dbStatus,
  onTestConnection,
  isOperatorManagingSchool,
  onReturnToOperator,
}) => {
  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'operator':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <Shield className="w-3.5 h-3.5" /> Operator
          </span>
        );
      case 'school':
      case 'supervisor':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
            <SchoolIcon className="w-3.5 h-3.5" /> School Admin
          </span>
        );
      case 'teacher':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <GraduationCap className="w-3.5 h-3.5" /> Teacher
          </span>
        );
      case 'student':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <User className="w-3.5 h-3.5" /> Student
          </span>
        );
      case 'parent':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <Users className="w-3.5 h-3.5" /> Parent
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0f1422]/90 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 min-h-16 py-2 flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 p-0.5 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
            <div className="w-full h-full bg-[#0d111b] rounded-[10px] flex items-center justify-center font-extrabold text-blue-400 text-xs sm:text-sm tracking-wider font-['Plus_Jakarta_Sans']">
              JMC
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white tracking-tight font-['Plus_Jakarta_Sans'] text-sm sm:text-lg whitespace-nowrap">
                JMC Classroom
              </span>
            </div>
            <div className="text-[11px] sm:text-xs text-slate-400 truncate max-w-[150px] sm:max-w-xs">
              {currentSchool?.name || 'JMC Innovators Learning Platform'}
            </div>
          </div>
        </div>

        {/* Center / School Switcher for Operator */}
        <div className="hidden md:flex items-center gap-3">
          {user?.role === 'operator' && schools.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-400">School:</label>
              <select
                value={currentSchool?.id || ''}
                onChange={(e) => {
                  const found = schools.find((s) => s.id === e.target.value);
                  if (found) onSelectSchool(found);
                }}
                aria-label="Switch active school"
                className="bg-[#171d2c] border border-white/10 rounded-lg text-xs text-white px-3 py-1.5 focus:outline-none focus:border-blue-500"
              >
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.district || 'All'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {dbStatus && (
            <button
              type="button"
              onClick={onTestConnection}
              title="Click to re-ping Cloud Firestore database connection"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                dbStatus.connected
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25 hover:bg-emerald-500/20'
                  : 'bg-red-500/10 text-red-300 border-red-500/25 hover:bg-red-500/20'
              }`}
            >
              <span>{dbStatus.connected ? `Firestore (${dbStatus.latencyMs}ms)` : 'DB Offline'}</span>
            </button>
          )}

          {isOperatorManagingSchool && onReturnToOperator && (
            <button
              type="button"
              onClick={onReturnToOperator}
              className="px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border border-purple-500/30 text-xs font-semibold"
            >
              Return to Operator
            </button>
          )}
        </div>

        {/* User Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Refresh Firestore data"
              aria-label="Refresh data"
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors border border-white/10 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          )}

          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-medium text-white max-w-[150px] truncate">
                  {user.displayName || user.email}
                </span>
                <div className="mt-0.5">{getRoleBadge(user.role)}</div>
              </div>

              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs ring-2 ring-white/10 shrink-0">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName} className="w-full h-full rounded-full object-cover" />
                ) : (
                  (user.displayName || user.email || 'U').charAt(0).toUpperCase()
                )}
              </div>

              <button
                type="button"
                onClick={onSignOut}
                title="Sign out"
                className="min-h-[40px] flex items-center gap-1.5 text-xs text-slate-300 hover:text-red-400 px-2.5 sm:px-3 py-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 transition-all font-medium"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};
