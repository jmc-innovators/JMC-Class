import React, { useState } from 'react';
import {
  UserProfile,
  School,
  Parent,
  Student,
  Assignment,
  Submission,
  AttendanceSession,
  ResultAssessment,
  Announcement,
} from '../../src/types';
import {
  Users,
  Calendar,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  AlertCircle,
  Megaphone,
} from 'lucide-react';

interface ParentDashboardProps {
  user: UserProfile;
  school: School;
  parent: Parent | null;
  students: Student[];
  assignments: Assignment[];
  submissions: Submission[];
  attendanceSessions: AttendanceSession[];
  results: ResultAssessment[];
  announcements: Announcement[];
}

export const ParentDashboard: React.FC<ParentDashboardProps> = ({
  user,
  school,
  parent,
  students,
  assignments,
  submissions,
  attendanceSessions,
  results,
  announcements,
}) => {
  // Find students linked to this parent (either by parent.children array or student.parentEmail)
  const linkedStudents = students.filter(
    (s) =>
      (parent?.children && parent.children.includes(s.id)) ||
      (s.parentEmail && s.parentEmail.toLowerCase() === (user.email || '').toLowerCase())
  );

  const [selectedChildId, setSelectedChildId] = useState<string>(linkedStudents[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'attendance' | 'academics' | 'announcements'>('attendance');

  const selectedChild = linkedStudents.find((s) => s.id === selectedChildId) || linkedStudents[0];

  // Calculate attendance for selected child
  let childTotalSessions = 0;
  let childPresent = 0;
  let childLate = 0;
  let childAbsent = 0;

  if (selectedChild) {
    attendanceSessions.forEach((sess) => {
      if (sess.records && sess.records[selectedChild.id]) {
        childTotalSessions++;
        const st = sess.records[selectedChild.id];
        if (st === 'present') childPresent++;
        else if (st === 'late') childLate++;
        else if (st === 'absent') childAbsent++;
      }
    });
  }

  const attendancePct =
    childTotalSessions > 0
      ? Math.round(((childPresent + childLate * 0.5) / childTotalSessions) * 100)
      : null;

  // Selected child's results
  const childResults = selectedChild
    ? results
        .map((res) => {
          const rec = res.records.find((r) => r.studentId === selectedChild.id);
          if (!rec) return null;
          return {
            ...res,
            marks: rec.marks,
            grade: rec.grade,
            feedback: rec.feedback,
          };
        })
        .filter(Boolean)
    : [];

  // Selected child's assignments
  const childAssignments = selectedChild
    ? assignments.filter((a) => a.classId === selectedChild.classId)
    : [];

  return (
    <div className="space-y-6">
      {/* Parent Header */}
      <div className="p-6 rounded-2xl bg-[#121726] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/25">
            Parent Monitoring Portal
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-white font-['Plus_Jakarta_Sans'] mt-1">
            Welcome, {parent?.name || user.displayName || 'Parent'}
          </h1>
          <p className="text-xs text-slate-400">
            {school.name} · Real-time attendance, homework, and examination tracking for your child.
          </p>
        </div>

        {/* Child Selector */}
        {linkedStudents.length > 0 && (
          <div className="flex items-center gap-2 bg-[#171d2e] p-2 rounded-xl border border-white/5">
            <span className="text-xs text-slate-400 font-medium pl-2">Select Student:</span>
            <select
              value={selectedChild?.id}
              onChange={(e) => setSelectedChildId(e.target.value)}
              className="bg-[#1f263c] border border-white/10 rounded-lg text-xs text-white px-3 py-1.5 focus:outline-none focus:border-rose-500 font-semibold"
            >
              {linkedStudents.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.className || st.grade})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {linkedStudents.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#101420] border border-white/5 space-y-3">
          <Users className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-white">No students are currently linked to your parent account.</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Please ask your school administrator to register your Google email ({user.email}) under your child&apos;s profile.
          </p>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex items-center gap-2 border-b border-white/10 pb-2">
            <button
              onClick={() => setActiveTab('attendance')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'attendance'
                  ? 'bg-rose-600/20 text-rose-300 border border-rose-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-4 h-4" /> Attendance Record
            </button>
            <button
              onClick={() => setActiveTab('academics')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'academics'
                  ? 'bg-rose-600/20 text-rose-300 border border-rose-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Award className="w-4 h-4" /> Homework &amp; Exam Marks
            </button>
            <button
              onClick={() => setActiveTab('announcements')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'announcements'
                  ? 'bg-rose-600/20 text-rose-300 border border-rose-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Megaphone className="w-4 h-4" /> School Notices
            </button>
          </div>

          {/* Tab 1: Attendance */}
          {activeTab === 'attendance' && (
            <div className="space-y-6 max-w-4xl">
              <div className="p-6 rounded-2xl bg-[#111624] border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-400" /> Attendance for {selectedChild?.name}
                  </h3>
                  {attendancePct !== null && (
                    <span
                      className={`text-lg font-black ${
                        attendancePct >= 80 ? 'text-emerald-400' : attendancePct >= 60 ? 'text-amber-400' : 'text-red-400'
                      }`}
                    >
                      {attendancePct}% Overall Attendance
                    </span>
                  )}
                </div>

                {childTotalSessions === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No attendance sessions have been logged for {selectedChild?.name} yet.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-4 rounded-xl bg-[#171d2e] border border-white/5 text-center">
                        <div className="text-2xl font-black text-white">{childTotalSessions}</div>
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Days Logged</div>
                      </div>
                      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                        <div className="text-2xl font-black text-emerald-400">{childPresent}</div>
                        <div className="text-[10px] text-emerald-300 uppercase font-semibold">Days Present</div>
                      </div>
                      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                        <div className="text-2xl font-black text-amber-400">{childLate}</div>
                        <div className="text-[10px] text-amber-300 uppercase font-semibold">Days Late</div>
                      </div>
                      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                        <div className="text-2xl font-black text-red-400">{childAbsent}</div>
                        <div className="text-[10px] text-red-300 uppercase font-semibold">Days Absent</div>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-4 border-t border-white/5">
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recent Attendance Records</h4>
                      <div className="max-h-60 overflow-y-auto space-y-1.5">
                        {attendanceSessions
                          .filter((s) => s.records && s.records[selectedChild.id])
                          .map((sess) => {
                            const st = sess.records[selectedChild.id];
                            return (
                              <div key={sess.id} className="p-3 rounded-xl bg-[#171d2e] flex items-center justify-between text-xs">
                                <div>
                                  <span className="font-semibold text-white">{sess.subject}</span>
                                  <span className="text-slate-500 text-[11px] ml-2">{sess.date}</span>
                                </div>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    st === 'present'
                                      ? 'bg-emerald-500/20 text-emerald-300'
                                      : st === 'late'
                                      ? 'bg-amber-500/20 text-amber-300'
                                      : 'bg-red-500/20 text-red-300'
                                  }`}
                                >
                                  {st.toUpperCase()}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Homework & Exam Marks */}
          {activeTab === 'academics' && (
            <div className="space-y-6 max-w-4xl">
              {/* Assessments / Exams */}
              <div className="p-6 rounded-2xl bg-[#111624] border border-white/5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-400" /> Academic Exam Marks &amp; Report Card
                </h3>

                {childResults.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No examination marks have been entered for {selectedChild?.name} yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {childResults.map((res: any) => {
                      const pct = res.maxMarks > 0 ? Math.round((res.marks / res.maxMarks) * 100) : 0;
                      return (
                        <div key={res.id} className="p-4 rounded-xl bg-[#171d2e] border border-white/5 space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">{res.subject}</span>
                              <h4 className="text-sm font-bold text-white">{res.examName}</h4>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                res.grade === 'A'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : res.grade === 'B'
                                  ? 'bg-blue-500/20 text-blue-300'
                                  : res.grade === 'C'
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-red-500/20 text-red-300'
                              }`}
                            >
                              Grade {res.grade} ({pct}%)
                            </span>
                          </div>
                          <div className="text-xs text-slate-300">Marks: {res.marks} / {res.maxMarks}</div>
                          {res.feedback && (
                            <div className="text-[11px] text-slate-400 italic">Teacher feedback: &quot;{res.feedback}&quot;</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Assignments Tracking */}
              <div className="p-6 rounded-2xl bg-[#111624] border border-white/5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-400" /> Homework &amp; Coursework Assignments
                </h3>

                {childAssignments.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No assignments are active for {selectedChild?.name}&apos;s class right now.
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {childAssignments.map((asg) => {
                      const sub = submissions.find((s) => s.assignmentId === asg.id && s.studentId === selectedChild.id);
                      return (
                        <div key={asg.id} className="py-3 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold text-white">{asg.title}</span>
                            <span className="text-slate-500 text-[11px] ml-2">({asg.subject})</span>
                            <div className="text-[10px] text-slate-400">Due: {asg.dueDate || 'Open'}</div>
                          </div>
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              sub?.status === 'graded'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : sub?.status === 'submitted'
                                ? 'bg-blue-500/20 text-blue-300'
                                : 'bg-red-500/20 text-red-300'
                            }`}
                          >
                            {sub?.status === 'graded' ? `Graded: ${sub.marks} pts` : sub?.status === 'submitted' ? 'Submitted' : 'Pending Submission'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 3: Announcements */}
          {activeTab === 'announcements' && (
            <div className="space-y-4 max-w-4xl">
              <h2 className="text-sm font-bold text-white">School Notices for Parents</h2>
              {announcements.filter((a) => a.targetType === 'all' || a.targetType === 'parents').length === 0 ? (
                <div className="p-10 text-center rounded-2xl bg-[#101420] border border-white/5 text-xs text-slate-400">
                  No school notices for parents right now.
                </div>
              ) : (
                announcements
                  .filter((a) => a.targetType === 'all' || a.targetType === 'parents')
                  .map((anc) => (
                    <div key={anc.id} className="p-5 rounded-2xl bg-[#111624] border border-white/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">{anc.authorName}</span>
                        <span className="text-[10px] text-slate-500">{new Date(anc.createdAt).toLocaleDateString()}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white">{anc.title}</h4>
                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{anc.content}</p>
                    </div>
                  ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
