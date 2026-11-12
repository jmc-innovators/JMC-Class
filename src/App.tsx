import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import {
  auth,
  signInWithGoogle,
  signInWithEmail,
  signInAsRole,
  logOut,
  bootstrapUserProfile,
} from './lib/firebase';
import {
  UserProfile,
  UserRole,
  School,
  Classroom,
  Teacher,
  Student,
  Parent,
  Assignment,
  Submission,
  AttendanceSession,
  ResultAssessment,
  Announcement,
  AuditLog,
} from './types';
import * as firestoreService from './lib/firestoreService';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { OperatorDashboard } from './components/OperatorDashboard';
import { SchoolAdminDashboard } from './components/SchoolAdminDashboard';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentDashboard } from './components/StudentDashboard';
import { ParentDashboard } from './components/ParentDashboard';
import { GeminiChatWidget } from './components/GeminiChatWidget';

export default function App() {
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Firestore Data State
  const [schools, setSchools] = useState<School[]>([]);
  const [currentSchool, setCurrentSchool] = useState<School | null>(null);
  const [classes, setClasses] = useState<Classroom[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>([]);
  const [results, setResults] = useState<ResultAssessment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Load school scoped data
  const loadSchoolData = useCallback(async (schoolId: string) => {
    try {
      const [
        loadedClasses,
        loadedTeachers,
        loadedStudents,
        loadedParents,
        loadedAssignments,
        loadedSubmissions,
        loadedAttendance,
        loadedResults,
        loadedAnnouncements,
        loadedAudit,
      ] = await Promise.all([
        firestoreService.fetchClasses(schoolId).catch(() => []),
        firestoreService.fetchTeachers(schoolId).catch(() => []),
        firestoreService.fetchStudents(schoolId).catch(() => []),
        firestoreService.fetchParents(schoolId).catch(() => []),
        firestoreService.fetchAssignments(schoolId).catch(() => []),
        firestoreService.fetchSubmissions(schoolId).catch(() => []),
        firestoreService.fetchAttendance(schoolId).catch(() => []),
        firestoreService.fetchResults(schoolId).catch(() => []),
        firestoreService.fetchAnnouncements(schoolId).catch(() => []),
        firestoreService.fetchAuditLogs(schoolId).catch(() => []),
      ]);

      setClasses(loadedClasses || []);
      setTeachers(loadedTeachers || []);
      setStudents(loadedStudents || []);
      setParents(loadedParents || []);
      setAssignments(loadedAssignments || []);
      setSubmissions(loadedSubmissions || []);
      setAttendanceSessions(loadedAttendance || []);
      setResults(loadedResults || []);
      setAnnouncements(loadedAnnouncements || []);
      setAuditLogs(loadedAudit || []);
    } catch (err) {
      console.warn('Error loading school data:', err);
    }
  }, []);

  // Refresh all state
  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      const allSchools = await firestoreService.fetchSchools().catch(() => []);
      setSchools(allSchools || []);

      if (currentSchool) {
        await loadSchoolData(currentSchool.id);
      } else if (allSchools && allSchools.length > 0) {
        // Default to first school if none selected
        const target = userProfile?.schoolId
          ? allSchools.find((s) => s.id === userProfile.schoolId) || allSchools[0]
          : allSchools[0];
        setCurrentSchool(target);
        await loadSchoolData(target.id);
      }
    } finally {
      setRefreshing(false);
    }
  }, [currentSchool, loadSchoolData, userProfile?.schoolId]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFbUser(user);
      if (user) {
        try {
          const profile = await bootstrapUserProfile(user);
          setUserProfile(profile);

          const allSchools = await firestoreService.fetchSchools().catch(() => []);
          setSchools(allSchools || []);

          if (profile.schoolId) {
            const found = allSchools.find((s) => s.id === profile.schoolId);
            if (found) {
              setCurrentSchool(found);
              await loadSchoolData(found.id);
            } else if (allSchools.length > 0) {
              setCurrentSchool(allSchools[0]);
              await loadSchoolData(allSchools[0].id);
            }
          } else if (allSchools.length > 0) {
            setCurrentSchool(allSchools[0]);
            await loadSchoolData(allSchools[0].id);
          }
        } catch (err: any) {
          console.error('Session bootstrap failed:', err);
          setErrorMessage(err.message || 'Failed to initialize session profile.');
        }
      } else {
        setUserProfile(null);
        setCurrentSchool(null);
        setClasses([]);
        setTeachers([]);
        setStudents([]);
        setAssignments([]);
        setSubmissions([]);
        setAttendanceSessions([]);
        setResults([]);
        setAnnouncements([]);
        setAuditLogs([]);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [loadSchoolData]);

  // Handlers
  const handleGoogleSignIn = async (preferredRole?: UserRole) => {
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const { user, profile } = await signInWithGoogle();
      // If user is brand new and selected a preferred role
      if (profile.role === 'student' && preferredRole && preferredRole !== 'student' && preferredRole !== 'operator') {
        profile.role = preferredRole;
        setUserProfile(profile);
      }
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setErrorMessage(err.message || 'Could not complete Google Sign-in.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSignInWithRole = async (role: UserRole) => {
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const { profile } = await signInAsRole(role);
      setUserProfile(profile);
      if (schools.length > 0 && !currentSchool) {
        setCurrentSchool(schools[0]);
        await loadSchoolData(schools[0].id);
      }
    } catch (err: any) {
      console.error('Role sign-in error:', err);
      // Fallback local session if auth restricted
      const fallbackProfile: UserProfile = {
        uid: 'user_' + role + '_' + Date.now().toString(36),
        displayName: role === 'school' ? 'School Administrator' : role.charAt(0).toUpperCase() + role.slice(1) + ' User',
        email: `${role}@jmc.school`,
        role,
        schoolId: schools[0]?.id || 'id_mtz4zcm9_xs77h8e',
        status: 'active',
      };
      setUserProfile(fallbackProfile);
      if (schools.length > 0 && !currentSchool) {
        setCurrentSchool(schools[0]);
        await loadSchoolData(schools[0].id);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleSignInWithEmail = async (email: string, pass: string, preferredRole?: UserRole) => {
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const { profile } = await signInWithEmail(email, pass, preferredRole);
      setUserProfile(profile);
      if (schools.length > 0 && !currentSchool) {
        setCurrentSchool(schools[0]);
        await loadSchoolData(schools[0].id);
      }
    } catch (err: any) {
      console.error('Email sign-in error:', err);
      setErrorMessage(err.message || 'Email authentication failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSignOut = async () => {
    await logOut();
    setUserProfile(null);
    setFbUser(null);
  };

  const handleJoinByCode = async (code: string, name: string) => {
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const result = await firestoreService.joinClassByCode(
        code,
        name,
        userProfile?.uid || fbUser?.uid || '',
        userProfile?.email || fbUser?.email || undefined
      );

      // Refresh data
      const allSchools = await firestoreService.fetchSchools().catch(() => []);
      setSchools(allSchools || []);
      const targetSchool = allSchools.find((s) => s.id === result.schoolId) || allSchools[0];
      if (targetSchool) {
        setCurrentSchool(targetSchool);
        await loadSchoolData(targetSchool.id);
      }

      alert(`Successfully enrolled in ${result.classroom.name} at ${result.schoolId}!`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not join classroom.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestSchoolRegistration = async (data: {
    name: string;
    adminEmail: string;
    principalName: string;
    district: string;
    phone: string;
  }) => {
    setActionLoading(true);
    try {
      const newSchool = await firestoreService.createSchool(
        {
          name: data.name,
          adminEmail: data.adminEmail,
          principalName: data.principalName,
          district: data.district,
          phone: data.phone,
          schoolType: 'School',
          academicYear: '2026',
        },
        userProfile?.uid || 'guest',
        userProfile?.displayName || 'Guest'
      );
      setSchools((prev) => [...prev, newSchool]);
      setCurrentSchool(newSchool);
      await loadSchoolData(newSchool.id);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to register school.');
    } finally {
      setActionLoading(false);
    }
  };

  // Operator Actions
  const handleCreateSchoolByOperator = async (formData: any) => {
    if (!userProfile) return;
    const newSchool = await firestoreService.createSchool(
      formData,
      userProfile.uid,
      userProfile.displayName || userProfile.email
    );
    setSchools((prev) => [...prev, newSchool]);
    setCurrentSchool(newSchool);
    await loadSchoolData(newSchool.id);
  };

  const handleDeleteSchoolByOperator = async (schoolId: string) => {
    if (!userProfile) return;
    await firestoreService.deleteSchool(schoolId, userProfile.uid, userProfile.displayName);
    setSchools((prev) => prev.filter((s) => s.id !== schoolId));
    if (currentSchool?.id === schoolId) {
      setCurrentSchool(schools.find((s) => s.id !== schoolId) || null);
    }
  };

  // School Admin Actions
  const handleCreateClass = async (data: any) => {
    const schoolToUse = currentSchool || schools[0] || { id: 'id_mtz4zcm9_xs77h8e', name: 'J/Mahajana college' };
    const actorUid = userProfile?.uid || 'admin_user';
    const actorName = userProfile?.displayName || 'Administrator';
    const newClass = await firestoreService.createClassroom(
      schoolToUse.id,
      data,
      actorUid,
      actorName
    );
    setClasses((prev) => {
      const exists = prev.some((c) => c.id === newClass.id);
      return exists ? prev.map((c) => (c.id === newClass.id ? newClass : c)) : [...prev, newClass];
    });
    if (!currentSchool) {
      const found = schools.find((s) => s.id === schoolToUse.id) || (schoolToUse as School);
      setCurrentSchool(found);
    }
  };

  const handleDeleteClass = async (classId: string) => {
    const schoolId = currentSchool?.id || schools[0]?.id || 'id_mtz4zcm9_xs77h8e';
    const actorUid = userProfile?.uid || 'admin_user';
    const actorName = userProfile?.displayName || 'Administrator';
    await firestoreService.deleteClassroom(schoolId, classId, actorUid, actorName);
    setClasses((prev) => prev.filter((c) => c.id !== classId));
  };

  const handleCreateTeacher = async (data: any) => {
    const schoolToUse = currentSchool || schools[0] || { id: 'id_mtz4zcm9_xs77h8e', name: 'J/Mahajana college' };
    const actorUid = userProfile?.uid || 'admin_user';
    const actorName = userProfile?.displayName || 'Administrator';
    const newTeacher = await firestoreService.createTeacher(
      schoolToUse.id,
      data,
      actorUid,
      actorName
    );
    setTeachers((prev) => {
      const exists = prev.some((t) => t.id === newTeacher.id);
      return exists ? prev.map((t) => (t.id === newTeacher.id ? newTeacher : t)) : [...prev, newTeacher];
    });
  };

  const handleDeleteTeacher = async (teacherId: string, email: string) => {
    const schoolId = currentSchool?.id || schools[0]?.id || 'id_mtz4zcm9_xs77h8e';
    const actorUid = userProfile?.uid || 'admin_user';
    const actorName = userProfile?.displayName || 'Administrator';
    await firestoreService.deleteTeacher(schoolId, teacherId, email, actorUid, actorName);
    setTeachers((prev) => prev.filter((t) => t.id !== teacherId));
  };

  const handleCreateStudent = async (data: any) => {
    const schoolToUse = currentSchool || schools[0] || { id: 'id_mtz4zcm9_xs77h8e', name: 'J/Mahajana college' };
    const actorUid = userProfile?.uid || 'admin_user';
    const actorName = userProfile?.displayName || 'Administrator';
    const newStudent = await firestoreService.createStudent(
      schoolToUse.id,
      data,
      actorUid,
      actorName
    );
    setStudents((prev) => {
      const exists = prev.some((s) => s.id === newStudent.id);
      return exists ? prev.map((s) => (s.id === newStudent.id ? newStudent : s)) : [...prev, newStudent];
    });
  };

  const handleDeleteStudent = async (studentId: string, classId: string) => {
    const schoolId = currentSchool?.id || schools[0]?.id || 'id_mtz4zcm9_xs77h8e';
    const actorUid = userProfile?.uid || 'admin_user';
    const actorName = userProfile?.displayName || 'Administrator';
    await firestoreService.deleteStudent(schoolId, studentId, classId, actorUid, actorName);
    setStudents((prev) => prev.filter((s) => s.id !== studentId));
  };

  const handleCreateParent = async (data: any) => {
    const schoolToUse = currentSchool || schools[0] || { id: 'id_mtz4zcm9_xs77h8e', name: 'J/Mahajana college' };
    const actorUid = userProfile?.uid || 'admin_user';
    const actorName = userProfile?.displayName || 'Administrator';
    const newParent = await firestoreService.createParent(
      schoolToUse.id,
      data,
      actorUid,
      actorName
    );
    setParents((prev) => {
      const exists = prev.some((p) => p.id === newParent.id);
      return exists ? prev.map((p) => (p.id === newParent.id ? newParent : p)) : [...prev, newParent];
    });
  };

  const handleCreateAnnouncement = async (data: any) => {
    if (!currentSchool || !userProfile) return;
    const newAnc = await firestoreService.createAnnouncement(
      currentSchool.id,
      {
        ...data,
        authorId: userProfile.uid,
        authorName: userProfile.displayName,
        authorRole: userProfile.role,
      },
      userProfile.uid,
      userProfile.displayName
    );
    setAnnouncements((prev) => [newAnc, ...prev]);
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!currentSchool || !userProfile) return;
    await firestoreService.deleteAnnouncement(currentSchool.id, id, userProfile.uid, userProfile.displayName);
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  };

  const handleUpdateSchool = async (updates: Partial<School>) => {
    if (!currentSchool || !userProfile) return;
    await firestoreService.updateSchoolProfile(
      currentSchool.id,
      updates,
      userProfile.uid,
      userProfile.displayName
    );
    setCurrentSchool((prev) => (prev ? { ...prev, ...updates } : null));
  };

  // Teacher Actions
  const handleCreateAssignment = async (data: any) => {
    if (!currentSchool || !userProfile) return;
    const newAsg = await firestoreService.createAssignment(
      currentSchool.id,
      data,
      userProfile.uid,
      userProfile.displayName
    );
    setAssignments((prev) => [newAsg, ...prev]);
  };

  const handleGradeSubmission = async (submissionId: string, marks: number, feedback: string) => {
    if (!currentSchool || !userProfile) return;
    await firestoreService.gradeStudentSubmission(
      currentSchool.id,
      submissionId,
      marks,
      feedback,
      userProfile.uid,
      userProfile.displayName
    );
    setSubmissions((prev) =>
      prev.map((s) => (s.id === submissionId ? { ...s, status: 'graded', marks, feedback } : s))
    );
  };

  const handleRecordAttendance = async (data: any) => {
    if (!currentSchool || !userProfile) return;
    const session = await firestoreService.saveAttendanceSession(
      currentSchool.id,
      {
        ...data,
        teacherId: userProfile.uid,
      },
      userProfile.uid,
      userProfile.displayName
    );
    setAttendanceSessions((prev) => [session, ...prev.filter((s) => s.id !== session.id)]);
  };

  const handleSaveAssessmentResult = async (data: any) => {
    if (!currentSchool || !userProfile) return;
    const res = await firestoreService.saveAssessmentResult(
      currentSchool.id,
      data,
      userProfile.uid,
      userProfile.displayName
    );
    setResults((prev) => [res, ...prev]);
  };

  // Student Actions
  const handleSubmitWork = async (data: any) => {
    if (!currentSchool) return;
    const sub = await firestoreService.submitStudentWork(currentSchool.id, data);
    setSubmissions((prev) => [sub, ...prev.filter((s) => s.id !== sub.id)]);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center mx-auto animate-pulse font-bold text-lg">
            JMC
          </div>
          <div className="text-xs text-slate-400 font-medium">Connecting to JMC Classroom Cloud Firestore…</div>
        </div>
      </div>
    );
  }

  // Not signed in: render Landing Page
  if (!userProfile) {
    return (
      <div className="relative">
        <LandingPage
          onSignInWithGoogle={handleGoogleSignIn}
          onSignInWithRole={handleSignInWithRole}
          onSignInWithEmail={handleSignInWithEmail}
          onJoinByCode={handleJoinByCode}
          onRequestSchoolRegistration={handleRequestSchoolRegistration}
          loading={actionLoading}
          error={errorMessage}
        />
        <GeminiChatWidget />
      </div>
    );
  }

  // Active school resolver: ensure always valid school
  const activeSchool = currentSchool || schools[0] || null;

  // Current Teacher record if user is a teacher
  const currentTeacher = teachers.find(
    (t) => t.userId === userProfile.uid || t.email.toLowerCase() === (userProfile.email || '').toLowerCase()
  ) || null;

  // Current Student record if user is a student
  const currentStudent = students.find(
    (s) => s.userId === userProfile.uid || s.email?.toLowerCase() === (userProfile.email || '').toLowerCase()
  ) || null;

  // Current Parent record if user is a parent
  const currentParent = parents.find(
    (p) => p.userId === userProfile.uid || p.email.toLowerCase() === (userProfile.email || '').toLowerCase()
  ) || null;

  return (
    <div className="min-h-screen bg-[#0b0f19] text-[#e6edf3] flex flex-col font-['DM_Sans'] relative">
      <Navbar
        user={userProfile}
        currentSchool={activeSchool}
        schools={schools}
        onSelectSchool={(sch) => {
          setCurrentSchool(sch);
          loadSchoolData(sch.id);
        }}
        onSignOut={handleSignOut}
        onRefresh={refreshAll}
        isRefreshing={refreshing}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {userProfile.role === 'operator' ? (
          <OperatorDashboard
            user={userProfile}
            schools={schools}
            currentSchool={activeSchool}
            onSelectSchool={(sch) => {
              setCurrentSchool(sch);
              loadSchoolData(sch.id);
            }}
            onCreateSchool={handleCreateSchoolByOperator}
            onDeleteSchool={handleDeleteSchoolByOperator}
            auditLogs={auditLogs}
            loading={actionLoading}
          />
        ) : !activeSchool ? (
          <div className="p-12 text-center rounded-2xl bg-[#101420] border border-white/5 space-y-3">
            <h3 className="text-base font-bold text-white">No active school found.</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              You are signed in as {userProfile.role}, but no registered school was selected. Please contact your administrator.
            </p>
          </div>
        ) : userProfile.role === 'school' || userProfile.role === 'supervisor' ? (
          <SchoolAdminDashboard
            user={userProfile}
            school={activeSchool}
            classes={classes}
            teachers={teachers}
            students={students}
            parents={parents}
            announcements={announcements}
            onCreateClass={handleCreateClass}
            onDeleteClass={handleDeleteClass}
            onCreateTeacher={handleCreateTeacher}
            onDeleteTeacher={handleDeleteTeacher}
            onCreateStudent={handleCreateStudent}
            onDeleteStudent={handleDeleteStudent}
            onCreateParent={handleCreateParent}
            onCreateAnnouncement={handleCreateAnnouncement}
            onDeleteAnnouncement={handleDeleteAnnouncement}
            onUpdateSchool={handleUpdateSchool}
          />
        ) : userProfile.role === 'teacher' ? (
          <TeacherDashboard
            user={userProfile}
            school={activeSchool}
            teacher={currentTeacher}
            classes={classes}
            students={students}
            assignments={assignments}
            submissions={submissions}
            attendanceSessions={attendanceSessions}
            results={results}
            announcements={announcements}
            onCreateAssignment={handleCreateAssignment}
            onGradeSubmission={handleGradeSubmission}
            onRecordAttendance={handleRecordAttendance}
            onSaveAssessmentResult={handleSaveAssessmentResult}
            onCreatePost={async ({ title, content, targetClassId }) => {
              await handleCreateAnnouncement({
                title,
                content,
                targetType: 'class',
                targetClassId,
              });
            }}
          />
        ) : userProfile.role === 'student' ? (
          <StudentDashboard
            user={userProfile}
            school={activeSchool}
            student={currentStudent}
            classes={classes}
            assignments={assignments}
            submissions={submissions}
            attendanceSessions={attendanceSessions}
            results={results}
            announcements={announcements}
            onSubmitWork={handleSubmitWork}
            onJoinClassByCode={async (code) => {
              await handleJoinByCode(code, userProfile.displayName || 'Student');
            }}
          />
        ) : userProfile.role === 'parent' ? (
          <ParentDashboard
            user={userProfile}
            school={activeSchool}
            parent={currentParent}
            students={students}
            assignments={assignments}
            submissions={submissions}
            attendanceSessions={attendanceSessions}
            results={results}
            announcements={announcements}
          />
        ) : null}
      </main>

      {/* Floating Gemini Chatbot Quick Access Widget on all views */}
      <GeminiChatWidget />
    </div>
  );
}
