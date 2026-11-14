import React from 'react';

interface PageLoaderProps {
  variant?: 'platform' | 'school' | 'workspace';
  title?: string;
  subtitle?: string;
}

const LOADER_COPY = {
  platform: {
    title: 'JMC Innovators',
    subtitle: 'Preparing your learning workspace and verifying session access',
    steps: ['Session Verification', 'School Directory', 'Workspace Sync'],
  },
  school: {
    title: 'Loading Campus Portal',
    subtitle: 'Fetching school profile, academic streams, and classroom directory',
    steps: ['School Record', 'Classrooms', 'Campus Resources'],
  },
  workspace: {
    title: 'Syncing Portal',
    subtitle: 'Loading classes, assignments, and assessment records',
    steps: ['Authentication', 'Class Data', 'Portal Ready'],
  },
};

export const InlineSpinner: React.FC<{ className?: string }> = ({
  className = 'w-4 h-4 text-current',
}) => (
  <svg
    className={`animate-spin shrink-0 ${className}`}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="9"
      stroke="currentColor"
      strokeWidth="2.5"
    />
    <path
      className="opacity-95"
      d="M21 12a9 9 0 0 0-9-9"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

export const TopProgressBar: React.FC<{ active: boolean }> = ({ active }) => {
  if (!active) return null;
  return (
    <div
      className="fixed top-0 inset-x-0 z-50 h-0.5 bg-blue-100/80 overflow-hidden pointer-events-none"
      role="progressbar"
      aria-label="Updating workspace data"
    >
      <div className="h-full w-2/5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 jmc-progress-sweep rounded-full" />
    </div>
  );
};

export const PageLoader: React.FC<PageLoaderProps> = ({
  variant = 'platform',
  title,
  subtitle,
}) => {
  const copy = LOADER_COPY[variant];
  const heading = title || copy.title;
  const sub = subtitle || copy.subtitle;

  return (
    <div
      className="min-h-screen bg-[#F8FAFC] text-slate-900 relative flex items-center justify-center p-4 sm:p-6 overflow-hidden"
      role="status"
      aria-live="polite"
      aria-label={heading}
    >
      {/* Subtle Architectural Daylight Backdrop */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 24%, rgba(37, 99, 235, 0.08) 0%, rgba(79, 70, 229, 0.04) 38%, rgba(248, 250, 252, 0) 72%), linear-gradient(to right, rgba(148, 163, 184, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(148, 163, 184, 0.08) 1px, transparent 1px)',
          backgroundSize: '100% 100%, 40px 40px, 40px 40px',
        }}
      />

      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white border border-slate-200/90 shadow-xl shadow-slate-900/5 p-7 sm:p-8 space-y-6">
        {/* Precision Orbital Emblem + JMC Crest */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="relative w-20 h-20 flex items-center justify-center">
            <svg
              className="absolute inset-0 w-20 h-20"
              viewBox="0 0 80 80"
              fill="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="jmc-orbit-grad" x1="0" y1="0" x2="80" y2="80">
                  <stop offset="0%" stopColor="#2563EB" />
                  <stop offset="100%" stopColor="#4F46E5" />
                </linearGradient>
              </defs>
              {/* Static precision track */}
              <circle
                cx="40"
                cy="40"
                r="36"
                stroke="#E2E8F0"
                strokeWidth="2"
              />
              {/* Outer primary sweeping arc */}
              <g className="jmc-orbit-spin">
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="url(#jmc-orbit-grad)"
                  strokeWidth="2.75"
                  strokeLinecap="round"
                  strokeDasharray="68 160"
                />
              </g>
              {/* Inner secondary subtle arc */}
              <g className="jmc-orbit-counter">
                <circle
                  cx="40"
                  cy="40"
                  r="29"
                  stroke="#93C5FD"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeDasharray="28 155"
                />
              </g>
            </svg>

            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm tracking-wider font-['Plus_Jakarta_Sans'] shadow-md shadow-blue-600/25">
              JMC
            </div>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight font-['Plus_Jakarta_Sans']">
              {heading}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xs mx-auto">
              {sub}
            </p>
          </div>
        </div>

        {/* Fluid Cobalt Progress Sweep */}
        <div className="space-y-2.5">
          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full w-2/5 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 jmc-progress-sweep" />
          </div>
          <div className="flex items-center justify-center gap-2 text-[11px] font-medium text-slate-500">
            {copy.steps.map((step, idx) => (
              <React.Fragment key={step}>
                {idx > 0 && <span aria-hidden="true" className="text-slate-300">·</span>}
                <span>{step}</span>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Subtle Architectural Workspace Preview Skeleton */}
        <div
          className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 space-y-3"
          aria-hidden="true"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg jmc-skeleton-shimmer shrink-0" />
              <div className="space-y-1.5">
                <div className="h-2.5 w-28 rounded jmc-skeleton-shimmer" />
                <div className="h-2 w-16 rounded jmc-skeleton-shimmer opacity-80" />
              </div>
            </div>
            <div className="h-5 w-14 rounded-md jmc-skeleton-shimmer" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="h-8 rounded-lg jmc-skeleton-shimmer" />
            <div className="h-8 rounded-lg jmc-skeleton-shimmer" />
            <div className="h-8 rounded-lg jmc-skeleton-shimmer" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const SchoolDirectorySkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-hidden="true">
    {Array.from({ length: count }).map((_, idx) => (
      <div
        key={idx}
        className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between gap-4"
      >
        <div className="space-y-2.5">
          <div className="h-2.5 w-32 rounded jmc-skeleton-shimmer" />
          <div className="h-4 w-3/4 rounded jmc-skeleton-shimmer" />
          <div className="h-3 w-1/2 rounded jmc-skeleton-shimmer" />
        </div>
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <div className="h-2.5 w-24 rounded jmc-skeleton-shimmer" />
          <div className="h-2.5 w-16 rounded jmc-skeleton-shimmer" />
        </div>
      </div>
    ))}
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
  <div
    className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs"
    aria-label="Loading records"
  >
    <div className="bg-slate-50 border-b border-slate-200 px-4 py-3.5 flex items-center justify-between gap-4">
      <div className="h-3 w-36 rounded jmc-skeleton-shimmer" />
      <div className="h-3 w-24 rounded jmc-skeleton-shimmer" />
    </div>
    <div className="divide-y divide-slate-200">
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="px-4 py-3.5 grid grid-cols-12 items-center gap-3">
          <div className="col-span-3 space-y-1.5">
            <div className="h-3 w-4/5 rounded jmc-skeleton-shimmer" />
            <div className="h-2.5 w-1/2 rounded jmc-skeleton-shimmer opacity-80" />
          </div>
          <div className="col-span-4 space-y-1.5">
            <div className="h-3 w-3/4 rounded jmc-skeleton-shimmer" />
            <div className="h-2.5 w-2/3 rounded jmc-skeleton-shimmer opacity-80" />
          </div>
          <div className="col-span-3 hidden sm:block">
            <div className="h-3 w-2/3 rounded jmc-skeleton-shimmer" />
          </div>
          <div className="col-span-2 flex justify-end">
            <div className="h-6 w-16 rounded-md jmc-skeleton-shimmer" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const AiThinkingSkeleton: React.FC<{ label?: string }> = ({
  label = 'Synthesizing educational response',
}) => (
  <div className="p-6 rounded-2xl bg-white border border-indigo-200 shadow-xs space-y-4">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 text-xs font-bold text-indigo-700">
        <InlineSpinner className="w-4 h-4 text-indigo-600" />
        <span>{label}…</span>
      </div>
      <div className="h-2.5 w-20 rounded jmc-skeleton-shimmer" />
    </div>
    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5" aria-hidden="true">
      <div className="h-3 w-11/12 rounded jmc-skeleton-shimmer" />
      <div className="h-3 w-4/5 rounded jmc-skeleton-shimmer" />
      <div className="h-3 w-9/12 rounded jmc-skeleton-shimmer" />
      <div className="h-3 w-3/5 rounded jmc-skeleton-shimmer" />
    </div>
  </div>
);
