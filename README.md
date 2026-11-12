# JMC Classroom — Production-Grade School Management & Learning Platform

A real, production-ready school management and online learning platform for Grade 6–11 with Cloud Firestore as the single source of truth, real role-based access control (RBAC), and server-side Gemini curriculum intelligence.

---

## 1. Firebase Project Used

- **Project ID**: `jmc-class`
- **Auth Domain**: `jmc-class.firebaseapp.com`
- **Storage Bucket**: `jmc-class.firebasestorage.app`
- **Messaging Sender ID**: `264700474615`
- **Web App ID**: `1:264700474615:web:701719833c85d135a78ff2`

---

## 2. Required Firebase Services

1. **Firebase Authentication**: Google Sign-in enabled (with optional email fallback).
2. **Cloud Firestore**: Enterprise/Standard Firestore database storing all application state.
3. **Firebase Storage**: Secure asset store for attachments, documents, and logos.
4. **Firebase Security Rules**: Hardened ABAC enforcement.

---

## 3. Authentication Setup

- **Google Sign-In**: Primary identity provider using `signInWithPopup`.
- **User Profile Bootstrap**:
  - Every authenticated account automatically provisions or updates its `/users/{uid}` document.
  - Role resolution is performed via `/invites/{email}` or pre-assigned role flags, preventing unauthorized client self-promotion.
  - Platform Operator bootstrap: `jmc.class2027@gmail.com` and `operator@jmc.internal` are automatically assigned the `operator` role.

---

## 4. Firestore Architecture & Collections

Authoritative schema modeled in `firebase-blueprint.json`:

```
users/{uid}                                             -> User profile & global role
invites/{email}                                         -> Email invitation to role mapping
schools/{schoolId}                                      -> School institution records
schools/{schoolId}/classes/{classId}                    -> Classrooms with 6-letter join codes
schools/{schoolId}/classes/{classId}/students/{student} -> Enrolled student cohorts
schools/{schoolId}/teachers/{teacherId}                 -> Teacher staff records
schools/{schoolId}/students/{studentId}                 -> School student roster
schools/{schoolId}/parents/{parentId}                   -> Registered parent accounts & student links
schools/{schoolId}/assignments/{assignmentId}           -> Coursework, worksheets, homework
schools/{schoolId}/submissions/{submissionId}           -> Student submissions, marks, teacher feedback
schools/{schoolId}/attendance/{attendanceId}            -> Daily attendance sessions (prevents duplicates)
schools/{schoolId}/results/{resultId}                   -> Examination marks, report cards
schools/{schoolId}/timetables/{timetableId}             -> Weekly period schedules
schools/{schoolId}/announcements/{announcementId}       -> Targeted school announcements
schools/{schoolId}/messages/{messageId}                 -> Direct communication
schools/{schoolId}/auditLogs/{logId}                    -> Immutable administrative audit trail
```

---

## 5. Storage Structure

- `schools/{schoolId}/logos/*`: School institution logos.
- `schools/{schoolId}/assignments/{assignmentId}/*`: Teacher reference attachments.
- `schools/{schoolId}/submissions/{submissionId}/*`: Student uploaded documents.

---

## 6. Security Rules

Configured in `firestore.rules` and `storage.rules`:
- Default-deny architecture.
- Role-based gates: `isOperator()`, `isSchoolAdmin(schoolId)`, `isTeacher(schoolId)`, `isSchoolMember(schoolId)`.
- Client role spoofing prevention: Users cannot update their own `role` or `schoolId`.
- Submissions can only be graded by assigned teachers or school admins.
- Attendance sessions prevent duplicate overwrite via deterministic session IDs.
- Audit logs are append-only and immutable.

---

## 7. Indexes

Configured in `firestore.indexes.json` for compound queries where necessary.

---

## 8. Environment Variables

Defined in `.env.example`:

```bash
# Gemini API Key (injected server-side)
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"

# Development & App URL
APP_URL="http://localhost:3000"
PORT=3000
```

---

## 9. Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start full-stack server (Express + Vite middlewares):
   ```bash
   npm run dev
   ```
3. Open `http://localhost:3000` in your browser.

---

## 10. Production Deployment & Vercel Drag-and-Drop (https://class-jmc.vercel.app)

### Method A: Vercel Drag & Drop (Instant)
1. Open **[https://vercel.com/new](https://vercel.com/new)**.
2. Drag and drop either:
   - The entire project folder, **or**
   - The compiled `dist/` folder (run `npm run build` first).
3. Vercel loads settings automatically from `vercel.json` (rewriting all SPA routes to `/index.html` and routing `/api/*` to Vercel Serverless Functions).
4. Assign the domain: `class-jmc.vercel.app`.

### Method B: Full-Stack Node / Docker
1. Build static and client assets:
   ```bash
   npm run build
   ```
2. Start Node server:
   ```bash
   npm start
   ```

---

## 11. Role Setup Workflows

### Administrator Setup
1. The Platform Operator creates a school via the **Operator Dashboard** and enters the administrator's Google email.
2. The School Administrator signs in with that Google account to access the **School Admin Dashboard**.
3. Admin can configure classes, create student join codes, invite teachers, and manage school profile.

### Teacher Setup
1. The School Admin adds a teacher with their Google email and primary subjects in **School Admin -> Teachers**.
2. Teacher signs in using that Google email to access the **Teacher Portal**.
3. Teacher can post lesson notes, issue assignments, mark daily attendance, and record exam marks.

### Student Setup
1. **Direct Registration**: School Admin enrolls the student under **School Admin -> Students**.
2. **Self-Enrollment by Code**: Student visits the landing page, clicks "Join with Code", enters student name and the 6-letter class code (e.g. `AB3X9K`). The system links them in Firestore immediately.

### Parent Setup
1. School Admin links parent Google email to the student admission record.
2. Parent logs in to track daily attendance percentage, homework submission status, and exam report cards in real-time.
