import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  School,
  Classroom,
  Teacher,
  Student,
  Parent,
  Assignment,
  Submission,
  AttendanceSession,
  AttendanceStatus,
  ResultAssessment,
  TimetableDay,
  Announcement,
  ChatMessage,
  AuditLog,
} from '../types';

export function generateId(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
}

export function generateClassCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// -------------------------------------------------------------
// Resilient Persistence Synchronization
// -------------------------------------------------------------
async function syncApiSave(schoolId: string, collectionName: string, item: any): Promise<void> {
  try {
    await fetch(`/api/data/${schoolId}/${collectionName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
  } catch (e) {
    console.warn(`Sync save failed for ${collectionName}:`, e);
  }
}

async function syncApiDelete(schoolId: string, collectionName: string, id: string): Promise<void> {
  try {
    await fetch(`/api/data/${schoolId}/${collectionName}/${id}`, {
      method: 'DELETE',
    });
  } catch (e) {
    console.warn(`Sync delete failed for ${collectionName}:`, e);
  }
}

async function syncApiGet<T>(schoolId: string, collectionName: string): Promise<T[]> {
  try {
    const res = await fetch(`/api/data/${schoolId}/${collectionName}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn(`Sync get failed for ${collectionName}:`, e);
  }
  return [];
}

// -------------------------------------------------------------
// AUDIT LOGGING
// -------------------------------------------------------------
export async function logAuditEvent(
  schoolId: string,
  actorUid: string,
  actorName: string,
  actorRole: string,
  action: string,
  targetType: string,
  targetId: string,
  metadata?: Record<string, any>
): Promise<void> {
  const logId = generateId('log');
  const entry: AuditLog = {
    id: logId,
    schoolId,
    actorUid,
    actorName,
    actorRole,
    action,
    targetType,
    targetId,
    timestamp: new Date().toISOString(),
    metadata,
  };
  await syncApiSave(schoolId, 'auditLogs', entry);
  try {
    const logRef = doc(db, 'schools', schoolId, 'auditLogs', logId);
    await setDoc(logRef, entry);
  } catch (err) {
    // Firestore rules might restrict subcollection
  }
}

export async function fetchAuditLogs(schoolId: string): Promise<AuditLog[]> {
  const list: AuditLog[] = [];
  try {
    const q = query(collection(db, 'schools', schoolId, 'auditLogs'));
    const snap = await getDocs(q);
    snap.forEach((d) => list.push({ ...(d.data() as AuditLog), id: d.id }));
  } catch {}
  const apiItems = await syncApiGet<AuditLog>(schoolId, 'auditLogs');
  const map = new Map<string, AuditLog>();
  apiItems.forEach((x) => map.set(x.id, x));
  list.forEach((x) => map.set(x.id, x));
  return Array.from(map.values()).sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
}

// -------------------------------------------------------------
// SCHOOLS
// -------------------------------------------------------------
export async function fetchSchools(): Promise<School[]> {
  const list: School[] = [];
  try {
    const snap = await getDocs(collection(db, 'schools'));
    snap.forEach((d) => list.push({ ...d.data(), id: d.id } as School));
  } catch (err) {
    console.warn('Firestore fetchSchools warning:', err);
  }

  try {
    const res = await fetch('/api/schools');
    if (res.ok) {
      const apiSchools: School[] = await res.json();
      const map = new Map<string, School>();
      apiSchools.forEach((s) => map.set(s.id, s));
      list.forEach((s) => map.set(s.id, s));
      return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    }
  } catch (err) {
    console.warn('API fetchSchools error:', err);
  }
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchSchoolById(schoolId: string): Promise<School | null> {
  try {
    const snap = await getDoc(doc(db, 'schools', schoolId));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as School;
    }
  } catch {}

  const all = await fetchSchools();
  return all.find((s) => s.id === schoolId) || null;
}

export async function createSchool(
  data: Omit<School, 'id' | 'createdAt' | 'status'>,
  actorUid: string,
  actorName: string
): Promise<School> {
  const schoolId = generateId('sch');
  const school: School = {
    ...data,
    id: schoolId,
    status: 'active',
    createdAt: new Date().toISOString(),
  };

  try {
    await fetch('/api/schools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(school),
    });
  } catch {}

  try {
    await setDoc(doc(db, 'schools', schoolId), school);
  } catch (err) {
    console.warn('Firestore createSchool notice:', err);
  }

  await logAuditEvent(
    schoolId,
    actorUid,
    actorName,
    'operator',
    'CREATE_SCHOOL',
    'School',
    schoolId,
    { name: school.name }
  );

  return school;
}

