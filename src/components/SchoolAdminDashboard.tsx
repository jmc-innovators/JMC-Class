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
  GraduationCap,
  Users,
  BookOpen,
  Megaphone,
  Plus,
  Trash2,
  Copy,
  Check,
  Settings,
  AlertCircle,
  CheckCircle2,
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

  // Inline delete confirm IDs (avoiding window.confirm in iFrames)
  const [confirmDeleteClassId, setConfirmDeleteClassId] = useState<string | null>(null);
  const [confirmDeleteTeacherId, setConfirmDeleteTeacherId] = useState<string | null>(null);
  const [confirmDeleteStudentId, setConfirmDeleteStudentId] = useState<string | null>(null);

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
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-slate-500 hover:text-slate-900">
            ✕
          </button>
        </div>
      )}

      {/* School Header Banner & Live Connection Info */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold text-xl shrink-0">
            {school?.name?.charAt(0).toUpperCase() || 'S'}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                {school?.name || 'School Administration'}
              </h1>
              {dbStatus && (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-semibold border tabular-nums ${
                    dbStatus.connected
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  {dbStatus.connected ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-rose-600" />
                  )}
                  {dbStatus.connected ? `Firestore Online (${dbStatus.latencyMs}ms)` : 'Database Offline'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Principal: {school?.principalName || 'Not Set'} · {school?.district || 'Sri Lanka'} · Academic Year:{' '}
              {school?.academicYear || '2026'}
            </p>
          </div>
        </div>

        {/* Live Counters & Diagnostics */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <div className="text-base font-bold text-slate-900 tabular-nums">{classes.length}</div>
            <div className="text-[10px] text-slate-600 uppercase font-semibold">Classes</div>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
            <div className="text-base font-bold text-emerald-700 tabular-nums">{teachers.length}</div>
            <div className="text-[10px] text-emerald-800 uppercase font-semibold">Teachers</div>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-center">
            <div className="text-base font-bold text-amber-700 tabular-nums">{students.length}</div>
            <div className="text-[10px] text-amber-800 uppercase font-semibold">Students</div>
          </div>

          {onTestConnection && (
            <button
              onClick={onTestConnection}
              title="Ping Cloud Firestore database connection"
              className="p-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs flex items-center gap-1.5 font-medium shadow-2xs"
            >
              <Activity className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden lg:inline">Ping DB</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2.5 border-b border-slate-200 scrollbar-none">
        <button
          onClick={() => setActiveTab('classes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all tabular-nums ${
            activeTab === 'classes'
              ? 'bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-4 h-4" /> Classrooms ({classes.length})
        </button>
        <button
          onClick={() => setActiveTab('teachers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all tabular-nums ${
            activeTab === 'teachers'
              ? 'bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <GraduationCap className="w-4 h-4" /> Teachers ({teachers.length})
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all tabular-nums ${
            activeTab === 'students'
              ? 'bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" /> Students ({students.length})
        </button>
        <button
          onClick={() => setActiveTab('parents')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all tabular-nums ${
            activeTab === 'parents'
              ? 'bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" /> Parents ({parents.length})
        </button>
        <button
          onClick={() => setActiveTab('announcements')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all tabular-nums ${
            activeTab === 'announcements'
              ? 'bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Megaphone className="w-4 h-4" /> Announcements ({announcements.length})
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'settings'
              ? 'bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Settings className="w-4 h-4" /> School Profile
        </button>
      </div>

      {/* Tab: Classrooms */}
      {activeTab === 'classes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-bold text-slate-900">Active Classrooms &amp; Join Codes</h2>
            <button
              onClick={() => {
                setModalError(null);
                setShowClassModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" /> Add Classroom
            </button>
          </div>

          {classes.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
              <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-sm font-semibold text-slate-900">No classrooms have been added yet.</h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
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
                    className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                            {cls.grade}
                          </span>
                          <h3 className="text-base font-bold text-slate-900 mt-1.5">{cls.name}</h3>
                          <div className="text-xs text-slate-500">Section {cls.div}</div>
                        </div>

                        {/* Join Code Box */}
                        <button
                          onClick={() => copyClassCode(cls.code)}
                          title="Click to copy join code"
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 font-mono text-xs font-bold transition-all shrink-0"
                        >
                          <span>{cls.code}</span>
                          {copiedCode === cls.code ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-blue-600" />
                          )}
                        </button>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-200 space-y-1.5 text-xs text-slate-600">
                        <div>
                          <span className="text-slate-500">Enrolled Students:</span>{' '}
                          <b className="text-slate-900 tabular-nums">{enrolledCount}</b>
                        </div>
                        <div>
                          <span className="text-slate-500">Assigned Teachers:</span>{' '}
                          <span className="text-slate-800 font-medium">
                            {cls.teachers?.length
                              ? cls.teachers
                                  .map((tid) => teachers.find((t) => t.id === tid)?.name || 'Teacher')
                                  .join(', ')
                              : 'None assigned yet'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-500 tabular-nums">
                        Created {new Date(cls.createdAt).toLocaleDateString()}
                      </span>
                      {confirmDeleteClassId === cls.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={async () => {
                              await onDeleteClass(cls.id);
                              setConfirmDeleteClassId(null);
                              showNotification(`Class ${cls.name} deleted.`);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteClassId(null)}
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteClassId(cls.id)}
                          className="p-1.5 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 transition-colors"
                          title="Delete class"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Tab: Teachers */}
      {activeTab === 'teachers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-bold text-slate-900">Registered School Teachers</h2>
            <button
              onClick={() => {
                setModalError(null);
                setShowTeacherModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" /> Add Teacher
            </button>
          </div>

          {teachers.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
              <GraduationCap className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-sm font-semibold text-slate-900">No teachers have been added yet.</h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                Invite teachers with their Google account email so they can manage attendance and publish assignments.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 shadow-xs rounded-2xl overflow-hidden overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-600 font-semibold">
                  <tr>
                    <th className="p-3.5 pl-5">Teacher Name</th>
                    <th className="p-3.5">Google Email</th>
                    <th className="p-3.5">Subjects</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 pr-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {teachers.map((tc) => (
                    <tr key={tc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5 pl-5 font-semibold text-slate-900">{tc.name}</td>
                      <td className="p-3.5 font-mono text-[11px] text-blue-700">{tc.email}</td>
                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1">
                          {tc.subjects?.map((s) => (
                            <span
                              key={s}
                              className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-medium border border-emerald-200"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                          Active
                        </span>
                      </td>
                      <td className="p-3.5 pr-5 text-right">
                        {confirmDeleteTeacherId === tc.id ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={async () => {
                                await onDeleteTeacher(tc.id, tc.email);
                                setConfirmDeleteTeacherId(null);
                                showNotification(`Teacher ${tc.name} removed.`);
                              }}
                              className="px-2 py-1 rounded bg-rose-600 text-white text-[11px] font-bold"
                            >
                              Remove
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteTeacherId(null)}
                              className="px-2 py-1 rounded bg-slate-100 text-slate-700 text-[11px]"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteTeacherId(tc.id)}
                            className="p-1.5 rounded bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 transition-colors"
                            title="Remove teacher"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
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
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-bold text-slate-900">Enrolled Students Roster</h2>
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
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" /> Add Student
            </button>
          </div>

          {students.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
              <Users className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-sm font-semibold text-slate-900">No students have been added yet.</h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                Add students directly with the button above or share your 6-letter class code with students.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 shadow-xs rounded-2xl overflow-hidden overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-600 font-semibold">
                  <tr>
                    <th className="p-3.5 pl-5">Student Name</th>
                    <th className="p-3.5">Admission No</th>
                    <th className="p-3.5">Classroom Cohort</th>
                    <th className="p-3.5">Parent Email</th>
                    <th className="p-3.5 pr-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {students.map((st) => (
                    <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5 pl-5 font-semibold text-slate-900">{st.name}</td>
                      <td className="p-3.5 font-mono text-[11px] tabular-nums">{st.admissionNo || '—'}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-semibold">
                          {st.className || st.grade}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-600 font-mono text-[11px]">{st.parentEmail || '—'}</td>
                      <td className="p-3.5 pr-5 text-right">
                        {confirmDeleteStudentId === st.id ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={async () => {
                                await onDeleteStudent(st.id, st.classId);
                                setConfirmDeleteStudentId(null);
                                showNotification(`Student ${st.name} removed.`);
                              }}
                              className="px-2 py-1 rounded bg-rose-600 text-white text-[11px] font-bold"
                            >
                              Remove
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteStudentId(null)}
                              className="px-2 py-1 rounded bg-slate-100 text-slate-700 text-[11px]"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteStudentId(st.id)}
                            className="p-1.5 rounded bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 transition-colors"
                            title="Remove student"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
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
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-bold text-slate-900">Registered Parent Accounts</h2>
            <button
              onClick={() => {
                setModalError(null);
                setShowParentModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" /> Link Parent
            </button>
          </div>

          {parents.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
              <Users className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-sm font-semibold text-slate-900">No parents have been linked yet.</h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                Link parent accounts to student records so parents can monitor attendance and homework results.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {parents.map((par) => (
                <div key={par.id} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
                  <h3 className="text-sm font-bold text-slate-900">{par.name}</h3>
                  <div className="text-xs text-blue-700 font-mono">{par.email}</div>
                  {par.phone && <div className="text-xs text-slate-600">Phone: {par.phone}</div>}
                  <div className="text-xs text-slate-600 pt-2 border-t border-slate-200 tabular-nums">
                    Linked Children: <b className="text-slate-900">{par.children?.length || 0} student(s)</b>
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
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-bold text-slate-900">School Notices &amp; Circulars</h2>
            <button
              onClick={() => {
                setModalError(null);
                setShowAncModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" /> Post Notice
            </button>
          </div>

          {announcements.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
              <Megaphone className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-sm font-semibold text-slate-900">No announcements have been published yet.</h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                Publish notices visible to teachers, students, parents, or specific cohorts.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map((anc) => (
                <div key={anc.id} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200">
                      Target: {anc.targetType}
                    </span>
                    <span className="text-[11px] text-slate-500 tabular-nums">
                      {new Date(anc.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{anc.title}</h3>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{anc.content}</p>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                    <span>By: {anc.authorName}</span>
                    <button
                      onClick={async () => {
                        await onDeleteAnnouncement(anc.id);
                        showNotification('Notice deleted.');
                      }}
                      className="text-rose-600 hover:text-rose-700 font-semibold"
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
        <div className="max-w-2xl bg-white border border-slate-200 shadow-xs rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900">School Profile &amp; Institution Records</h2>
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
              <label className="text-xs font-semibold text-slate-700 block mb-1">School Name</label>
              <input
                type="text"
                required
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Principal Name</label>
                <input
                  type="text"
                  value={profileForm.principalName}
                  onChange={(e) => setProfileForm({ ...profileForm, principalName: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Academic Year</label>
                <input
                  type="text"
                  value={profileForm.academicYear}
                  onChange={(e) => setProfileForm({ ...profileForm, academicYear: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 tabular-nums focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Official Phone</label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Official Email</label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Address</label>
              <input
                type="text"
                value={profileForm.address}
                onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm"
            >
              Save Profile Changes
            </button>
          </form>
        </div>
      )}

      {/* Modal: Add Class */}
      {showClassModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">Create New Classroom</h3>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" /> {modalError}
              </div>
            )}

            <form onSubmit={handleClassSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Class Display Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grade 9A — Mathematics & Science"
                  value={classForm.name}
                  onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Grade</label>
                  <select
                    value={classForm.grade}
                    onChange={(e) => setClassForm({ ...classForm, grade: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    {['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11'].map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Division / Section</label>
                  <input
                    type="text"
                    placeholder="9A"
                    value={classForm.div}
                    onChange={(e) => setClassForm({ ...classForm, div: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              {teachers.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Assign Teachers (Optional)</label>
                  <div className="max-h-28 overflow-y-auto space-y-1 bg-slate-50 p-2 rounded-xl border border-slate-200">
                    {teachers.map((tc) => {
                      const isChecked = classForm.selectedTeachers.includes(tc.id);
                      return (
                        <label
                          key={tc.id}
                          className="flex items-center gap-2 text-xs text-slate-700 p-1 hover:bg-white rounded cursor-pointer"
                        >
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

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowClassModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-sm disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">Add Teacher</h3>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" /> {modalError}
              </div>
            )}

            <form onSubmit={handleTeacherSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Teacher Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ms. Dilrukshi Perera"
                  value={teacherForm.name}
                  onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Google Email *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. dilrukshi@gmail.com"
                  value={teacherForm.email}
                  onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Assigned Subjects</label>
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
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {sub}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowTeacherModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-sm disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">Enroll Student</h3>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" /> {modalError}
              </div>
            )}

            <form onSubmit={handleStudentSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Student Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kasun Perera"
                  value={studentForm.name}
                  onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Admission No</label>
                  <input
                    type="text"
                    placeholder="MC-2026-081"
                    value={studentForm.admissionNo}
                    onChange={(e) => setStudentForm({ ...studentForm, admissionNo: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Assign Classroom</label>
                  <select
                    value={studentForm.classId}
                    onChange={(e) => setStudentForm({ ...studentForm, classId: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="">General (No Class)</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.grade})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Parent Google Email (Optional)</label>
                <input
                  type="email"
                  placeholder="parent@gmail.com"
                  value={studentForm.parentEmail}
                  onChange={(e) => setStudentForm({ ...studentForm, parentEmail: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowStudentModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-sm disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">Link Parent Account</h3>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" /> {modalError}
              </div>
            )}

            <form onSubmit={handleParentSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Parent Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mr. Sunil Perera"
                  value={parentForm.name}
                  onChange={(e) => setParentForm({ ...parentForm, name: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Google Email *</label>
                <input
                  type="email"
                  required
                  placeholder="parent.perera@gmail.com"
                  value={parentForm.email}
                  onChange={(e) => setParentForm({ ...parentForm, email: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Contact Phone (Optional)</label>
                <input
                  type="tel"
                  placeholder="077 123 4567"
                  value={parentForm.phone}
                  onChange={(e) => setParentForm({ ...parentForm, phone: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Select Children</label>
                {students.length === 0 ? (
                  <div className="text-xs text-slate-500 italic p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    No students have been added to the school yet.
                  </div>
                ) : (
                  <div className="max-h-36 overflow-y-auto space-y-1 bg-slate-50 p-2 rounded-xl border border-slate-200">
                    {students.map((st) => {
                      const isChecked = parentForm.selectedChildren.includes(st.id);
                      return (
                        <label
                          key={st.id}
                          className="flex items-center gap-2 text-xs text-slate-700 p-1 hover:bg-white rounded cursor-pointer"
                        >
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

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowParentModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-sm disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">Post School Notice</h3>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" /> {modalError}
              </div>
            )}

            <form onSubmit={handleAncSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Notice Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Term 2 Examination Timetable Release"
                  value={ancForm.title}
                  onChange={(e) => setAncForm({ ...ancForm, title: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Target Audience</label>
                <select
                  value={ancForm.targetType}
                  onChange={(e) => setAncForm({ ...ancForm, targetType: e.target.value as any })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
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
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Choose Class</label>
                  <select
                    value={ancForm.targetClassId}
                    onChange={(e) => setAncForm({ ...ancForm, targetClassId: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="">Select a class</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Notice Content *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Write notice details here…"
                  value={ancForm.content}
                  onChange={(e) => setAncForm({ ...ancForm, content: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAncModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-sm disabled:opacity-50"
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
