import React, { useState } from 'react';
import {
  School,
  Classroom,
  Teacher,
  Student,
  Parent,
  Announcement,
  UserProfile,
} from '../../src/types';
import {
  School as SchoolIcon,
  GraduationCap,
  Users,
  BookOpen,
  Calendar,
  Megaphone,
  Plus,
  Trash2,
  Copy,
  Check,
  Search,
  Settings,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Activity,
} from 'lucide-react';

interface SchoolAdminDashboardProps {
  user: UserProfile;
  school: School;
  classes: Classroom[];
  teachers: Teacher[];
  students: Student[];
  parents: Parent[];
  announcements: Announcement[];
  onCreateClass: (data: { name: string; grade: string; div: string; teachers: string[]; subjects: Record<string, string> }) => Promise<void>;
  onDeleteClass: (classId: string) => Promise<void>;
  onCreateTeacher: (data: { name: string; email: string; subjects: string[]; classIds: string[] }) => Promise<void>;
  onDeleteTeacher: (teacherId: string, email: string) => Promise<void>;
  onCreateStudent: (data: { name: string; email?: string; admissionNo?: string; grade: string; classId: string; className?: string; parentEmail?: string }) => Promise<void>;
  onDeleteStudent: (studentId: string, classId: string) => Promise<void>;
  onCreateParent: (data: { name: string; email: string; phone?: string; children: string[] }) => Promise<void>;
  onCreateAnnouncement: (data: { title: string; content: string; targetType: 'all' | 'teachers' | 'students' | 'parents' | 'class'; targetClassId?: string }) => Promise<void>;
  onDeleteAnnouncement: (id: string) => Promise<void>;
  onUpdateSchool: (updates: Partial<School>) => Promise<void>;
  dbStatus?: { connected: boolean; latencyMs: number; error?: string };
  onTestConnection?: () => void;
}