export async function updateSchoolProfile(
  schoolId: string,
  updates: Partial<School>,
  actorUid: string,
  actorName: string
): Promise<void> {
  try {
    await fetch('/api/schools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: schoolId, ...updates }),
    });
  } catch {}

  try {
    await updateDoc(doc(db, 'schools', schoolId), updates);
  } catch (err) {
    console.warn('Firestore updateSchoolProfile notice:', err);
  }

  await logAuditEvent(
    schoolId,
    actorUid,
    actorName,
    'school',
    'UPDATE_SCHOOL_PROFILE',
    'School',
    schoolId,
    updates
  );
}

export async function deleteSchool(
  schoolId: string,
  actorUid: string,
  actorName: string
): Promise<void> {
  try {
    await deleteDoc(doc(db, 'schools', schoolId));
  } catch {}
  await logAuditEvent(
    schoolId,
    actorUid,
    actorName,
    'operator',
    'DELETE_SCHOOL',
    'School',
    schoolId
  );
}

// -------------------------------------------------------------
// CLASSES & ENROLLMENT
// -------------------------------------------------------------
export async function fetchClasses(schoolId: string): Promise<Classroom[]> {
  const list: Classroom[] = [];
  try {
    const snap = await getDocs(collection(db, 'schools', schoolId, 'classes'));
    snap.forEach((d) => list.push({ ...d.data(), id: d.id } as Classroom));
  } catch {}
  const apiItems = await syncApiGet<Classroom>(schoolId, 'classes');
  const map = new Map<string, Classroom>();
  apiItems.forEach((c) => map.set(c.id, c));
  list.forEach((c) => map.set(c.id, c));
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function createClassroom(
  schoolId: string,
  data: { name: string; grade: string; div: string; teachers: string[]; subjects: Record<string, string> },
  actorUid: string,
  actorName: string
): Promise<Classroom> {
  const classId = generateId('cls');
  const classroom: Classroom = {
    id: classId,
    schoolId,
    name: data.name,
    grade: data.grade,
    div: data.div,
    code: generateClassCode(),
    teachers: data.teachers || [],
    subjects: data.subjects || {},
    createdAt: new Date().toISOString(),
  };

  // 1. Always persist to store
  await syncApiSave(schoolId, 'classes', classroom);

  // 2. Also try Firestore
  try {
    await setDoc(doc(db, 'schools', schoolId, 'classes', classId), classroom);
  } catch (err) {
    console.warn('Firestore createClassroom note:', err);
  }

  await logAuditEvent(
    schoolId,
    actorUid,
    actorName,
    'admin',
    'CREATE_CLASS',
    'Classroom',
    classId,
    { name: classroom.name, code: classroom.code }
  );

  return classroom;
}

export async function deleteClassroom(
  schoolId: string,
  classId: string,
  actorUid: string,
  actorName: string
): Promise<void> {
  await syncApiDelete(schoolId, 'classes', classId);
  try {
    await deleteDoc(doc(db, 'schools', schoolId, 'classes', classId));
  } catch {}
  await logAuditEvent(
    schoolId,
    actorUid,
    actorName,
    'admin',
    'DELETE_CLASS',
    'Classroom',
    classId
  );
}

export async function fetchEnrolledStudents(schoolId: string, classId: string): Promise<Student[]> {
  const allStudents = await fetchStudents(schoolId);
  return allStudents.filter((s) => s.classId === classId);
}

export async function joinClassByCode(
  code: string,
  studentName: string,
  studentUid: string,
  studentEmail?: string
): Promise<{ schoolId: string; classroom: Classroom; student: Student }> {
  const formattedCode = code.trim().toUpperCase();
  const schools = await fetchSchools();

  for (const sch of schools) {
    const classes = await fetchClasses(sch.id);
    const foundClass = classes.find((c) => c.code.toUpperCase() === formattedCode);
    if (foundClass) {
      const studentId = studentUid || generateId('st');
      const student: Student = {
        id: studentId,
        schoolId: sch.id,
        userId: studentUid,
        name: studentName,
        email: studentEmail,
        grade: foundClass.grade,
        classId: foundClass.id,
        className: foundClass.name,
        status: 'active',
        joinedAt: new Date().toISOString(),
      };

      await syncApiSave(sch.id, 'students', student);

      try {
        const batch = writeBatch(db);
        const studentInClassRef = doc(db, 'schools', sch.id, 'classes', foundClass.id, 'students', studentId);
        const studentInSchoolRef = doc(db, 'schools', sch.id, 'students', studentId);
        batch.set(studentInClassRef, student);
        batch.set(studentInSchoolRef, student);
        await batch.commit();
      } catch {}

      await logAuditEvent(
        sch.id,
        studentUid,
        studentName,
        'student',
        'JOIN_CLASS_BY_CODE',
        'Classroom',
        foundClass.id,
        { classCode: formattedCode, className: foundClass.name }
      );

      return { schoolId: sch.id, classroom: foundClass, student };
    }
  }

  throw new Error(`Invalid class code "${formattedCode}". Please verify with your teacher.`);
}

// -------------------------------------------------------------
// TEACHERS
// -------------------------------------------------------------
export async function fetchTeachers(schoolId: string): Promise<Teacher[]> {
  const list: Teacher[] = [];
  try {
    const snap = await getDocs(collection(db, 'schools', schoolId, 'teachers'));
    snap.forEach((d) => list.push({ ...d.data(), id: d.id } as Teacher));
  } catch {}
  const apiItems = await syncApiGet<Teacher>(schoolId, 'teachers');
  const map = new Map<string, Teacher>();
  apiItems.forEach((t) => map.set(t.id, t));
  list.forEach((t) => map.set(t.id, t));
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function createTeacher(
  schoolId: string,
  data: { name: string; email: string; subjects: string[]; classIds: string[] },
  actorUid: string,
  actorName: string
): Promise<Teacher> {
  const teacherId = generateId('tc');
  const teacher: Teacher = {
    id: teacherId,
    schoolId,
    name: data.name,
    email: data.email.toLowerCase().trim(),
    subjects: data.subjects || [],
    classIds: data.classIds || [],
    status: 'active',
    createdAt: new Date().toISOString(),
  };

  await syncApiSave(schoolId, 'teachers', teacher);

  try {
    await setDoc(doc(db, 'schools', schoolId, 'teachers', teacherId), teacher);
    await setDoc(doc(db, 'invites', teacher.email), {
      role: 'teacher',
      schoolId,
      roleRefId: teacherId,
    });
  } catch (err) {
    console.warn('Firestore teacher write notice:', err);
  }

  await logAuditEvent(
    schoolId,
    actorUid,
    actorName,
    'admin',
    'CREATE_TEACHER',
    'Teacher',
    teacherId,
    { name: teacher.name, email: teacher.email }
  );

  return teacher;
}

export async function deleteTeacher(
  schoolId: string,
  teacherId: string,
  teacherEmail: string,
  actorUid: string,
  actorName: string
): Promise<void> {
  await syncApiDelete(schoolId, 'teachers', teacherId);
  try {
    await deleteDoc(doc(db, 'schools', schoolId, 'teachers', teacherId));
    if (teacherEmail) {
      await deleteDoc(doc(db, 'invites', teacherEmail.toLowerCase().trim()));
    }
  } catch {}
  await logAuditEvent(
    schoolId,
    actorUid,
    actorName,
    'admin',
    'DELETE_TEACHER',
    'Teacher',
    teacherId
  );
}

// -------------------------------------------------------------
// STUDENTS ROSTER
// -------------------------------------------------------------
export async function fetchStudents(schoolId: string): Promise<Student[]> {
  const list: Student[] = [];
  try {
    const snap = await getDocs(collection(db, 'schools', schoolId, 'students'));
    snap.forEach((d) => list.push({ ...d.data(), id: d.id } as Student));
  } catch {}
  const apiItems = await syncApiGet<Student>(schoolId, 'students');
  const map = new Map<string, Student>();
  apiItems.forEach((s) => map.set(s.id, s));
  list.forEach((s) => map.set(s.id, s));
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function createStudent(
  schoolId: string,
  data: {
    name: string;
    email?: string;
    admissionNo?: string;
    grade: string;
    classId: string;
    className?: string;
    parentEmail?: string;
  },
  actorUid: string,
  actorName: string
): Promise<Student> {
  const studentId = generateId('st');
  const student: Student = {
    id: studentId,
    schoolId,
    name: data.name,
    email: data.email?.toLowerCase().trim(),
    admissionNo: data.admissionNo,
    grade: data.grade,
    classId: data.classId,
    className: data.className,
    parentEmail: data.parentEmail?.toLowerCase().trim(),
    status: 'active',
    joinedAt: new Date().toISOString(),
  };

  await syncApiSave(schoolId, 'students', student);

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'schools', schoolId, 'students', studentId), student);
    if (data.classId) {
      batch.set(doc(db, 'schools', schoolId, 'classes', data.classId, 'students', studentId), student);
    }
    if (student.email) {
      batch.set(doc(db, 'invites', student.email), {
        role: 'student',
        schoolId,
        roleRefId: studentId,
      });
    }
    await batch.commit();
  } catch (err) {
    console.warn('Firestore student write notice:', err);
  }

  await logAuditEvent(
    schoolId,
    actorUid,
    actorName,
    'admin',
    'CREATE_STUDENT',
    'Student',
    studentId,
    { name: student.name, classId: student.classId }
  );

  return student;
}

