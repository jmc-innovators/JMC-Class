import React, { useState } from 'react';
import {
  UserProfile,
  School,
  Classroom,
  Teacher,
  Student,
  Assignment,
  Submission,
  AttendanceSession,
  AttendanceStatus,
  ResultAssessment,
  Announcement,
} from '../../src/types';
import {
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  Sparkles,
  Award,
  Plus,
  Send,
  Copy,
  Check,
  FileText,
  UserCheck,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface TeacherDashboardProps {
  user: UserProfile;
  school: School;
  teacher: Teacher | null;
  classes: Classroom[];
  students: Student[];
  assignments: Assignment[];
  submissions: Submission[];
  attendanceSessions: AttendanceSession[];
  results: ResultAssessment[];
  announcements: Announcement[];
  onCreateAssignment: (data: Omit<Assignment, 'id' | 'createdAt'>) => Promise<void>;
  onGradeSubmission: (submissionId: string, marks: number, feedback: string) => Promise<void>;
  onRecordAttendance: (data: {
    classId: string;
    className?: string;
    subject: string;
    date: string;
    records: Record<string, AttendanceStatus>;
  }) => Promise<void>;
  onSaveAssessmentResult: (data: Omit<ResultAssessment, 'id' | 'createdAt'>) => Promise<void>;
  onCreatePost: (data: { title: string; content: string; targetClassId: string }) => Promise<void>;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  user,
  school,
  teacher,
  classes,
  students,
  assignments,
  submissions,
  attendanceSessions,
  results,
  announcements,
  onCreateAssignment,
  onGradeSubmission,
  onRecordAttendance,
  onSaveAssessmentResult,
  onCreatePost,
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'stream' | 'assignments' | 'attendance' | 'results' | 'ai'>('stream');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Selected active class
  const activeClass = classes.find((c) => c.id === selectedClassId) || classes[0];
  const classStudents = students.filter((s) => s.classId === activeClass?.id);

  // Stream Form
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');

  // Assignment Form Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({
    title: '',
    subject: teacher?.subjects?.[0] || 'Science',
    instructions: '',
    maxMarks: 100,
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    wtype: 'assignment' as const,
  });

  // Selected Assignment for grading
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [gradingState, setGradingState] = useState<Record<string, { marks: number; feedback: string }>>({});

  // Attendance Form
  const todayStr = new Date().toISOString().split('T')[0];
  const [attDate, setAttDate] = useState(todayStr);
  const [attSubject, setAttSubject] = useState(teacher?.subjects?.[0] || 'Science');
  const [attRecords, setAttRecords] = useState<Record<string, AttendanceStatus>>({});
  const [attSaved, setAttSaved] = useState(false);

  // Results Form Modal
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultExamName, setResultExamName] = useState('Term 1 Assessment');
  const [resultSubject, setResultSubject] = useState(teacher?.subjects?.[0] || 'Science');
  const [resultMaxMarks, setResultMaxMarks] = useState(100);
  const [resultMarks, setResultMarks] = useState<Record<string, number>>({});

  // Gemini AI Assistant State
  const [aiTopic, setAiTopic] = useState('');
  const [aiTaskType, setAiTaskType] = useState('Generate an interactive assignment with questions');
  const [aiInstructions, setAiInstructions] = useState('');
  const [aiOutput, setAiOutput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Helper to mark all students present
  const markAllPresent = () => {
    const updated: Record<string, AttendanceStatus> = {};
    classStudents.forEach((st) => {
      updated[st.id] = 'present';
    });
    setAttRecords(updated);
  };

  const handleSaveAttendance = async () => {
    if (!activeClass) return;
    await onRecordAttendance({
      classId: activeClass.id,
      className: activeClass.name,
      subject: attSubject,
      date: attDate,
      records: attRecords,
    });
    setAttSaved(true);
    setTimeout(() => setAttSaved(false), 3000);
  };

  // AI Assistant Call
  const handleGenerateAiLesson = async () => {
    if (!aiTopic) return;
    setAiLoading(true);
    setAiOutput('');
    try {
      const res = await fetch('/api/ai/lesson-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: teacher?.subjects?.[0] || 'Science',
          grade: activeClass?.grade || 'Grade 9',
          topic: aiTopic,
          taskType: aiTaskType,
          instructions: aiInstructions,
        }),
      });
      const data = await res.json();
      if (data.text) {
        setAiOutput(data.text);
      } else if (data.error) {
        setAiOutput(`Notice: ${data.error}`);
      }
    } catch (err) {
      setAiOutput('Error connecting to Gemini AI assistant.');
    } finally {
      setAiLoading(false);
    }
  };

  const calculateGrade = (pct: number) => {
    if (pct >= 75) return 'A';
    if (pct >= 65) return 'B';
    if (pct >= 50) return 'C';
    if (pct >= 35) return 'S';
    return 'F';
  };

  return (
    <div className="space-y-6">
      {/* Teacher Top Header */}
      <div className="p-6 rounded-2xl bg-[#121726] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
            Teacher Portal
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-white font-['Plus_Jakarta_Sans'] mt-1">
            Welcome, {teacher?.name || user.displayName || 'Teacher'}
          </h1>
          <p className="text-xs text-slate-400">
            {school.name} · Subjects:{' '}
            <b className="text-emerald-400">{(teacher?.subjects || ['All']).join(', ')}</b>
          </p>
        </div>

        {/* Classroom Selector */}
        {classes.length > 0 && (
          <div className="flex items-center gap-2 bg-[#171d2e] p-2 rounded-xl border border-white/5">
            <span className="text-xs text-slate-400 font-medium pl-2">Cohort:</span>
            <select
              value={activeClass?.id}
              onChange={(e) => setSelectedClassId(e.target.value)}
              aria-label="Select classroom cohort"
              className="bg-[#1f263c] border border-white/10 rounded-lg text-xs text-white px-3 py-1.5 focus:outline-none focus:border-blue-500 font-semibold"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.grade})
                </option>
              ))}
            </select>

            {activeClass && (
              <button
                onClick={() => copyCode(activeClass.code)}
                title="Copy student join code"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 font-mono text-xs font-bold transition-all border border-blue-500/30"
              >
                <span>{activeClass.code}</span>
                {copiedCode === activeClass.code ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/10 scrollbar-none">
        <button
          onClick={() => setActiveTab('stream')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'stream'
              ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4" /> Class Stream
        </button>
        <button
          onClick={() => setActiveTab('assignments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'assignments'
              ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" /> Assignments &amp; Grading
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'attendance'
              ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4" /> Daily Attendance
        </button>
        <button
          onClick={() => setActiveTab('results')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'results'
              ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Award className="w-4 h-4" /> Marks &amp; Assessments
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'ai'
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4 text-indigo-400" /> AI Lesson Assistant
        </button>
      </div>

      {/* Tab 1: Class Stream */}
      {activeTab === 'stream' && (
        <div className="space-y-4 max-w-4xl">
          {/* Post to Stream Card */}
          <div className="p-5 rounded-2xl bg-[#111624] border border-white/5 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Send className="w-3.5 h-3.5 text-blue-400" /> Share Announcement or Lesson Notes to {activeClass?.name}
            </h3>
            <input
              type="text"
              placeholder="Post title or topic (e.g. Lesson 4: Photosynthesis &amp; Plant Nutrition)"
              value={postTitle}
              onChange={(e) => setPostTitle(e.target.value)}
              className="w-full bg-[#171d2e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
            />
            <textarea
              rows={3}
              placeholder="Share instructions, key revision points, homework links or notes…"
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              className="w-full bg-[#171d2e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
            />
            <div className="flex justify-end">
              <button
                onClick={async () => {
                  if (!postTitle || !postContent || !activeClass) return;
                  await onCreatePost({
                    title: postTitle,
                    content: postContent,
                    targetClassId: activeClass.id,
                  });
                  setPostTitle('');
                  setPostContent('');
                }}
                disabled={!postTitle || !postContent}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white disabled:opacity-50"
              >
                Publish to Stream
              </button>
            </div>
          </div>

          {/* Stream Feed */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recent Posts in {activeClass?.name}</h3>
            {announcements.filter((a) => a.targetClassId === activeClass?.id || a.targetType === 'all').length === 0 ? (
              <div className="p-10 text-center rounded-2xl bg-[#101420] border border-white/5 text-xs text-slate-400">
                No stream updates have been posted for this class yet.
              </div>
            ) : (
              announcements
                .filter((a) => a.targetClassId === activeClass?.id || a.targetType === 'all')
                .map((anc) => (
                  <div key={anc.id} className="p-5 rounded-2xl bg-[#111624] border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">{anc.authorName}</span>
                      <span className="text-[10px] text-slate-500">{new Date(anc.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h4 className="text-sm font-bold text-white">{anc.title}</h4>
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{anc.content}</p>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Assignments & Grading */}
      {activeTab === 'assignments' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">Classwork &amp; Submissions</h2>
              <p className="text-xs text-slate-400">Manage homework, worksheets, and grade student submissions.</p>
            </div>
            <button
              onClick={() => setShowAssignModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/25"
            >
              <Plus className="w-4 h-4" /> Create Assignment
            </button>
          </div>

          {/* Assignments List */}
          {assignments.filter((a) => a.classId === activeClass?.id).length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#101420] border border-white/5 space-y-3">
              <FileText className="w-8 h-8 text-slate-500 mx-auto" />
              <h3 className="text-sm font-semibold text-white">No assignments have been published yet.</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Click &quot;Create Assignment&quot; to issue homework, questions, or revision tasks to {activeClass?.name}.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Assignment Cards */}
              <div className="lg:col-span-5 space-y-3">
                {assignments
                  .filter((a) => a.classId === activeClass?.id)
                  .map((asg) => {
                    const asgSubs = submissions.filter((s) => s.assignmentId === asg.id);
                    const isSelected = selectedAssignmentId === asg.id;
                    return (
                      <div
                        key={asg.id}
                        onClick={() => setSelectedAssignmentId(asg.id)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#151c2e] border-emerald-500/50 ring-1 ring-emerald-500/20'
                            : 'bg-[#111624] border-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">{asg.subject}</span>
                            <h4 className="text-sm font-bold text-white mt-0.5">{asg.title}</h4>
                          </div>
                          <span className="text-[10px] text-slate-400">Due: {asg.dueDate || 'Open'}</span>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/5">
                          <span>Max Marks: {asg.maxMarks || 100}</span>
                          <span className="font-semibold text-blue-300">
                            {asgSubs.length} of {classStudents.length} Submitted
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Submissions & Grading Drawer */}
              <div className="lg:col-span-7 bg-[#111624] border border-white/5 rounded-2xl p-5 space-y-4">
                {selectedAssignmentId ? (
                  <>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-emerald-400" /> Student Submissions &amp; Feedback
                    </h3>
                    {submissions.filter((s) => s.assignmentId === selectedAssignmentId).length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400">
                        No students have submitted this assignment yet.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {submissions
                          .filter((s) => s.assignmentId === selectedAssignmentId)
                          .map((sub) => {
                            const currentGrade = gradingState[sub.id] || {
                              marks: sub.marks || 0,
                              feedback: sub.feedback || '',
                            };
                            return (
                              <div key={sub.id} className="p-4 rounded-xl bg-[#171d2e] border border-white/5 space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="text-xs font-bold text-white">{sub.studentName}</div>
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      sub.status === 'graded'
                                        ? 'bg-emerald-500/20 text-emerald-300'
                                        : 'bg-amber-500/20 text-amber-300'
                                    }`}
                                  >
                                    {sub.status === 'graded' ? `Graded: ${sub.marks} pts` : 'Submitted'}
                                  </span>
                                </div>

                                <div className="p-3 rounded-lg bg-[#0f1422] text-xs text-slate-200 whitespace-pre-wrap border border-white/5 font-mono">
                                  {sub.content || '(Empty submission content)'}
                                </div>

                                {/* Grading Form */}
                                <div className="pt-2 border-t border-white/5 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                                  <div className="sm:col-span-3">
                                    <input
                                      type="number"
                                      placeholder="Marks"
                                      value={currentGrade.marks}
                                      onChange={(e) =>
                                        setGradingState({
                                          ...gradingState,
                                          [sub.id]: {
                                            ...currentGrade,
                                            marks: parseInt(e.target.value) || 0,
                                          },
                                        })
                                      }
                                      className="w-full bg-[#121724] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                                    />
                                  </div>
                                  <div className="sm:col-span-6">
                                    <input
                                      type="text"
                                      placeholder="Teacher feedback (e.g. Excellent work, review Q3)"
                                      value={currentGrade.feedback}
                                      onChange={(e) =>
                                        setGradingState({
                                          ...gradingState,
                                          [sub.id]: {
                                            ...currentGrade,
                                            feedback: e.target.value,
                                          },
                                        })
                                      }
                                      className="w-full bg-[#121724] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                                    />
                                  </div>
                                  <div className="sm:col-span-3 text-right">
                                    <button
                                      onClick={() => onGradeSubmission(sub.id, currentGrade.marks, currentGrade.feedback)}
                                      className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white"
                                    >
                                      Save Grade
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-12 text-center text-xs text-slate-400">
                    Select an assignment on the left to inspect student submissions.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Daily Attendance */}
      {activeTab === 'attendance' && (
        <div className="space-y-4 max-w-4xl">
          <div className="p-5 rounded-2xl bg-[#111624] border border-white/5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-400" /> Daily Attendance Session
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Class: <b>{activeClass?.name}</b> · Accurately records attendance in Firestore
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="date"
                  value={attDate}
                  onChange={(e) => setAttDate(e.target.value)}
                  className="bg-[#171d2e] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white"
                />
                <button
                  type="button"
                  onClick={markAllPresent}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300 border border-white/10"
                >
                  Mark All Present
                </button>
                <button
                  type="button"
                  onClick={handleSaveAttendance}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-md shadow-emerald-600/25"
                >
                  Save to Cloud
                </button>
              </div>
            </div>

            {attSaved && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Attendance recorded and saved to Firestore successfully!
              </div>
            )}

            {classStudents.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No students are currently enrolled in {activeClass?.name}.
              </div>
            ) : (
              <div className="divide-y divide-white/5 pt-2">
                {classStudents.map((st) => {
                  const currentStatus = attRecords[st.id] || 'present';
                  return (
                    <div key={st.id} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-semibold text-white">{st.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{st.admissionNo || 'Student'}</div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setAttRecords({ ...attRecords, [st.id]: 'present' })}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            currentStatus === 'present'
                              ? 'bg-emerald-600 text-white shadow'
                              : 'bg-white/5 text-slate-400 hover:text-white'
                          }`}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          onClick={() => setAttRecords({ ...attRecords, [st.id]: 'late' })}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            currentStatus === 'late'
                              ? 'bg-amber-600 text-white shadow'
                              : 'bg-white/5 text-slate-400 hover:text-white'
                          }`}
                        >
                          Late
                        </button>
                        <button
                          type="button"
                          onClick={() => setAttRecords({ ...attRecords, [st.id]: 'absent' })}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            currentStatus === 'absent'
                              ? 'bg-red-600 text-white shadow'
                              : 'bg-white/5 text-slate-400 hover:text-white'
                          }`}
                        >
                          Absent
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Results & Assessments */}
      {activeTab === 'results' && (
        <div className="space-y-4 max-w-4xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">Assessments &amp; Report Cards</h2>
              <p className="text-xs text-slate-400">Record examination marks and performance grading.</p>
            </div>
            <button
              onClick={() => setShowResultModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/25"
            >
              <Plus className="w-4 h-4" /> Record New Exam Marks
            </button>
          </div>

          {results.filter((r) => r.classId === activeClass?.id).length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#101420] border border-white/5 space-y-3">
              <Award className="w-8 h-8 text-slate-500 mx-auto" />
              <h3 className="text-sm font-semibold text-white">No exam marks have been entered yet.</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Record unit test, term exam, or assignment results for {activeClass?.name}.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {results
                .filter((r) => r.classId === activeClass?.id)
                .map((res) => {
                  const avg =
                    res.records.length > 0
                      ? Math.round(res.records.reduce((acc, curr) => acc + curr.marks, 0) / res.records.length)
                      : 0;
                  return (
                    <div key={res.id} className="p-5 rounded-2xl bg-[#111624] border border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">{res.subject}</span>
                          <h3 className="text-base font-bold text-white">{res.examName}</h3>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-white">Class Avg: {avg}%</div>
                          <span className="text-[10px] text-slate-400">{res.records.length} students recorded</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-2">
                        {res.records.map((rec) => (
                          <div key={rec.studentId} className="p-2.5 rounded-xl bg-[#161c2c] border border-white/5 text-xs">
                            <div className="font-semibold text-white truncate">{rec.studentName}</div>
                            <div className="flex items-center justify-between mt-1 text-slate-400">
                              <span>{rec.marks} / {res.maxMarks}</span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  rec.grade === 'A'
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : rec.grade === 'B'
                                    ? 'bg-blue-500/20 text-blue-300'
                                    : rec.grade === 'C'
                                    ? 'bg-amber-500/20 text-amber-300'
                                    : 'bg-red-500/20 text-red-300'
                                }`}
                              >
                                Grade {rec.grade}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Gemini AI Lesson Assistant */}
      {activeTab === 'ai' && (
        <div className="max-w-4xl space-y-4">
          <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/60 via-[#121726] to-[#121726] border border-indigo-500/30 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-['Plus_Jakarta_Sans']">
                  AI Educational Assistant (Gemini)
                </h3>
                <p className="text-xs text-slate-300">
                  Generate Sri Lankan Grade 6–11 curriculum-aligned assignments, exam questions, and lesson rubrics.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Topic / Chapter</label>
                <input
                  type="text"
                  placeholder="e.g. Electric circuits, Ohm's law, and resistance"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  className="w-full bg-[#171d2e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Task Type</label>
                <select
                  value={aiTaskType}
                  onChange={(e) => setAiTaskType(e.target.value)}
                  className="w-full bg-[#171d2e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="Generate an interactive assignment with questions">Assignment with Questions &amp; Marking Scheme</option>
                  <option value="Generate a 5-question multiple choice quiz">5-Question Multiple Choice Quiz</option>
                  <option value="Generate a lesson summary with revision points">Lesson Revision Summary</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Specific Instructions (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Include 2 calculation problems and 1 real-world example."
                value={aiInstructions}
                onChange={(e) => setAiInstructions(e.target.value)}
                className="w-full bg-[#171d2e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <button
              onClick={handleGenerateAiLesson}
              disabled={aiLoading || !aiTopic}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 disabled:opacity-50"
            >
              {aiLoading ? 'Generating with Gemini…' : 'Generate Curriculum Content'}
            </button>
          </div>

          {/* AI Output Box */}
          {aiOutput && (
            <div className="p-6 rounded-2xl bg-[#111624] border border-indigo-500/25 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-400">Generated Teaching Material</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(aiOutput);
                    alert('Copied to clipboard!');
                  }}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Copy All
                </button>
              </div>
              <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap font-sans bg-[#161c2c] p-4 rounded-xl border border-white/5">
                {aiOutput}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Create Assignment */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#151a28] border border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Issue New Assignment to {activeClass?.name}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Chemical Reactions Worksheet 1"
                  value={assignForm.title}
                  onChange={(e) => setAssignForm({ ...assignForm, title: e.target.value })}
                  className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Subject</label>
                  <input
                    type="text"
                    value={assignForm.subject}
                    onChange={(e) => setAssignForm({ ...assignForm, subject: e.target.value })}
                    className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Max Marks</label>
                  <input
                    type="number"
                    value={assignForm.maxMarks}
                    onChange={(e) => setAssignForm({ ...assignForm, maxMarks: parseInt(e.target.value) || 100 })}
                    className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Submission Deadline</label>
                <input
                  type="date"
                  value={assignForm.dueDate}
                  onChange={(e) => setAssignForm({ ...assignForm, dueDate: e.target.value })}
                  className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Instructions &amp; Questions *</label>
                <textarea
                  rows={4}
                  placeholder="Explain requirements, questions to answer, or attach instructions…"
                  value={assignForm.instructions}
                  onChange={(e) => setAssignForm({ ...assignForm, instructions: e.target.value })}
                  className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 rounded-xl bg-white/5 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!assignForm.title || !activeClass) return;
                  await onCreateAssignment({
                    schoolId: school.id,
                    classId: activeClass.id,
                    className: activeClass.name,
                    subject: assignForm.subject,
                    teacherId: teacher?.id || user.uid,
                    teacherName: teacher?.name || user.displayName || 'Teacher',
                    title: assignForm.title,
                    instructions: assignForm.instructions,
                    maxMarks: assignForm.maxMarks,
                    dueDate: assignForm.dueDate,
                    wtype: assignForm.wtype,
                  });
                  setShowAssignModal(false);
                }}
                className="px-5 py-2 rounded-xl bg-emerald-600 text-xs font-semibold text-white"
              >
                Publish Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Enter Assessment Results */}
      {showResultModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#151a28] border border-white/10 rounded-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white">Record Assessment Marks for {activeClass?.name}</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-300 block mb-1">Assessment Name *</label>
                <input
                  type="text"
                  value={resultExamName}
                  onChange={(e) => setResultExamName(e.target.value)}
                  placeholder="e.g. Unit 3 Test"
                  className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Max Marks</label>
                <input
                  type="number"
                  value={resultMaxMarks}
                  onChange={(e) => setResultMaxMarks(parseInt(e.target.value) || 100)}
                  className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Student Marks Entry</h4>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {classStudents.map((st) => (
                  <div key={st.id} className="flex items-center justify-between gap-3 p-2 bg-[#1b2234] rounded-xl text-xs">
                    <span className="text-white font-medium truncate">{st.name}</span>
                    <input
                      type="number"
                      placeholder="Marks"
                      value={resultMarks[st.id] ?? ''}
                      onChange={(e) =>
                        setResultMarks({
                          ...resultMarks,
                          [st.id]: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-24 bg-[#121724] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white text-right"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/5">
              <button
                onClick={() => setShowResultModal(false)}
                className="px-4 py-2 rounded-xl bg-white/5 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!resultExamName || !activeClass) return;
                  const records = classStudents.map((st) => {
                    const m = resultMarks[st.id] || 0;
                    const pct = resultMaxMarks > 0 ? (m / resultMaxMarks) * 100 : 0;
                    return {
                      studentId: st.id,
                      studentName: st.name,
                      marks: m,
                      grade: calculateGrade(pct),
                    };
                  });
                  await onSaveAssessmentResult({
                    schoolId: school.id,
                    classId: activeClass.id,
                    className: activeClass.name,
                    subject: resultSubject,
                    teacherId: teacher?.id || user.uid,
                    examName: resultExamName,
                    maxMarks: resultMaxMarks,
                    records,
                  });
                  setShowResultModal(false);
                }}
                className="px-5 py-2 rounded-xl bg-emerald-600 text-xs font-semibold text-white"
              >
                Save Marks to Cloud
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