export const SchoolAdminDashboard: React.FC<SchoolAdminDashboardProps> = ({
  user,
  school,
  classes,
  teachers,
  students,
  parents,
  announcements,
  onCreateClass,
  onDeleteClass,
  onCreateTeacher,
  onDeleteTeacher,
  onCreateStudent,
  onDeleteStudent,
  onCreateParent,
  onCreateAnnouncement,
  onDeleteAnnouncement,
  onUpdateSchool,
  dbStatus,
  onTestConnection,
}) => {
  const [activeTab, setActiveTab] = useState<'classes' | 'teachers' | 'students' | 'parents' | 'announcements' | 'settings'>('classes');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Status feedback
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals state
  const [showClassModal, setShowClassModal] = useState(false);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showParentModal, setShowParentModal] = useState(false);
  const [showAncModal, setShowAncModal] = useState(false);

  // Class Form
  const [classForm, setClassForm] = useState({
    name: '',
    grade: 'Grade 9',
    div: '9A',
    selectedTeachers: [] as string[],
    subjectMap: {} as Record<string, string>,
  });

  // Teacher Form
  const [teacherForm, setTeacherForm] = useState({
    name: '',
    email: '',
    subjects: ['Science'],
  });

  // Student Form
  const [studentForm, setStudentForm] = useState({
    name: '',
    email: '',
    admissionNo: '',
    grade: 'Grade 9',
    classId: '',
    parentEmail: '',
  });

  // Parent Form
  const [parentForm, setParentForm] = useState({
    name: '',
    email: '',
    phone: '',
    selectedChildren: [] as string[],
  });

  // Announcement Form
  const [ancForm, setAncForm] = useState({
    title: '',
    content: '',
    targetType: 'all' as 'all' | 'teachers' | 'students' | 'parents' | 'class',
    targetClassId: '',
  });

  // School Profile Form
  const [profileForm, setProfileForm] = useState({
    name: school?.name || '',
    principalName: school?.principalName || '',
    phone: school?.phone || '',
    email: school?.email || '',
    address: school?.address || '',
    district: school?.district || '',
    province: school?.province || '',
    academicYear: school?.academicYear || '2026',
    website: school?.website || '',
  });

  const availableSubjects = ['Science', 'Maths', 'English', 'Tamil', 'Sinhala', 'History', 'ICT', 'Commerce', 'Health'];

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const copyClassCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Submit: Class
  const handleClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!classForm.name.trim()) {
      setModalError('Please enter a classroom display name.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateClass({
        name: classForm.name.trim(),
        grade: classForm.grade,
        div: classForm.div.trim() || 'A',
        teachers: classForm.selectedTeachers,
        subjects: classForm.subjectMap,
      });
      setShowClassModal(false);
      setClassForm({
        name: '',
        grade: 'Grade 9',
        div: '9A',
        selectedTeachers: [],
        subjectMap: {},
      });
      showNotification('Classroom created successfully with join code!');
    } catch (err: any) {
      setModalError(err.message || 'Failed to create classroom. Please check connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit: Teacher
  const handleTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!teacherForm.name.trim()) {
      setModalError('Teacher name is required.');
      return;
    }
    if (!teacherForm.email.trim() || !teacherForm.email.includes('@')) {
      setModalError('Please enter a valid Google email address for the teacher.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateTeacher({
        name: teacherForm.name.trim(),
        email: teacherForm.email.toLowerCase().trim(),
        subjects: teacherForm.subjects,
        classIds: [],
      });
      setShowTeacherModal(false);
      setTeacherForm({
        name: '',
        email: '',
        subjects: ['Science'],
      });
      showNotification(`Teacher ${teacherForm.name} added to school roster!`);
    } catch (err: any) {
      setModalError(err.message || 'Failed to add teacher.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit: Student
  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!studentForm.name.trim()) {
      setModalError('Student full name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedClass = classes.find((c) => c.id === studentForm.classId);
      await onCreateStudent({
        name: studentForm.name.trim(),
        email: studentForm.email.trim() || undefined,
        admissionNo: studentForm.admissionNo.trim() || undefined,
        grade: selectedClass?.grade || studentForm.grade,
        classId: studentForm.classId,
        className: selectedClass?.name,
        parentEmail: studentForm.parentEmail.trim() || undefined,
      });
      setShowStudentModal(false);
      setStudentForm({
        name: '',
        email: '',
        admissionNo: '',
        grade: 'Grade 9',
        classId: classes[0]?.id || '',
        parentEmail: '',
      });
      showNotification(`Student ${studentForm.name} enrolled successfully!`);
    } catch (err: any) {
      setModalError(err.message || 'Failed to enroll student.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit: Parent
  const handleParentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!parentForm.name.trim() || !parentForm.email.trim()) {
      setModalError('Parent name and Google email are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateParent({
        name: parentForm.name.trim(),
        email: parentForm.email.toLowerCase().trim(),
        phone: parentForm.phone.trim() || undefined,
        children: parentForm.selectedChildren,
      });
      setShowParentModal(false);
      setParentForm({
        name: '',
        email: '',
        phone: '',
        selectedChildren: [],
      });
      showNotification(`Parent ${parentForm.name} linked successfully!`);
    } catch (err: any) {
      setModalError(err.message || 'Failed to link parent account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit: Announcement
  const handleAncSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!ancForm.title.trim() || !ancForm.content.trim()) {
      setModalError('Announcement title and content are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateAnnouncement({
        title: ancForm.title.trim(),
        content: ancForm.content.trim(),
        targetType: ancForm.targetType,
        targetClassId: ancForm.targetClassId || undefined,
      });
      setShowAncModal(false);
      setAncForm({
        title: '',
        content: '',
        targetType: 'all',
        targetClassId: '',
      });
      showNotification('Announcement published to school members!');
    } catch (err: any) {
      setModalError(err.message || 'Failed to post announcement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Global Notification Banner */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold animate-in fade-in slide-in-from-top-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/15 border-red-500/30 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* School Header Banner & Live Connection Info */}
      <div className="p-6 rounded-2xl bg-[#121726] border border-white/10 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-xl shrink-0">
            {school?.name?.charAt(0).toUpperCase() || 'S'}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-white font-['Plus_Jakarta_Sans']">
                {school?.name || 'School Administration'}
              </h1>
              {dbStatus && (
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                    dbStatus.connected
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-red-500/15 text-red-300 border-red-500/30'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      dbStatus.connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                    }`}
                  />
                  {dbStatus.connected ? `Firestore Online (${dbStatus.latencyMs}ms)` : 'Database Offline'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Principal: {school?.principalName || 'Not Set'} · {school?.district || 'Sri Lanka'} · Academic Year:{' '}
              {school?.academicYear || '2026'}
            </p>
          </div>
        </div>

        {/* Live Counters & Diagnostics */}
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-center">
            <div className="text-base font-bold text-white">{classes.length}</div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Classes</div>
          </div>
          <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-center">
            <div className="text-base font-bold text-emerald-400">{teachers.length}</div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Teachers</div>
          </div>
          <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-center">
            <div className="text-base font-bold text-amber-400">{students.length}</div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Students</div>
          </div>

          {onTestConnection && (
            <button
              onClick={onTestConnection}
              title="Ping Cloud Firestore database connection"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 text-xs flex items-center gap-1.5 font-medium"
            >
              <Activity className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden lg:inline">Ping DB</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/10 scrollbar-none">
        <button
          onClick={() => setActiveTab('classes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'classes'
              ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4" /> Classrooms ({classes.length})
        </button>
        <button
          onClick={() => setActiveTab('teachers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'teachers'
              ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <GraduationCap className="w-4 h-4" /> Teachers ({teachers.length})
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'students'
              ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" /> Students ({students.length})
        </button>
        <button
          onClick={() => setActiveTab('parents')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'parents'
              ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" /> Parents ({parents.length})
        </button>
        <button
          onClick={() => setActiveTab('announcements')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'announcements'
              ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Megaphone className="w-4 h-4" /> Announcements ({announcements.length})
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'settings'
              ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" /> School Profile
        </button>
      </div>

      {/* Tab: Classrooms */}
      {activeTab === 'classes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Active Classrooms &amp; Join Codes</h2>
            <button
              onClick={() => {
                setModalError(null);
                setShowClassModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-600/25 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Classroom
            </button>
          </div>

          {classes.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#101420] border border-white/5 space-y-3">
              <BookOpen className="w-8 h-8 text-slate-500 mx-auto" />
              <h3 className="text-sm font-semibold text-white">No classrooms have been added yet.</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Click &quot;Add Classroom&quot; above to create cohorts like Grade 9A. A 6-letter join code will be generated for student self-enrollment.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map((cls) => {
                const enrolledCount = students.filter((s) => s.classId === cls.id).length;
                return (
                  <div
                    key={cls.id}
                    className="p-5 rounded-2xl bg-[#111624] border border-white/5 hover:border-white/10 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/25">
                            {cls.grade}
                          </span>
                          <h3 className="text-base font-bold text-white mt-1.5">{cls.name}</h3>
                          <div className="text-xs text-slate-400">Section {cls.div}</div>
                        </div>

                        {/* Join Code Box */}
                        <button
                          onClick={() => copyClassCode(cls.code)}
                          title="Click to copy join code"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-950/60 hover:bg-blue-900/60 border border-blue-500/30 text-blue-300 font-mono text-xs font-bold transition-all"
                        >
                          <span>{cls.code}</span>
                          {copiedCode === cls.code ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-blue-400" />
                          )}
                        </button>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/5 space-y-1.5 text-xs text-slate-300">
                        <div>
                          <span className="text-slate-500">Enrolled Students:</span>{' '}
                          <b className="text-white">{enrolledCount}</b>
                        </div>
                        <div>
                          <span className="text-slate-500">Assigned Teachers:</span>{' '}
                          <span className="text-slate-300">
                            {cls.teachers?.length
                              ? cls.teachers
                                  .map((tid) => teachers.find((t) => t.id === tid)?.name || 'Teacher')
                                  .join(', ')
                              : 'None assigned yet'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">Created {new Date(cls.createdAt).toLocaleDateString()}</span>
                      <button
                        onClick={async () => {
                          if (confirm(`Delete class "${cls.name}"?`)) {
                            await onDeleteClass(cls.id);
                            showNotification(`Class ${cls.name} deleted.`);
                          }
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/15 text-slate-400 hover:text-red-400 transition-colors"
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

      {/* Tab: Teachers */}
      {activeTab === 'teachers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Registered School Teachers</h2>
            <button
              onClick={() => {
                setModalError(null);
                setShowTeacherModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-600/25 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Teacher
            </button>
          </div>

          {teachers.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#101420] border border-white/5 space-y-3">
              <GraduationCap className="w-8 h-8 text-slate-500 mx-auto" />
              <h3 className="text-sm font-semibold text-white">No teachers have been added yet.</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Invite teachers with their Google account email so they can manage attendance and publish assignments.
              </p>
            </div>
          ) : (
            <div className="bg-[#111624] border border-white/5 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-white/[0.02] border-b border-white/5 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                  <tr>
                    <th className="p-3.5 pl-5">Teacher Name</th>
                    <th className="p-3.5">Google Email</th>
                    <th className="p-3.5">Subjects</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 pr-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {teachers.map((tc) => (
                    <tr key={tc.id} className="hover:bg-white/[0.02]">
                      <td className="p-3.5 pl-5 font-semibold text-white">{tc.name}</td>
                      <td className="p-3.5 font-mono text-[11px] text-blue-300">{tc.email}</td>
                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1">
                          {tc.subjects?.map((s) => (
                            <span key={s} className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 text-[10px] font-medium border border-emerald-500/20">
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 text-[10px] font-bold">
                          Active
                        </span>
                      </td>
                      <td className="p-3.5 pr-5 text-right">
                        <button
                          onClick={async () => {
                            if (confirm(`Remove teacher "${tc.name}"?`)) {
                              await onDeleteTeacher(tc.id, tc.email);
                              showNotification(`Teacher ${tc.name} removed.`);
                            }
                          }}
                          className="p-1.5 rounded bg-white/5 hover:bg-red-500/15 text-slate-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Students */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Enrolled Students Roster</h2>
            <button
              onClick={() => {
                setModalError(null);
                setStudentForm({
                  name: '',
                  email: '',
                  admissionNo: '',
                  grade: classes[0]?.grade || 'Grade 9',
                  classId: classes[0]?.id || '',
                  parentEmail: '',
                });
                setShowStudentModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-600/25 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Student
            </button>
          </div>

          {students.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#101420] border border-white/5 space-y-3">
              <Users className="w-8 h-8 text-slate-500 mx-auto" />
              <h3 className="text-sm font-semibold text-white">No students have been added yet.</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Add students directly with the button above or share your 6-letter class code with students.
              </p>
            </div>
          ) : (
            <div className="bg-[#111624] border border-white/5 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-white/[0.02] border-b border-white/5 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                  <tr>
                    <th className="p-3.5 pl-5">Student Name</th>
                    <th className="p-3.5">Admission No</th>
                    <th className="p-3.5">Classroom Cohort</th>
                    <th className="p-3.5">Parent Email</th>
                    <th className="p-3.5 pr-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {students.map((st) => (
                    <tr key={st.id} className="hover:bg-white/[0.02]">
                      <td className="p-3.5 pl-5 font-semibold text-white">{st.name}</td>
                      <td className="p-3.5 font-mono text-[11px]">{st.admissionNo || '—'}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px] font-semibold">
                          {st.className || st.grade}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-400 font-mono text-[11px]">{st.parentEmail || '—'}</td>
                      <td className="p-3.5 pr-5 text-right">
                        <button
                          onClick={async () => {
                            if (confirm(`Remove student "${st.name}"?`)) {
                              await onDeleteStudent(st.id, st.classId);
                              showNotification(`Student ${st.name} removed.`);
                            }
                          }}
                          className="p-1.5 rounded bg-white/5 hover:bg-red-500/15 text-slate-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Parents */}
      {activeTab === 'parents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Registered Parent Accounts</h2>
            <button
              onClick={() => {
                setModalError(null);
                setShowParentModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-600/25 transition-all"
            >
              <Plus className="w-4 h-4" /> Link Parent
            </button>
          </div>

          {parents.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#101420] border border-white/5 space-y-3">
              <Users className="w-8 h-8 text-slate-500 mx-auto" />
              <h3 className="text-sm font-semibold text-white">No parents have been linked yet.</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Link parent accounts to student records so parents can monitor attendance and homework results.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {parents.map((par) => (
                <div key={par.id} className="p-4 rounded-2xl bg-[#111624] border border-white/5 space-y-2">
                  <h3 className="text-sm font-bold text-white">{par.name}</h3>
                  <div className="text-xs text-slate-400 font-mono">{par.email}</div>
                  {par.phone && <div className="text-xs text-slate-400">Phone: {par.phone}</div>}
                  <div className="text-xs text-slate-500 pt-2 border-t border-white/5">
                    Linked Children: <b className="text-white">{par.children?.length || 0} student(s)</b>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Announcements */}
      {activeTab === 'announcements' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">School Notices &amp; Circulars</h2>
            <button
              onClick={() => {
                setModalError(null);
                setShowAncModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-600/25 transition-all"
            >
              <Plus className="w-4 h-4" /> Post Notice
            </button>
          </div>

          {announcements.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#101420] border border-white/5 space-y-3">
              <Megaphone className="w-8 h-8 text-slate-500 mx-auto" />
              <h3 className="text-sm font-semibold text-white">No announcements have been published yet.</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Publish notices visible to teachers, students, parents, or specific cohorts.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map((anc) => (
                <div key={anc.id} className="p-5 rounded-2xl bg-[#111624] border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/25">
                      Target: {anc.targetType}
                    </span>
                    <span className="text-[11px] text-slate-500">{new Date(anc.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h3 className="text-base font-bold text-white">{anc.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{anc.content}</p>
                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] text-slate-400">
                    <span>By: {anc.authorName}</span>
                    <button
                      onClick={async () => {
                        await onDeleteAnnouncement(anc.id);
                        showNotification('Notice deleted.');
                      }}
                      className="text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Settings / School Profile */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl bg-[#111624] border border-white/5 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white">School Profile &amp; Institution Records</h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await onUpdateSchool(profileForm);
                showNotification('School profile updated successfully!');
              } catch (err: any) {
                showNotification(err.message || 'Failed to update profile.', 'error');
              }
            }}
            className="space-y-3.5"
          >
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">School Name</label>
              <input
                type="text"
                required
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                className="w-full bg-[#171d2e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Principal Name</label>
                <input
                  type="text"
                  value={profileForm.principalName}
                  onChange={(e) => setProfileForm({ ...profileForm, principalName: e.target.value })}
                  className="w-full bg-[#171d2e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Academic Year</label>
                <input
                  type="text"
                  value={profileForm.academicYear}
                  onChange={(e) => setProfileForm({ ...profileForm, academicYear: e.target.value })}
                  className="w-full bg-[#171d2e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Official Phone</label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="w-full bg-[#171d2e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Official Email</label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  className="w-full bg-[#171d2e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Address</label>
              <input
                type="text"
                value={profileForm.address}
                onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                className="w-full bg-[#171d2e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30"
            >
              Save Profile Changes
            </button>
          </form>
        </div>
      )}

      {/* Modal: Add Class */}
      {showClassModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#151a28] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-white font-['Plus_Jakarta_Sans']">Create New Classroom</h3>

            {modalError && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {modalError}
              </div>
            )}

            <form onSubmit={handleClassSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Class Display Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grade 9A — Mathematics &amp; Science"
                  value={classForm.name}
                  onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                  className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Grade</label>
                  <select
                    value={classForm.grade}
                    onChange={(e) => setClassForm({ ...classForm, grade: e.target.value })}
                    className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    {['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11'].map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Division / Section</label>
                  <input
                    type="text"
                    placeholder="9A"
                    value={classForm.div}
                    onChange={(e) => setClassForm({ ...classForm, div: e.target.value })}
                    className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {teachers.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Assign Teachers (Optional)</label>
                  <div className="max-h-28 overflow-y-auto space-y-1 bg-[#121724] p-2 rounded-xl border border-white/5">
                    {teachers.map((tc) => {
                      const isChecked = classForm.selectedTeachers.includes(tc.id);
                      return (
                        <label key={tc.id} className="flex items-center gap-2 text-xs text-slate-300 p-1 hover:bg-white/5 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              setClassForm({
                                ...classForm,
                                selectedTeachers: e.target.checked
                                  ? [...classForm.selectedTeachers, tc.id]
                                  : classForm.selectedTeachers.filter((id) => id !== tc.id),
                              });
                            }}
                          />
                          <span>{tc.name} ({tc.subjects?.join(', ') || 'Teacher'})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowClassModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating Classroom…' : 'Create Classroom'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Teacher */}
      {showTeacherModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#151a28] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-white font-['Plus_Jakarta_Sans']">Add Teacher</h3>

            {modalError && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {modalError}
              </div>
            )}

            <form onSubmit={handleTeacherSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Teacher Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ms. Dilrukshi Perera"
                  value={teacherForm.name}
                  onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                  className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Google Email *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. dilrukshi@gmail.com"
                  value={teacherForm.email}
                  onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                  className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Assigned Subjects</label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {availableSubjects.map((sub) => {
                    const isSelected = teacherForm.subjects.includes(sub);
                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => {
                          setTeacherForm({
                            ...teacherForm,
                            subjects: isSelected
                              ? teacherForm.subjects.filter((s) => s !== sub)
                              : [...teacherForm.subjects, sub],
                          });
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                            : 'bg-white/5 border-white/10 text-slate-400'
                        }`}
                      >
                        {sub}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowTeacherModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 disabled:opacity-50"
                >
                  {isSubmitting ? 'Adding Teacher…' : 'Add Teacher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Student */}
      {showStudentModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#151a28] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-white font-['Plus_Jakarta_Sans']">Enroll Student</h3>

            {modalError && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {modalError}
              </div>
            )}

            <form onSubmit={handleStudentSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Student Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kasun Perera"
                  value={studentForm.name}
                  onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                  className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Admission No</label>
                  <input
                    type="text"
                    placeholder="MC-2026-081"
                    value={studentForm.admissionNo}
                    onChange={(e) => setStudentForm({ ...studentForm, admissionNo: e.target.value })}
                    className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Assign Classroom</label>
                  <select
                    value={studentForm.classId}
                    onChange={(e) => setStudentForm({ ...studentForm, classId: e.target.value })}
                    className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="">General (No Class)</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.grade})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Parent Google Email (Optional)</label>
                <input
                  type="email"
                  placeholder="parent@gmail.com"
                  value={studentForm.parentEmail}
                  onChange={(e) => setStudentForm({ ...studentForm, parentEmail: e.target.value })}
                  className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowStudentModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 disabled:opacity-50"
                >
                  {isSubmitting ? 'Enrolling…' : 'Enroll Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Parent */}
      {showParentModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#151a28] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-white font-['Plus_Jakarta_Sans']">Link Parent Account</h3>

            {modalError && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {modalError}
              </div>
            )}

            <form onSubmit={handleParentSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Parent Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mr. Sunil Perera"
                  value={parentForm.name}
                  onChange={(e) => setParentForm({ ...parentForm, name: e.target.value })}
                  className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Google Email *</label>
                <input
                  type="email"
                  required
                  placeholder="parent.perera@gmail.com"
                  value={parentForm.email}
                  onChange={(e) => setParentForm({ ...parentForm, email: e.target.value })}
                  className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Contact Phone (Optional)</label>
                <input
                  type="tel"
                  placeholder="077 123 4567"
                  value={parentForm.phone}
                  onChange={(e) => setParentForm({ ...parentForm, phone: e.target.value })}
                  className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Select Children</label>
                {students.length === 0 ? (
                  <div className="text-xs text-slate-400 italic p-2 bg-[#121724] rounded-xl border border-white/5">
                    No students have been added to the school yet.
                  </div>
                ) : (
                  <div className="max-h-36 overflow-y-auto space-y-1 bg-[#121724] p-2 rounded-xl border border-white/5">
                    {students.map((st) => {
                      const isChecked = parentForm.selectedChildren.includes(st.id);
                      return (
                        <label key={st.id} className="flex items-center gap-2 text-xs text-slate-300 p-1 hover:bg-white/5 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              setParentForm({
                                ...parentForm,
                                selectedChildren: e.target.checked
                                  ? [...parentForm.selectedChildren, st.id]
                                  : parentForm.selectedChildren.filter((id) => id !== st.id),
                              });
                            }}
                          />
                          <span>{st.name} ({st.className || st.grade})</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowParentModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 disabled:opacity-50"
                >
                  {isSubmitting ? 'Linking…' : 'Link Parent Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Announcement */}
      {showAncModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#151a28] border border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-white font-['Plus_Jakarta_Sans']">Post School Notice</h3>

            {modalError && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {modalError}
              </div>
            )}

            <form onSubmit={handleAncSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Notice Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Term 2 Examination Timetable Release"
                  value={ancForm.title}
                  onChange={(e) => setAncForm({ ...ancForm, title: e.target.value })}
                  className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Target Audience</label>
                <select
                  value={ancForm.targetType}
                  onChange={(e) => setAncForm({ ...ancForm, targetType: e.target.value as any })}
                  className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="all">Entire School (All Users)</option>
                  <option value="teachers">Teachers Only</option>
                  <option value="students">Students Only</option>
                  <option value="parents">Parents Only</option>
                  <option value="class">Specific Class</option>
                </select>
              </div>
              {ancForm.targetType === 'class' && (
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Choose Class</label>
                  <select
                    value={ancForm.targetClassId}
                    onChange={(e) => setAncForm({ ...ancForm, targetClassId: e.target.value })}
                    className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="">Select a class</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Notice Content *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Write notice details here…"
                  value={ancForm.content}
                  onChange={(e) => setAncForm({ ...ancForm, content: e.target.value })}
                  className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowAncModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 disabled:opacity-50"
                >
                  {isSubmitting ? 'Publishing…' : 'Publish Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
