import React, { useState, useEffect } from 'react';
import {
  UserProfile,
  School,
  Classroom,
  Student,
  Assignment,
  Submission,
  AttendanceSession,
  ResultAssessment,
  Announcement,
  TimetableDay,
} from '../../src/types';
import {
  BookOpen,
  Calendar,
  Award,
  Sparkles,
  FileText,
  CheckCircle2,
  Clock,
  Send,
  Plus,
  ArrowRight,
  TrendingUp,
  HelpCircle,
  Check,
  X,
  MessageSquare,
  Bookmark,
  Share2,
  Play,
  Pause,
  RotateCcw,
  Timer,
  StickyNote,
  BarChart2,
  Search,
  Trash2,
} from 'lucide-react';

interface StudentDashboardProps {
  user: UserProfile;
  school: School;
  student: Student | null;
  classes: Classroom[];
  assignments: Assignment[];
  submissions: Submission[];
  attendanceSessions: AttendanceSession[];
  results: ResultAssessment[];
  announcements: Announcement[];
  timetables?: TimetableDay[];
  onSubmitWork: (data: {
    assignmentId: string;
    assignmentTitle?: string;
    classId: string;
    studentId: string;
    studentName: string;
    content: string;
    isDraft?: boolean;
  }) => Promise<void>;
  onJoinClassByCode: (code: string) => Promise<void>;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  user,
  school,
  student,
  classes,
  assignments,
  submissions,
  attendanceSessions,
  results,
  announcements,
  timetables = [],
  onSubmitWork,
  onJoinClassByCode,
}) => {
  const [activeTab, setActiveTab] = useState<'stream' | 'assignments' | 'attendance' | 'results' | 'timetable' | 'quiz' | 'tutor' | 'pomodoro' | 'notes' | 'analytics'>('stream');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Selected assignment for viewing/working
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
  const [submissionText, setSubmissionText] = useState('');
  const [submissionAttachment, setSubmissionAttachment] = useState('');
  const [savingWork, setSavingWork] = useState(false);

  // Subject filter
  const [selectedSubject, setSelectedSubject] = useState<string>('All');

  // Pomodoro Focus Timer State
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<'study' | 'break'>('study');
  const [timerSubject, setTimerSubject] = useState('Science');
  const [completedSessions, setCompletedSessions] = useState<{ id: string; subject: string; durationMin: number; timestamp: string }[]>([
    { id: 'sess_1', subject: 'Science', durationMin: 25, timestamp: 'Today, 09:30 AM' },
    { id: 'sess_2', subject: 'Maths', durationMin: 25, timestamp: 'Yesterday, 04:15 PM' },
  ]);

  // Personal Revision Notes State
  const [notes, setNotes] = useState<{ id: string; title: string; subject: string; content: string; updatedAt: string }[]>([
    {
      id: 'note_1',
      title: 'Newton Second Law Formula & Units',
      subject: 'Science',
      content: 'F = m * a\nForce is in Newtons (N), mass in kg, acceleration in m/s².\nExample: 10kg mass with 2m/s² acceleration requires 20N force.',
      updatedAt: 'Yesterday',
    },
    {
      id: 'note_2',
      title: 'Pythagorean Triples for O/L Exam',
      subject: 'Maths',
      content: 'Standard right angle triples:\n(3, 4, 5)\n(5, 12, 13)\n(7, 24, 25)\n(8, 15, 17)',
      updatedAt: '2 days ago',
    },
  ]);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteSubject, setNewNoteSubject] = useState('Science');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [noteSearch, setNoteSearch] = useState('');
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (timerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0 && timerRunning) {
      setTimerRunning(false);
      if (timerMode === 'study') {
        setCompletedSessions((prev) => [
          {
            id: 'sess_' + Date.now(),
            subject: timerSubject,
            durationMin: 25,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
          ...prev,
        ]);
        alert(`Great job! You finished a 25-minute study focus session in ${timerSubject}. Time for a 5-minute break!`);
        setTimerMode('break');
        setTimerSeconds(5 * 60);
      } else {
        alert('Break completed! Ready for the next study session.');
        setTimerMode('study');
        setTimerSeconds(25 * 60);
      }
    }
    return () => clearInterval(interval);
  }, [timerRunning, timerSeconds, timerMode, timerSubject]);

  // AI Tutor State
  const [tutorQuestion, setTutorQuestion] = useState('');
  const [tutorSubject, setTutorSubject] = useState('Science');
  const [tutorAnswer, setTutorAnswer] = useState('');
  const [tutorLoading, setTutorLoading] = useState(false);

  // Interactive Quiz Engine State
  const [quizSubject, setQuizSubject] = useState<'Science' | 'Maths' | 'ICT'>('Science');
  const [currentQuizIdx, setCurrentQuizIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Get student ID to query
  const studentId = student?.id || user.uid;
  const myClassId = student?.classId || classes[0]?.id;
  const myClass = classes.find((c) => c.id === myClassId);

  // Filter student-specific assignments
  const myAssignments = assignments.filter((a) => {
    const matchesClass = !myClassId || a.classId === myClassId;
    const matchesSubj = selectedSubject === 'All' || a.subject.toLowerCase() === selectedSubject.toLowerCase();
    return matchesClass && matchesSubj;
  });

  // Calculate student personal attendance strictly from real Firestore sessions
  let totalMarkedSessions = 0;
  let presentCount = 0;
  let lateCount = 0;
  let absentCount = 0;

  attendanceSessions.forEach((sess) => {
    if (sess.records && sess.records[studentId]) {
      totalMarkedSessions++;
      const st = sess.records[studentId];
      if (st === 'present') presentCount++;
      else if (st === 'late') lateCount++;
      else if (st === 'absent') absentCount++;
    }
  });

  const attendancePercentage =
    totalMarkedSessions > 0
      ? Math.round(((presentCount + lateCount * 0.5) / totalMarkedSessions) * 100)
      : null;

  // Student specific results
  const myResults = results
    .map((res) => {
      const myRecord = res.records.find((r) => r.studentId === studentId);
      if (!myRecord) return null;
      return {
        ...res,
        myMarks: myRecord.marks,
        myGrade: myRecord.grade,
        myFeedback: myRecord.feedback,
      };
    })
    .filter(Boolean) as (ResultAssessment & { myMarks: number; myGrade: string; myFeedback?: string })[];

  // Practice Quiz Bank for Sri Lankan Curriculum
  const practiceQuizzes = {
    Science: [
      {
        q: 'Which organelle is known as the powerhouse of the cell?',
        options: ['Nucleus', 'Mitochondria', 'Chloroplast', 'Ribosome'],
        ans: 1,
        exp: 'Mitochondria generate most of the chemical energy needed by the cell through cellular respiration.',
      },
      {
        q: "According to Ohm's Law, what is the formula relating Voltage (V), Current (I), and Resistance (R)?",
        options: ['V = I / R', 'V = I * R', 'V = R / I', 'I = V * R'],
        ans: 1,
        exp: 'Ohm’s law states that Voltage is equal to Current multiplied by Resistance (V = I * R).',
      },
      {
        q: 'What is the pH of pure neutral water at 25°C?',
        options: ['1', '5', '7', '14'],
        ans: 2,
        exp: 'Neutral solutions have a pH of 7 on the pH scale from 0 to 14.',
      },
      {
        q: 'Which gas is released during photosynthesis?',
        options: ['Carbon Dioxide', 'Oxygen', 'Nitrogen', 'Methane'],
        ans: 1,
        exp: 'During photosynthesis, chlorophyll absorbs sunlight and splits water molecules to produce Oxygen (O2).',
      },
    ],
    Maths: [
      {
        q: 'What is the value of x if 2x + 7 = 19?',
        options: ['5', '6', '7', '12'],
        ans: 1,
        exp: 'Subtract 7 from both sides: 2x = 12. Then divide by 2: x = 6.',
      },
      {
        q: 'What is the area of a circle with radius 7 cm? (Use π = 22/7)',
        options: ['44 cm²', '154 cm²', '88 cm²', '49 cm²'],
        ans: 1,
        exp: 'Area = π * r² = (22/7) * 7 * 7 = 154 cm².',
      },
      {
        q: 'What is the hypotenuse of a right-angled triangle with sides 3 cm and 4 cm?',
        options: ['5 cm', '7 cm', '6 cm', '25 cm'],
        ans: 0,
        exp: 'By Pythagoras theorem: 3² + 4² = 9 + 16 = 25. The square root of 25 is 5 cm.',
      },
    ],
    ICT: [
      {
        q: 'Which component is considered the brain of the computer?',
        options: ['RAM', 'CPU (Central Processing Unit)', 'Hard Disk', 'GPU'],
        ans: 1,
        exp: 'The CPU performs calculations, executes instructions, and coordinates data flow.',
      },
      {
        q: 'How many bits are in one Byte?',
        options: ['4 bits', '8 bits', '16 bits', '1024 bits'],
        ans: 1,
        exp: '1 Byte is composed of exactly 8 binary digits (bits).',
      },
      {
        q: 'What does HTML stand for in web development?',
        options: ['High Tech Machine Language', 'HyperText Markup Language', 'Hyperlink Text Module Loop', 'Home Tool Multi Language'],
        ans: 1,
        exp: 'HTML stands for HyperText Markup Language, the standard markup language for web pages.',
      },
    ],
  };

  const currentQuizList = practiceQuizzes[quizSubject] || practiceQuizzes.Science;

  const handleOpenAssignment = (asg: Assignment) => {
    setActiveAssignmentId(asg.id);
    const existing = submissions.find((s) => s.assignmentId === asg.id && s.studentId === studentId);
    setSubmissionText(existing?.content || '');
  };

  const handleSaveSubmission = async (isDraft = false) => {
    if (!activeAssignmentId) return;
    const asg = assignments.find((a) => a.id === activeAssignmentId);
    if (!asg) return;
    setSavingWork(true);
    try {
      await onSubmitWork({
        assignmentId: asg.id,
        assignmentTitle: asg.title,
        classId: asg.classId,
        studentId: studentId,
        studentName: student?.name || user.displayName || 'Student',
        content: submissionText,
        isDraft,
      });
      alert(isDraft ? 'Draft saved successfully!' : 'Assignment submitted to teacher!');
    } finally {
      setSavingWork(false);
    }
  };

  const handleAskTutor = async () => {
    if (!tutorQuestion) return;
    setTutorLoading(true);
    setTutorAnswer('');
    try {
      const res = await fetch('/api/ai/study-helper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: tutorQuestion,
          subject: tutorSubject,
          grade: student?.grade || 'Grade 9',
        }),
      });
      const data = await res.json();
      if (data.text) {
        setTutorAnswer(data.text);
      } else if (data.error) {
        setTutorAnswer(`Notice: ${data.error}`);
      }
    } catch {
      setTutorAnswer('Could not connect to AI Tutor. Please try again.');
    } finally {
      setTutorLoading(false);
    }
  };

  // Days of week for timetable
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const todayDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <div className="space-y-6">
      {/* Student Banner */}
      <div className="p-6 rounded-2xl bg-[#121726] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/25">
            Student Learning Portal
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-white font-['Plus_Jakarta_Sans'] mt-1">
            {student?.name || user.displayName || 'Student'}
          </h1>
          <p className="text-xs text-slate-400">
            {school.name} · {myClass ? `${myClass.name} (${myClass.grade})` : 'Classroom Portal'} · Admission: {student?.admissionNo || 'Enrolled'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {attendancePercentage !== null && (
            <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-center">
              <div
                className={`text-lg font-black ${
                  attendancePercentage >= 80
                    ? 'text-emerald-400'
                    : attendancePercentage >= 60
                    ? 'text-amber-400'
                    : 'text-red-400'
                }`}
              >
                {attendancePercentage}%
              </div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Attendance</div>
            </div>
          )}

          <button
            onClick={() => setShowJoinModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-600/25 transition-all"
          >
            <Plus className="w-4 h-4" /> Join Another Class
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/10 scrollbar-none">
        <button
          onClick={() => setActiveTab('stream')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'stream'
              ? 'bg-amber-600/20 text-amber-300 border border-amber-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4" /> Stream &amp; Notes
        </button>
        <button
          onClick={() => setActiveTab('assignments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'assignments'
              ? 'bg-amber-600/20 text-amber-300 border border-amber-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" /> My Assignments ({myAssignments.length})
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'attendance'
              ? 'bg-amber-600/20 text-amber-300 border border-amber-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4" /> Attendance ({attendancePercentage !== null ? `${attendancePercentage}%` : '0%'})
        </button>
        <button
          onClick={() => setActiveTab('results')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'results'
              ? 'bg-amber-600/20 text-amber-300 border border-amber-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Award className="w-4 h-4" /> Exam Report Card ({myResults.length})
        </button>
        <button
          onClick={() => setActiveTab('timetable')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'timetable'
              ? 'bg-amber-600/20 text-amber-300 border border-amber-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" /> Class Timetable
        </button>
        <button
          onClick={() => setActiveTab('quiz')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'quiz'
              ? 'bg-amber-600/20 text-amber-300 border border-amber-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <HelpCircle className="w-4 h-4" /> Self-Practice Quiz
        </button>
        <button
          onClick={() => setActiveTab('pomodoro')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'pomodoro'
              ? 'bg-rose-600/20 text-rose-300 border border-rose-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Timer className="w-4 h-4 text-rose-400" /> Focus Pomodoro
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'notes'
              ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <StickyNote className="w-4 h-4 text-emerald-400" /> My Notes ({notes.length})
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'analytics'
              ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <BarChart2 className="w-4 h-4 text-cyan-400" /> Analytics
        </button>
        <button
          onClick={() => setActiveTab('tutor')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'tutor'
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4 text-indigo-400" /> AI Study Tutor
        </button>
      </div>

      {/* Tab 1: Class Stream */}
      {activeTab === 'stream' && (
        <div className="space-y-4 max-w-4xl">
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Class Announcements &amp; Lesson Notes</h3>
            {announcements.length === 0 ? (
              <div className="p-10 text-center rounded-2xl bg-[#101420] border border-white/5 text-xs text-slate-400">
                No announcements or lesson materials have been posted yet.
              </div>
            ) : (
              announcements.map((anc) => (
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

      {/* Tab 2: My Assignments */}
      {activeTab === 'assignments' && (
        <div className="space-y-6">
          {/* Subject Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {['All', 'Science', 'Maths', 'English', 'History', 'ICT'].map((sub) => (
              <button
                key={sub}
                onClick={() => setSelectedSubject(sub)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  selectedSubject === sub
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-white/5 text-slate-400 border-white/5 hover:text-white'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>

          {myAssignments.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#101420] border border-white/5 space-y-3">
              <FileText className="w-8 h-8 text-slate-500 mx-auto" />
              <h3 className="text-sm font-semibold text-white">No assignments found for this filter.</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                When your teachers publish homework, revision questions, or assignments, they will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Assignment List */}
              <div className="lg:col-span-5 space-y-3">
                {myAssignments.map((asg) => {
                  const sub = submissions.find((s) => s.assignmentId === asg.id && s.studentId === studentId);
                  const isSelected = activeAssignmentId === asg.id;
                  return (
                    <div
                      key={asg.id}
                      onClick={() => handleOpenAssignment(asg)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#151c2e] border-amber-500/50 ring-1 ring-amber-500/20'
                          : 'bg-[#111624] border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">{asg.subject}</span>
                          <h4 className="text-sm font-bold text-white mt-0.5">{asg.title}</h4>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            sub?.status === 'graded'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : sub?.status === 'submitted'
                              ? 'bg-blue-500/20 text-blue-300'
                              : 'bg-white/5 text-slate-400'
                          }`}
                        >
                          {sub?.status === 'graded' ? `${sub.marks} pts` : sub?.status === 'submitted' ? 'Submitted' : 'Pending'}
                        </span>
                      </div>
                      <div className="mt-3 text-xs text-slate-400 flex items-center justify-between pt-2 border-t border-white/5">
                        <span>Teacher: {asg.teacherName}</span>
                        <span>Due: {asg.dueDate || 'Open'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Assignment Workspace Drawer */}
              <div className="lg:col-span-7 bg-[#111624] border border-white/5 rounded-2xl p-6 space-y-4">
                {activeAssignmentId ? (
                  (() => {
                    const asg = assignments.find((a) => a.id === activeAssignmentId);
                    const sub = submissions.find((s) => s.assignmentId === activeAssignmentId && s.studentId === studentId);
                    if (!asg) return null;
                    return (
                      <div className="space-y-4">
                        <div className="border-b border-white/5 pb-3">
                          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">{asg.subject}</span>
                          <h3 className="text-base font-bold text-white mt-0.5">{asg.title}</h3>
                          <p className="text-xs text-slate-400 mt-1">{asg.instructions || 'Answer questions in the workspace below.'}</p>
                          <div className="text-[11px] text-slate-500 mt-2">Max Marks: {asg.maxMarks || 100} pts · Due: {asg.dueDate || 'Open'}</div>
                        </div>

                        {sub?.status === 'graded' && (
                          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1 text-xs">
                            <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                              <Award className="w-4 h-4" /> Graded by Teacher: {sub.marks} / {asg.maxMarks} points
                            </div>
                            {sub.feedback && <div className="text-slate-300">Feedback: &quot;{sub.feedback}&quot;</div>}
                          </div>
                        )}

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-semibold text-slate-300">
                              Your Answer / Submission
                            </label>
                            <span className="text-[10px] text-slate-500">
                              {submissionText.trim().split(/\s+/).filter(Boolean).length} words
                            </span>
                          </div>
                          <textarea
                            rows={8}
                            value={submissionText}
                            onChange={(e) => setSubmissionText(e.target.value)}
                            placeholder="Type your answers, explanation, or paste essay content here…"
                            className="w-full bg-[#171d2e] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => handleSaveSubmission(true)}
                            disabled={savingWork || !submissionText}
                            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300"
                          >
                            Save Draft
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveSubmission(false)}
                            disabled={savingWork || !submissionText}
                            className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white shadow-lg shadow-amber-600/30"
                          >
                            {savingWork ? 'Submitting…' : 'Submit to Teacher'}
                          </button>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="p-12 text-center text-xs text-slate-400">
                    Select an assignment on the left to read instructions and submit your work.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: My Attendance */}
      {activeTab === 'attendance' && (
        <div className="space-y-6 max-w-4xl">
          <div className="p-6 rounded-2xl bg-[#111624] border border-white/5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" /> Attendance Performance Summary
            </h3>

            {totalMarkedSessions === 0 ? (
              <div className="p-10 text-center text-xs text-slate-400">
                No attendance sessions have been recorded for your account yet.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-4 rounded-xl bg-[#171d2e] border border-white/5 text-center">
                    <div className="text-2xl font-black text-white">{totalMarkedSessions}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Sessions</div>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <div className="text-2xl font-black text-emerald-400">{presentCount}</div>
                    <div className="text-[10px] text-emerald-300 uppercase font-semibold">Present</div>
                  </div>
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                    <div className="text-2xl font-black text-amber-400">{lateCount}</div>
                    <div className="text-[10px] text-amber-300 uppercase font-semibold">Late</div>
                  </div>
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                    <div className="text-2xl font-black text-red-400">{absentCount}</div>
                    <div className="text-[10px] text-red-300 uppercase font-semibold">Absent</div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 space-y-2">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Attendance Log</h4>
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {attendanceSessions
                      .filter((s) => s.records && s.records[studentId])
                      .map((sess) => {
                        const st = sess.records[studentId];
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

      {/* Tab 4: Exam Results & Report Card */}
      {activeTab === 'results' && (
        <div className="space-y-4 max-w-4xl">
          <h2 className="text-sm font-bold text-white">Academic Examination Marks</h2>

          {myResults.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#101420] border border-white/5 space-y-3">
              <Award className="w-8 h-8 text-slate-500 mx-auto" />
              <h3 className="text-sm font-semibold text-white">No exam results have been published for you yet.</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Once your teachers record unit tests or term exam marks, your report card will update automatically.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {myResults.map((res) => {
                const pct = res.maxMarks > 0 ? Math.round((res.myMarks / res.maxMarks) * 100) : 0;
                return (
                  <div key={res.id} className="p-5 rounded-2xl bg-[#111624] border border-white/5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">{res.subject}</span>
                        <h4 className="text-base font-bold text-white mt-0.5">{res.examName}</h4>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-white">{res.myMarks} / {res.maxMarks}</div>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            res.myGrade === 'A'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : res.myGrade === 'B'
                              ? 'bg-blue-500/20 text-blue-300'
                              : res.myGrade === 'C'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-red-500/20 text-red-300'
                          }`}
                        >
                          Grade {res.myGrade} ({pct}%)
                        </span>
                      </div>
                    </div>
                    {res.myFeedback && (
                      <div className="p-2.5 rounded-xl bg-[#161c2c] text-xs text-slate-300 border border-white/5">
                        Teacher Feedback: &quot;{res.myFeedback}&quot;
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Class Timetable */}
      {activeTab === 'timetable' && (
        <div className="space-y-4 max-w-4xl">
          <div className="p-6 rounded-2xl bg-[#111624] border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400" /> Weekly Class Schedule
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{myClass?.name || 'Class'} Daily Periods</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 text-xs font-semibold">
                Today: {todayDayName}
              </span>
            </div>

            <div className="space-y-3">
              {daysOfWeek.map((day) => {
                const isToday = day.toLowerCase() === todayDayName.toLowerCase();
                // Standard default periods for Grade 6-11
                const periods = [
                  { num: 1, time: '08:00 - 08:45', subj: 'Mathematics', room: 'Room 9A' },
                  { num: 2, time: '08:45 - 09:30', subj: 'Science', room: 'Lab 2' },
                  { num: 3, time: '09:30 - 10:15', subj: 'English', room: 'Room 9A' },
                  { num: 4, time: '10:35 - 11:20', subj: 'History', room: 'Room 9A' },
                  { num: 5, time: '11:20 - 12:05', subj: 'ICT', room: 'Computer Lab' },
                  { num: 6, time: '12:05 - 12:50', subj: 'Tamil / Sinhala', room: 'Room 9A' },
                ];

                return (
                  <div
                    key={day}
                    className={`p-4 rounded-xl border transition-all ${
                      isToday
                        ? 'bg-[#151c2e] border-blue-500/40 ring-1 ring-blue-500/20'
                        : 'bg-[#171d2e] border-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-white flex items-center gap-2">
                        {day} {isToday && <span className="text-[10px] text-blue-400 uppercase tracking-wider font-mono">• ACTIVE</span>}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                      {periods.map((p) => (
                        <div key={p.num} className="p-2 rounded-lg bg-[#0f1422] border border-white/5 text-[11px]">
                          <div className="text-[10px] text-slate-500">P{p.num} · {p.time}</div>
                          <div className="font-semibold text-slate-200 truncate mt-0.5">{p.subj}</div>
                          <div className="text-[10px] text-slate-400">{p.room}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Self-Practice Quiz */}
      {activeTab === 'quiz' && (
        <div className="space-y-4 max-w-3xl">
          <div className="p-6 rounded-2xl bg-[#111624] border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-400" /> Interactive Self-Practice Quiz
                </h3>
                <p className="text-xs text-slate-400">Test your knowledge with instant evaluation and curriculum explanations.</p>
              </div>

              {/* Subject Selector */}
              <div className="flex items-center gap-1.5 bg-[#171d2e] p-1 rounded-xl border border-white/5">
                {(['Science', 'Maths', 'ICT'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setQuizSubject(s);
                      setCurrentQuizIdx(0);
                      setSelectedOption(null);
                      setQuizSubmitted(false);
                      setQuizScore(0);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      quizSubject === s ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Current Question */}
            {(() => {
              const currentQ = currentQuizList[currentQuizIdx];
              return (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Question {currentQuizIdx + 1} of {currentQuizList.length}</span>
                    <span>Score: {quizScore} / {currentQuizList.length}</span>
                  </div>

                  <div className="p-4 rounded-xl bg-[#171d2e] border border-white/5 font-semibold text-white text-sm">
                    {currentQ.q}
                  </div>

                  {/* Options */}
                  <div className="space-y-2">
                    {currentQ.options.map((opt, idx) => {
                      const isChosen = selectedOption === idx;
                      const isCorrect = currentQ.ans === idx;
                      let btnStyle = 'bg-[#171d2e] border-white/5 text-slate-300 hover:border-white/20';

                      if (quizSubmitted) {
                        if (isCorrect) {
                          btnStyle = 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200';
                        } else if (isChosen && !isCorrect) {
                          btnStyle = 'bg-red-500/20 border-red-500/40 text-red-200';
                        }
                      } else if (isChosen) {
                        btnStyle = 'bg-amber-500/20 border-amber-500/40 text-amber-200';
                      }

                      return (
                        <button
                          key={opt}
                          disabled={quizSubmitted}
                          onClick={() => setSelectedOption(idx)}
                          className={`w-full p-3 rounded-xl border text-left text-xs font-medium transition-all flex items-center justify-between ${btnStyle}`}
                        >
                          <span>{opt}</span>
                          {quizSubmitted && isCorrect && <Check className="w-4 h-4 text-emerald-400" />}
                          {quizSubmitted && isChosen && !isCorrect && <X className="w-4 h-4 text-red-400" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation after submit */}
                  {quizSubmitted && (
                    <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/25 text-xs text-blue-200 leading-relaxed">
                      <b>Explanation:</b> {currentQ.exp}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    {!quizSubmitted ? (
                      <button
                        onClick={() => {
                          if (selectedOption === null) return;
                          if (selectedOption === currentQ.ans) {
                            setQuizScore((prev) => prev + 1);
                          }
                          setQuizSubmitted(true);
                        }}
                        disabled={selectedOption === null}
                        className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white disabled:opacity-50"
                      >
                        Check Answer
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (currentQuizIdx < currentQuizList.length - 1) {
                            setCurrentQuizIdx((prev) => prev + 1);
                            setSelectedOption(null);
                            setQuizSubmitted(false);
                          } else {
                            alert(`Quiz completed! You scored ${quizScore} out of ${currentQuizList.length}.`);
                            setCurrentQuizIdx(0);
                            setSelectedOption(null);
                            setQuizSubmitted(false);
                            setQuizScore(0);
                          }
                        }}
                        className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white"
                      >
                        {currentQuizIdx < currentQuizList.length - 1 ? 'Next Question →' : 'Restart Quiz'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Tab 7: AI Study Tutor */}
      {activeTab === 'tutor' && (
        <div className="space-y-4 max-w-4xl">
          <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/60 via-[#121726] to-[#121726] border border-indigo-500/30 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-['Plus_Jakarta_Sans']">
                  JMC AI Tutor (Powered by Gemini)
                </h3>
                <p className="text-xs text-slate-300">
                  Ask any question from your curriculum for a step-by-step friendly explanation and example.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-1">
                <label className="text-xs font-semibold text-slate-300 block mb-1">Subject</label>
                <select
                  value={tutorSubject}
                  onChange={(e) => setTutorSubject(e.target.value)}
                  className="w-full bg-[#171d2e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="Science">Science</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="English">English</option>
                  <option value="ICT">ICT</option>
                  <option value="History">History</option>
                </select>
              </div>
              <div className="sm:col-span-3">
                <label className="text-xs font-semibold text-slate-300 block mb-1">Your Question or Topic</label>
                <input
                  type="text"
                  placeholder="e.g. How does photosynthesis work in plants during sunlight?"
                  value={tutorQuestion}
                  onChange={(e) => setTutorQuestion(e.target.value)}
                  className="w-full bg-[#171d2e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <button
              onClick={handleAskTutor}
              disabled={tutorLoading || !tutorQuestion}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 disabled:opacity-50"
            >
              {tutorLoading ? 'Thinking with Gemini…' : 'Explain to Me Step-by-Step'}
            </button>
          </div>

          {tutorAnswer && (
            <div className="p-6 rounded-2xl bg-[#111624] border border-indigo-500/25 space-y-2">
              <span className="text-xs font-bold text-indigo-400">AI Tutor Explanation</span>
              <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap bg-[#161c2c] p-4 rounded-xl border border-white/5 font-sans">
                {tutorAnswer}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Focus Pomodoro Timer */}
      {activeTab === 'pomodoro' && (
        <div className="space-y-6 max-w-3xl">
          <div className="p-8 rounded-2xl bg-[#111624] border border-rose-500/20 text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/25">
              <Timer className="w-3.5 h-3.5 text-rose-400" />
              <span>{timerMode === 'study' ? '25-Min Study Focus Interval' : '5-Min Rest Interval'}</span>
            </div>

            <div className="flex justify-center items-center gap-3">
              <span className="text-xs text-slate-400">Subject:</span>
              <select
                value={timerSubject}
                onChange={(e) => setTimerSubject(e.target.value)}
                disabled={timerRunning}
                className="bg-[#171d2e] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white"
              >
                {['Science', 'Maths', 'English', 'ICT', 'History', 'Tamil', 'Sinhala'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="text-6xl sm:text-7xl font-black font-mono tracking-tight text-white">
              {String(Math.floor(timerSeconds / 60)).padStart(2, '0')}:
              {String(timerSeconds % 60).padStart(2, '0')}
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setTimerRunning(!timerRunning)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs text-white transition-all shadow-lg ${
                  timerRunning
                    ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                    : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                }`}
              >
                {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{timerRunning ? 'Pause Focus' : 'Start Focus Session'}</span>
              </button>
              <button
                onClick={() => {
                  setTimerRunning(false);
                  setTimerSeconds(timerMode === 'study' ? 25 * 60 : 5 * 60);
                }}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 border border-white/10 transition-all"
              >
                <RotateCcw className="w-4 h-4" /> Reset
              </button>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[#111624] border border-white/5 space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Completed Focus Sessions
            </h4>
            {completedSessions.length === 0 ? (
              <div className="text-xs text-slate-500 italic p-4 text-center">No completed study sessions yet. Start the timer to log your focus time!</div>
            ) : (
              <div className="space-y-2">
                {completedSessions.map((sess) => (
                  <div key={sess.id} className="flex items-center justify-between p-3 rounded-xl bg-[#171e30] border border-white/5 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-rose-400" />
                      <span className="font-bold text-white">{sess.subject}</span>
                      <span className="text-slate-400">· {sess.durationMin} minutes</span>
                    </div>
                    <span className="text-slate-500 text-[11px]">{sess.timestamp}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Revision Notes */}
      {activeTab === 'notes' && (
        <div className="space-y-6 max-w-4xl">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search notes…"
                value={noteSearch}
                onChange={(e) => setNoteSearch(e.target.value)}
                className="w-full bg-[#121724] border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              onClick={() => setShowAddNoteModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Note
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notes
              .filter(
                (n) =>
                  !noteSearch ||
                  n.title.toLowerCase().includes(noteSearch.toLowerCase()) ||
                  n.content.toLowerCase().includes(noteSearch.toLowerCase()) ||
                  n.subject.toLowerCase().includes(noteSearch.toLowerCase())
              )
              .map((note) => (
                <div key={note.id} className="p-5 rounded-2xl bg-[#111624] border border-white/5 flex flex-col justify-between hover:border-white/10 transition-all">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/25">
                        {note.subject}
                      </span>
                      <button
                        onClick={() => setNotes((prev) => prev.filter((n) => n.id !== note.id))}
                        className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <h4 className="text-sm font-bold text-white">{note.title}</h4>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed whitespace-pre-wrap font-sans">
                      {note.content}
                    </p>
                  </div>
                  <div className="mt-4 pt-2 border-t border-white/5 text-[10px] text-slate-500">
                    Updated {note.updatedAt}
                  </div>
                </div>
              ))}
          </div>

          {/* Modal to add note */}
          {showAddNoteModal && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#151a28] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4">
                <h3 className="text-base font-bold text-white">Create Revision Note</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-300 block mb-1">Subject</label>
                    <select
                      value={newNoteSubject}
                      onChange={(e) => setNewNoteSubject(e.target.value)}
                      className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      {['Science', 'Maths', 'English', 'ICT', 'History', 'Tamil', 'Sinhala'].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 block mb-1">Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Formula Summary"
                      value={newNoteTitle}
                      onChange={(e) => setNewNoteTitle(e.target.value)}
                      className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 block mb-1">Note Content</label>
                    <textarea
                      rows={4}
                      placeholder="Write your study notes, formulas, or bullet points…"
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowAddNoteModal(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 text-xs text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!newNoteTitle.trim() || !newNoteContent.trim()) return;
                      setNotes((prev) => [
                        {
                          id: 'note_' + Date.now(),
                          title: newNoteTitle.trim(),
                          subject: newNoteSubject,
                          content: newNoteContent.trim(),
                          updatedAt: 'Just now',
                        },
                        ...prev,
                      ]);
                      setNewNoteTitle('');
                      setNewNoteContent('');
                      setShowAddNoteModal(false);
                    }}
                    className="px-5 py-2 rounded-xl bg-emerald-600 text-xs font-bold text-white shadow-md shadow-emerald-600/30"
                  >
                    Save Note
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Analytics & Progress */}
      {activeTab === 'analytics' && (
        <div className="space-y-6 max-w-4xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-[#111624] border border-white/5">
              <div className="text-slate-400 text-xs font-medium">Assignment Completion</div>
              <div className="text-2xl font-black text-white mt-1">
                {submissions.filter((s) => s.studentId === studentId && s.status !== 'draft').length} / {myAssignments.length}
              </div>
              <div className="text-[10px] text-emerald-400 mt-1">
                {myAssignments.length > 0
                  ? `${Math.round((submissions.filter((s) => s.studentId === studentId && s.status !== 'draft').length / myAssignments.length) * 100)}% completed`
                  : 'All caught up'}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#111624] border border-white/5">
              <div className="text-slate-400 text-xs font-medium">Attendance Record</div>
              <div className="text-2xl font-black text-emerald-400 mt-1">
                {attendancePercentage !== null ? `${attendancePercentage}%` : '100%'}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {presentCount} present · {lateCount} late · {absentCount} absent
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#111624] border border-white/5">
              <div className="text-slate-400 text-xs font-medium">Focus Study Logged</div>
              <div className="text-2xl font-black text-rose-400 mt-1">
                {completedSessions.reduce((acc, s) => acc + s.durationMin, 0)} min
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {completedSessions.length} pomodoro sessions
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[#111624] border border-white/5 space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" /> Exam Marks &amp; Progress History
            </h4>
            {myResults.length === 0 ? (
              <div className="text-xs text-slate-500 italic p-6 text-center">No official exam marks recorded yet. Marks entered by teachers will automatically populate your report card and trend chart here.</div>
            ) : (
              <div className="space-y-3">
                {myResults.map((res) => (
                  <div key={res.id} className="p-4 rounded-xl bg-[#161c2c] border border-white/5 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">{res.examName} · {res.subject}</div>
                      <div className="text-[11px] text-slate-400">Class {res.className || myClass?.name}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black text-amber-300">{res.myMarks}</span>
                      <span className="text-xs text-slate-400"> / 100 ({res.myGrade})</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Join Another Class Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#151a28] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Join Another Class with 6-Letter Code</h3>
            <p className="text-xs text-slate-400">
              Ask your teacher for their class code (e.g. AB3X9K).
            </p>
            <input
              type="text"
              maxLength={6}
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
              placeholder="AB3X9K"
              className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold tracking-widest uppercase text-center"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowJoinModal(false)}
                className="px-4 py-2 rounded-xl bg-white/5 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!joinCodeInput) return;
                  await onJoinClassByCode(joinCodeInput);
                  setShowJoinModal(false);
                }}
                className="px-5 py-2 rounded-xl bg-blue-600 text-xs font-bold text-white"
              >
                Join Class
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
