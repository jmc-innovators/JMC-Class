export type UserRole = 'operator' | 'school' | 'supervisor' | 'teacher' | 'student' | 'parent';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  schoolId?: string;
  roleRefId?: string;
  status: 'active' | 'suspended';
  createdAt?: any;
  updatedAt?: any;
  lastLoginAt?: any;
}

export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface SchoolApplication {
  id: string; // e.g. APP-2026-XXXXX
  schoolName: string;
  principalName: string;
  administratorName: string;
  administratorEmail: string;
  contactNumber: string;
  province: string;
  district: string;
  address: string;
  schoolType: string;
  website?: string;
  additionalInfo?: string;
  submissionDate: string; // ISO date string
  status: ApplicationStatus;
  operatorRemarks?: string;
  approvalDate?: string;
  schoolId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface School {
  id: string;
  name: string;
  schoolName?: string;
  adminEmail: string;
  administratorEmail?: string;
  administratorName?: string;
  principalName?: string;
  schoolType?: string;
  address?: string;
  district?: string;
  province?: string;
  phone?: string;
  contactNumber?: string;
  email?: string;
  website?: string;
  academicYear?: string;
  logoUrl?: string;
  status: 'active' | 'pending' | 'inactive' | 'ACTIVE';
  applicationId?: string;
  approvedAt?: string;
  createdAt: string;
}

export interface Classroom {
  id: string;
  schoolId: string;
  name: string;
  grade: string;
  div: string;
  code: string;
  teachers: string[]; // Teacher IDs
  subjects: Record<string, string>; // teacherId -> subjectName
  createdAt: string;
}

export interface Teacher {
  id: string;
  schoolId: string;
  userId?: string;
  name: string;
  email: string;
  subjects: string[];
  classIds: string[];
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Student {
  id: string;
  schoolId: string;
  userId?: string;
  name: string;
  email?: string;
  admissionNo?: string;
  grade: string;
  classId: string;
  className?: string;
  parentId?: string;
  parentEmail?: string;
  status: 'active' | 'inactive';
  joinedAt: string;
}

export interface Parent {
  id: string;
  schoolId: string;
  userId?: string;
  name: string;
  email: string;
  phone?: string;
  children: string[]; // Array of student IDs
  createdAt: string;
}

export interface Assignment {
  id: string;
  schoolId: string;
  classId: string;
  className: string;
  subject: string;
  teacherId: string;
  teacherName: string;
  title: string;
  description?: string;
  instructions?: string;
  wtype?: 'assignment' | 'worksheet' | 'project' | 'essay' | 'practical' | 'other';
  maxMarks?: number;
  dueDate?: string;
  attachments?: string[];
  createdAt: string;
}

export interface Submission {
  id: string;
  schoolId: string;
  assignmentId: string;
  assignmentTitle?: string;
  classId: string;
  studentId: string;
  studentName: string;
  content: string;
  status: 'submitted' | 'graded' | 'draft';
  marks?: number;
  feedback?: string;
  submittedAt?: string;
  gradedAt?: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceSession {
  id: string;
  schoolId: string;
  classId: string;
  className?: string;
  subject: string;
  teacherId: string;
  date: string; // YYYY-MM-DD
  records: Record<string, AttendanceStatus>; // studentId -> status
  createdAt: string;
}

export interface AssessmentResultItem {
  studentId: string;
  studentName: string;
  marks: number;
  grade: string;
  feedback?: string;
}

export interface ResultAssessment {
  id: string;
  schoolId: string;
  classId: string;
  className?: string;
  subject: string;
  teacherId: string;
  examName: string;
  term?: string;
  maxMarks: number;
  records: AssessmentResultItem[];
  createdAt: string;
}

export interface TimetablePeriod {
  periodNumber: number;
  startTime: string;
  endTime: string;
  subject: string;
  teacherId?: string;
  teacherName?: string;
  room?: string;
}

export interface TimetableDay {
  id: string;
  schoolId: string;
  classId: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  periods: TimetablePeriod[];
  createdAt: string;
}

export interface Announcement {
  id: string;
  schoolId: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  targetType: 'all' | 'teachers' | 'students' | 'parents' | 'class';
  targetClassId?: string;
  targetClassName?: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  schoolId: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  recipientId: string;
  recipientName: string;
  text: string;
  read: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  schoolId: string;
  actorUid: string;
  actorName: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  timestamp: string;
  metadata?: Record<string, any>;
}