export async function deleteStudent(
  schoolId: string,
  studentId: string,
  classId: string,
  actorUid: string,
  actorName: string
): Promise<void> {
  await syncApiDelete(schoolId, 'students', studentId);
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'schools', schoolId, 'students', studentId));
    if (classId) {
      batch.delete(doc(db, 'schools', schoolId, 'classes', classId, 'students', studentId));
    }
    await batch.commit();
  } catch {}
  await logAuditEvent(
    schoolId,
    actorUid,
    actorName,
    'admin',
    'DELETE_STUDENT',
    'Student',
    studentId
  );
}

// -------------------------------------------------------------
// PARENTS
// -------------------------------------------------------------
export async function fetchParents(schoolId: string): Promise<Parent[]> {
  const list: Parent[] = [];
  try {
    const snap = await getDocs(collection(db, 'schools', schoolId, 'parents'));
    snap.forEach((d) => list.push({ ...d.data(), id: d.id } as Parent));
  } catch {}
  const apiItems = await syncApiGet<Parent>(schoolId, 'parents');
  const map = new Map<string, Parent>();
  apiItems.forEach((p) => map.set(p.id, p));
  list.forEach((p) => map.set(p.id, p));
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function createParent(
  schoolId: string,
  data: { name: string; email: string; phone?: string; children: string[] },
  actorUid: string,
  actorName: string
): Promise<Parent> {
  const parentId = generateId('par');
  const parent: Parent = {
    id: parentId,
    schoolId,
    name: data.name,
    email: data.email.toLowerCase().trim(),
    phone: data.phone,
    children: data.children || [],
    createdAt: new Date().toISOString(),
  };

  await syncApiSave(schoolId, 'parents', parent);

  try {
    await setDoc(doc(db, 'schools', schoolId, 'parents', parentId), parent);
    await setDoc(doc(db, 'invites', parent.email), {
      role: 'parent',
      schoolId,
      roleRefId: parentId,
    });
  } catch (err) {
    console.warn('Firestore parent write notice:', err);
  }

  await logAuditEvent(
    schoolId,
    actorUid,
    actorName,
    'admin',
    'CREATE_PARENT',
    'Parent',
    parentId,
    { name: parent.name, childrenCount: parent.children.length }
  );

  return parent;
}

// -------------------------------------------------------------
// ASSIGNMENTS & SUBMISSIONS
// -------------------------------------------------------------
export async function fetchAssignments(schoolId: string, classId?: string): Promise<Assignment[]> {
  const list: Assignment[] = [];
  try {
    const snap = await getDocs(collection(db, 'schools', schoolId, 'assignments'));
    snap.forEach((d) => {
      const data = d.data() as Assignment;
      if (!classId || data.classId === classId) {
        list.push({ ...data, id: d.id });
      }
    });
  } catch {}
  const apiItems = await syncApiGet<Assignment>(schoolId, 'assignments');
  const map = new Map<string, Assignment>();
  apiItems.forEach((a) => {
    if (!classId || a.classId === classId) map.set(a.id, a);
  });
  list.forEach((a) => {
    if (!classId || a.classId === classId) map.set(a.id, a);
  });
  return Array.from(map.values()).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function createAssignment(
  schoolId: string,
  data: Omit<Assignment, 'id' | 'createdAt'>,
  actorUid: string,
  actorName: string
): Promise<Assignment> {
  const assignmentId = generateId('asg');
  const assignment: Assignment = {
    ...data,
    id: assignmentId,
    createdAt: new Date().toISOString(),
  };

  await syncApiSave(schoolId, 'assignments', assignment);

  try {
    await setDoc(doc(db, 'schools', schoolId, 'assignments', assignmentId), assignment);
  } catch (err) {
    console.warn('Firestore assignment write notice:', err);
  }

  await logAuditEvent(
    schoolId,
    actorUid,
    actorName,
    'teacher',
    'CREATE_ASSIGNMENT',
    'Assignment',
    assignmentId,
    { title: assignment.title, classId: assignment.classId }
  );

  return assignment;
}

export async function deleteAssignment(
  schoolId: string,
  assignmentId: string,
  actorUid: string,
  actorName: string
): Promise<void> {
  await syncApiDelete(schoolId, 'assignments', assignmentId);
  try {
    await deleteDoc(doc(db, 'schools', schoolId, 'assignments', assignmentId));
  } catch {}
  await logAuditEvent(
    schoolId,
    actorUid,
    actorName,
    'teacher',
    'DELETE_ASSIGNMENT',
    'Assignment',
    assignmentId
  );
}

export async function fetchSubmissions(schoolId: string, assignmentId?: string): Promise<Submission[]> {
  const list: Submission[] = [];
  try {
    const snap = await getDocs(collection(db, 'schools', schoolId, 'submissions'));
    snap.forEach((d) => {
      const data = d.data() as Submission;
      if (!assignmentId || data.assignmentId === assignmentId) {
        list.push({ ...data, id: d.id });
      }
    });
  } catch {}
  const apiItems = await syncApiGet<Submission>(schoolId, 'submissions');
  const map = new Map<string, Submission>();
  apiItems.forEach((s) => {
    if (!assignmentId || s.assignmentId === assignmentId) map.set(s.id, s);
  });
  list.forEach((s) => {
    if (!assignmentId || s.assignmentId === assignmentId) map.set(s.id, s);
  });
  return Array.from(map.values());
}

export async function submitStudentWork(
  schoolId: string,
  data: {
    assignmentId: string;
    assignmentTitle?: string;
    classId: string;
    studentId: string;
    studentName: string;
    content: string;
    attachmentUrl?: string;
    isDraft?: boolean;
  }
): Promise<Submission> {
  const submissionId = `${data.assignmentId}_${data.studentId}`;
  const submission: Submission = {
    id: submissionId,
    schoolId,
    assignmentId: data.assignmentId,
    assignmentTitle: data.assignmentTitle,
    classId: data.classId,
    studentId: data.studentId,
    studentName: data.studentName,
    content: data.content,
    status: data.isDraft ? 'draft' : 'submitted',
    submittedAt: data.isDraft ? undefined : new Date().toISOString(),
  };

  await syncApiSave(schoolId, 'submissions', submission);

  try {
    await setDoc(doc(db, 'schools', schoolId, 'submissions', submissionId), submission, { merge: true });
  } catch {}

  return submission;
}

export async function gradeStudentSubmission(
  schoolId: string,
  submissionId: string,
  marks: number,
  feedback: string,
  actorUid: string,
  actorName: string
): Promise<void> {
  const submissions = await fetchSubmissions(schoolId);
  const target = submissions.find((s) => s.id === submissionId);
  if (target) {
    const updated = {
      ...target,
      status: 'graded' as const,
      marks,
      feedback,
      gradedAt: new Date().toISOString(),
    };
    await syncApiSave(schoolId, 'submissions', updated);
  }

  try {
    await updateDoc(doc(db, 'schools', schoolId, 'submissions', submissionId), {
      status: 'graded',
      marks,
      feedback,
      gradedAt: new Date().toISOString(),
    });
  } catch {}

  await logAuditEvent(
    schoolId,
    actorUid,
    actorName,
    'teacher',
    'GRADE_SUBMISSION',
    'Submission',
    submissionId,
    { marks }
  );
}

// -------------------------------------------------------------
// ATTENDANCE
// -------------------------------------------------------------
export async function fetchAttendance(schoolId: string, classId?: string): Promise<AttendanceSession[]> {
  const list: AttendanceSession[] = [];
  try {
    const snap = await getDocs(collection(db, 'schools', schoolId, 'attendance'));
    snap.forEach((d) => {
      const data = d.data() as AttendanceSession;
      if (!classId || data.classId === classId) {
        list.push({ ...data, id: d.id });
      }
    });
  } catch {}
  const apiItems = await syncApiGet<AttendanceSession>(schoolId, 'attendance');
  const map = new Map<string, AttendanceSession>();
  apiItems.forEach((a) => {
    if (!classId || a.classId === classId) map.set(a.id, a);
  });
  list.forEach((a) => {
    if (!classId || a.classId === classId) map.set(a.id, a);
  });
  return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
}

export async function saveAttendanceSession(
  schoolId: string,
  data: {
    classId: string;
    className?: string;
    subject: string;
    teacherId: string;
    date: string;
    records: Record<string, AttendanceStatus>;
  },
  actorUid: string,
  actorName: string
): Promise<AttendanceSession> {
  const cleanSubj = data.subject.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const sessionId = `att_${data.classId}_${cleanSubj}_${data.date}`;
  const session: AttendanceSession = {
    id: sessionId,
    schoolId,
    classId: data.classId,
    className: data.className,
    subject: data.subject,
    teacherId: data.teacherId,
    date: data.date,
    records: data.records,
    createdAt: new Date().toISOString(),
  };

  await syncApiSave(schoolId, 'attendance', session);

  try {
    await setDoc(doc(db, 'schools', schoolId, 'attendance', sessionId), session);
  } catch {}

  await logAuditEvent(
    schoolId,
    actorUid,
    actorName,
    'teacher',
    'RECORD_ATTENDANCE',
    'AttendanceSession',
    sessionId,
    { classId: data.classId, date: data.date, markedCount: Object.keys(data.records).length }
  );

  return session;
}

// -------------------------------------------------------------
// RESULTS / ASSESSMENTS
// -------------------------------------------------------------
export async function fetchResults(schoolId: string, classId?: string): Promise<ResultAssessment[]> {
  const list: ResultAssessment[] = [];
  try {
    const snap = await getDocs(collection(db, 'schools', schoolId, 'results'));
    snap.forEach((d) => {
      const data = d.data() as ResultAssessment;
      if (!classId || data.classId === classId) {
        list.push({ ...data, id: d.id });
      }
    });
  } catch {}
  const apiItems = await syncApiGet<ResultAssessment>(schoolId, 'results');
  const map = new Map<string, ResultAssessment>();
  apiItems.forEach((r) => {
    if (!classId || r.classId === classId) map.set(r.id, r);
  });
  list.forEach((r) => {
    if (!classId || r.classId === classId) map.set(r.id, r);
  });
  return Array.from(map.values()).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function saveAssessmentResult(
  schoolId: string,
  data: Omit<ResultAssessment, 'id' | 'createdAt'>,
  actorUid: string,
  actorName: string
): Promise<ResultAssessment> {
  const resultId = generateId('res');
  const result: ResultAssessment = {
    ...data,
    id: resultId,
    createdAt: new Date().toISOString(),
  };

  await syncApiSave(schoolId, 'results', result);

  try {
    await setDoc(doc(db, 'schools', schoolId, 'results', resultId), result);
  } catch {}

  await logAuditEvent(
    schoolId,
    actorUid,
    actorName,
    'teacher',
    'SAVE_RESULT',
    'ResultAssessment',
    resultId,
    { examName: result.examName, classId: result.classId }
  );

  return result;
}

// -------------------------------------------------------------
// TIMETABLES
// -------------------------------------------------------------
export async function fetchTimetables(schoolId: string, classId: string): Promise<TimetableDay[]> {
  const list: TimetableDay[] = [];
  try {
    const snap = await getDocs(collection(db, 'schools', schoolId, 'timetables'));
    snap.forEach((d) => {
      const data = d.data() as TimetableDay;
      if (data.classId === classId) {
        list.push({ ...data, id: d.id });
      }
    });
  } catch {}
  const apiItems = await syncApiGet<TimetableDay>(schoolId, 'timetables');
  const map = new Map<string, TimetableDay>();
  apiItems.forEach((t) => {
    if (t.classId === classId) map.set(t.id, t);
  });
  list.forEach((t) => {
    if (t.classId === classId) map.set(t.id, t);
  });
  const dayOrder: Record<string, number> = {
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };
  return Array.from(map.values()).sort((a, b) => (dayOrder[a.day] || 99) - (dayOrder[b.day] || 99));
}

// -------------------------------------------------------------
// ANNOUNCEMENTS
// -------------------------------------------------------------
export async function fetchAnnouncements(schoolId: string, classId?: string): Promise<Announcement[]> {
  const list: Announcement[] = [];
  try {
    const snap = await getDocs(collection(db, 'schools', schoolId, 'announcements'));
    snap.forEach((d) => {
      const data = d.data() as Announcement;
      if (
        data.targetType === 'all' ||
        !classId ||
        (data.targetType === 'class' && data.targetClassId === classId)
      ) {
        list.push({ ...data, id: d.id });
      }
    });
  } catch {}
  const apiItems = await syncApiGet<Announcement>(schoolId, 'announcements');
  const map = new Map<string, Announcement>();
  apiItems.forEach((a) => {
    if (a.targetType === 'all' || !classId || (a.targetType === 'class' && a.targetClassId === classId)) {
      map.set(a.id, a);
    }
  });
  list.forEach((a) => {
    if (a.targetType === 'all' || !classId || (a.targetType === 'class' && a.targetClassId === classId)) {
      map.set(a.id, a);
    }
  });
  return Array.from(map.values()).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function createAnnouncement(
  schoolId: string,
  data: Omit<Announcement, 'id' | 'createdAt'>,
  actorUid: string,
  actorName: string
): Promise<Announcement> {
  const announcementId = generateId('anc');
  const announcement: Announcement = {
    ...data,
    id: announcementId,
    createdAt: new Date().toISOString(),
  };

  await syncApiSave(schoolId, 'announcements', announcement);

  try {
    await setDoc(doc(db, 'schools', schoolId, 'announcements', announcementId), announcement);
  } catch {}

  await logAuditEvent(
    schoolId,
    actorUid,
    actorName,
    data.authorRole,
    'CREATE_ANNOUNCEMENT',
    'Announcement',
    announcementId,
    { title: announcement.title, targetType: announcement.targetType }
  );

  return announcement;
}

export async function deleteAnnouncement(
  schoolId: string,
  announcementId: string,
  actorUid: string,
  actorName: string
): Promise<void> {
  await syncApiDelete(schoolId, 'announcements', announcementId);
  try {
    await deleteDoc(doc(db, 'schools', schoolId, 'announcements', announcementId));
  } catch {}
  await logAuditEvent(
    schoolId,
    actorUid,
    actorName,
    'staff',
    'DELETE_ANNOUNCEMENT',
    'Announcement',
    announcementId
  );
}

// -------------------------------------------------------------
// MESSAGES
// -------------------------------------------------------------
export async function fetchMessages(schoolId: string, conversationId: string): Promise<ChatMessage[]> {
  const list: ChatMessage[] = [];
  try {
    const snap = await getDocs(collection(db, 'schools', schoolId, 'messages'));
    snap.forEach((d) => {
      const data = d.data() as ChatMessage;
      if (data.conversationId === conversationId) {
        list.push({ ...data, id: d.id });
      }
    });
  } catch {}
  const apiItems = await syncApiGet<ChatMessage>(schoolId, 'messages');
  const map = new Map<string, ChatMessage>();
  apiItems.forEach((m) => {
    if (m.conversationId === conversationId) map.set(m.id, m);
  });
  list.forEach((m) => {
    if (m.conversationId === conversationId) map.set(m.id, m);
  });
  return Array.from(map.values()).sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
}

export async function sendMessage(
  schoolId: string,
  data: Omit<ChatMessage, 'id' | 'createdAt' | 'read'>
): Promise<ChatMessage> {
  const msgId = generateId('msg');
  const msg: ChatMessage = {
    ...data,
    id: msgId,
    read: false,
    createdAt: new Date().toISOString(),
  };

  await syncApiSave(schoolId, 'messages', msg);

  try {
    await setDoc(doc(db, 'schools', schoolId, 'messages', msgId), msg);
  } catch {}

  return msg;
}
