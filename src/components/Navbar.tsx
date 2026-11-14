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
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-purple-700">
            <Shield className="w-3.5 h-3.5" /> Operator
          </span>
        );
      case 'school':
      case 'supervisor':
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-700">
            <SchoolIcon className="w-3.5 h-3.5" /> School Admin
          </span>
        );
      case 'teacher':
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
            <GraduationCap className="w-3.5 h-3.5" /> Teacher
          </span>
        );
      case 'student':
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-700">
            <User className="w-3.5 h-3.5" /> Student
          </span>
        );
      case 'parent':
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-700">
            <Users className="w-3.5 h-3.5" /> Parent
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 min-h-16 py-2 flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm shadow-blue-600/20 shrink-0 font-extrabold text-white text-xs sm:text-sm tracking-wider font-['Plus_Jakarta_Sans']">
            JMC
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 tracking-tight font-['Plus_Jakarta_Sans'] text-sm sm:text-lg whitespace-nowrap">
                JMC Classroom
              </span>
            </div>
            <div className="text-[11px] sm:text-xs text-slate-500 truncate max-w-[150px] sm:max-w-xs">
              {currentSchool?.name || 'JMC Innovators Learning Platform'}
            </div>
          </div>
        </div>

        {/* Center / School Switcher for Operator */}
        <div className="hidden md:flex items-center gap-3">
          {user?.role === 'operator' && schools.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-600">School:</label>
              <select
                value={currentSchool?.id || ''}
                onChange={(e) => {
                  const found = schools.find((s) => s.id === e.target.value);
                  if (found) onSelectSchool(found);
                }}
                aria-label="Switch active school"
                className="bg-white border border-slate-300 rounded-lg text-xs text-slate-900 px-3 py-1.5 focus:outline-none focus:border-blue-600"
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
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
              }`}
            >
              <span>{dbStatus.connected ? `Firestore (${dbStatus.latencyMs}ms)` : 'DB Offline'}</span>
            </button>
          )}

          {isOperatorManagingSchool && onReturnToOperator && (
            <button
              type="button"
              onClick={onReturnToOperator}
              className="px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold"
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
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors border border-slate-200 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          )}

          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-semibold text-slate-900 max-w-[160px] truncate">
                  {user.displayName || user.email}
                </span>
                <div className="mt-0.5">{getRoleBadge(user.role)}</div>
              </div>

              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs ring-2 ring-slate-200 shrink-0">
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
                className="min-h-[40px] flex items-center gap-1.5 text-xs text-slate-700 hover:text-rose-700 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-all font-medium whitespace-nowrap"
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
