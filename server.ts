import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// Server-side Gemini AI setup
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// API endpoint: AI Assistant for Lesson Planning and Assignment Drafting
app.post('/api/ai/lesson-assistant', async (req, res) => {
  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured on the server. Please set GEMINI_API_KEY.',
      });
    }

    const { subject, grade, topic, taskType, instructions } = req.body;
    const prompt = `You are an expert curriculum and educational assistant for Sri Lankan and International Grade 6-11 school teachers.
Task: ${taskType || 'Generate an assignment outline with rubrics and questions'}
Subject: ${subject || 'General Science'}
Grade: ${grade || 'Grade 9'}
Topic: ${topic || 'Key Concepts'}
Additional Instructions: ${instructions || 'Provide clear, encouraging, age-appropriate questions and marking criteria.'}

Format the response clearly with:
1. Title and Objective
2. Clear Instructions for Students
3. 3-5 Practice / Assessment Questions
4. Suggested Marking Scheme / Criteria`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'You are an educational assistant supporting teachers with high quality, rigorous, and engaging lesson materials.',
        temperature: 0.7,
      },
    });

    res.json({ text: response.text });
  } catch (error) {
    console.error('Error in /api/ai/lesson-assistant:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate content',
    });
  }
});

// API endpoint: AI Learning Explanation / Study Helper for Students
app.post('/api/ai/study-helper', async (req, res) => {
  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured on the server.',
      });
    }

    const { question, subject, grade } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const prompt = `You are the friendly JMC Classroom AI Tutor for Grade ${grade || '6-11'} students studying ${subject || 'general curriculum'}.
The student is asking: "${question}".

Rules:
1. Explain step-by-step with simple, clear language.
2. Give a real-world example or analogy.
3. Conclude with a quick 1-question check to verify understanding.
4. Keep the tone warm, respectful, and motivating.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    res.json({ text: response.text });
  } catch (error) {
    console.error('Error in /api/ai/study-helper:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to answer question',
    });
  }
});

// -------------------------------------------------------------
// Real School Data Store & Firestore Sync Endpoints
// -------------------------------------------------------------
import fs from 'fs';

const STORE_PATH = path.resolve(__dirname, 'data_store.json');

interface DataStore {
  schools: Record<string, any>;
  schoolApplications: Record<string, any>;
  applicationDocuments?: Record<string, { fileName: string; mimeType: string; size: number; base64Data: string }>;
  workspaceConfig?: any;
  classes: Record<string, any[]>;
  teachers: Record<string, any[]>;
  students: Record<string, any[]>;
  parents: Record<string, any[]>;
  assignments: Record<string, any[]>;
  submissions: Record<string, any[]>;
  attendance: Record<string, any[]>;
  results: Record<string, any[]>;
  announcements: Record<string, any[]>;
  auditLogs: Record<string, any[]>;
  notes: Record<string, any[]>;
}

const defaultStore: DataStore = {
  schools: {
    'id_mtz4zcm9_xs77h8e': {
      id: 'id_mtz4zcm9_xs77h8e',
      name: 'J/Mahajana college',
      adminEmail: 'sivaneswaran828@gmail.com',
      email: 'sivaneswaran828@gmail.com',
      principalName: 'Mr.Pushparathanam',
      district: 'Jaffna',
      province: 'Northern',
      address: 'Ampaani, telipalai',
      phone: '0763917067',
      accessCode: 'T9JWYW',
      schoolType: 'National',
      academicYear: '2026',
      status: 'active',
      createdAt: new Date().toISOString(),
    },
  },
  classes: {
    'id_mtz4zcm9_xs77h8e': [
      {
        id: 'cls_grade9a',
        schoolId: 'id_mtz4zcm9_xs77h8e',
        name: 'Grade 9A — Physical Sciences & Maths',
        grade: 'Grade 9',
        div: '9A',
        code: 'MC9A82',
        teachers: ['tc_science'],
        subjects: { Science: 'tc_science', Maths: 'tc_maths' },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'cls_grade10a',
        schoolId: 'id_mtz4zcm9_xs77h8e',
        name: 'Grade 10A — O/L Foundation Cohort',
        grade: 'Grade 10',
        div: '10A',
        code: 'MC10OL',
        teachers: ['tc_science'],
        subjects: { Science: 'tc_science' },
        createdAt: new Date().toISOString(),
      },
    ],
  },
  teachers: {
    'id_mtz4zcm9_xs77h8e': [
      {
        id: 'tc_science',
        schoolId: 'id_mtz4zcm9_xs77h8e',
        name: 'Mr. Sivaneswaran (Science Lead)',
        email: 'sivaneswaran828@gmail.com',
        subjects: ['Science', 'ICT'],
        classIds: ['cls_grade9a', 'cls_grade10a'],
        status: 'active',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'tc_maths',
        schoolId: 'id_mtz4zcm9_xs77h8e',
        name: 'Ms. Dilrukshi Perera',
        email: 'dilrukshi.perera@jmc.school',
        subjects: ['Maths'],
        classIds: ['cls_grade9a'],
        status: 'active',
        createdAt: new Date().toISOString(),
      },
    ],
  },
  students: {
    'id_mtz4zcm9_xs77h8e': [
      {
        id: 'st_kasun',
        schoolId: 'id_mtz4zcm9_xs77h8e',
        name: 'Kasun Bandara',
        email: 'kasun.student@gmail.com',
        admissionNo: 'MC-2026-081',
        grade: 'Grade 9',
        classId: 'cls_grade9a',
        className: 'Grade 9A — Physical Sciences & Maths',
        parentEmail: 'sunil.parent@gmail.com',
        status: 'active',
        joinedAt: new Date().toISOString(),
      },
      {
        id: 'st_vimal',
        schoolId: 'id_mtz4zcm9_xs77h8e',
        name: 'Vimalanathan K.',
        email: 'vimal.student@gmail.com',
        admissionNo: 'MC-2026-094',
        grade: 'Grade 9',
        classId: 'cls_grade9a',
        className: 'Grade 9A — Physical Sciences & Maths',
        status: 'active',
        joinedAt: new Date().toISOString(),
      },
    ],
  },
  parents: {
    'id_mtz4zcm9_xs77h8e': [
      {
        id: 'par_sunil',
        schoolId: 'id_mtz4zcm9_xs77h8e',
        name: 'Mr. Sunil Bandara',
        email: 'sunil.parent@gmail.com',
        phone: '077 345 8899',
        children: ['st_kasun'],
        createdAt: new Date().toISOString(),
      },
    ],
  },
  assignments: {
    'id_mtz4zcm9_xs77h8e': [
      {
        id: 'asn_science_1',
        schoolId: 'id_mtz4zcm9_xs77h8e',
        classId: 'cls_grade9a',
        className: 'Grade 9A',
        teacherId: 'tc_science',
        teacherName: 'Mr. Sivaneswaran',
        subject: 'Science',
        title: 'Unit 4: Force and Motion — Newton Laws Worksheet',
        description: 'Complete the questions on balanced forces, friction calculation, and F=ma. Show step-by-step working.',
        dueDate: '2026-10-25',
        maxMarks: 100,
        createdAt: new Date().toISOString(),
      },
    ],
  },
  submissions: {
    'id_mtz4zcm9_xs77h8e': [
      {
        id: 'sub_kasun_1',
        schoolId: 'id_mtz4zcm9_xs77h8e',
        assignmentId: 'asn_science_1',
        assignmentTitle: 'Unit 4: Force and Motion',
        classId: 'cls_grade9a',
        studentId: 'st_kasun',
        studentName: 'Kasun Bandara',
        content: 'Newton First Law: An object remains at rest unless acted upon by an external force. Force = mass * acceleration = 12kg * 2.5m/s^2 = 30 N.',
        submittedAt: new Date().toISOString(),
        status: 'submitted',
        isDraft: false,
      },
    ],
  },
  attendance: {
    'id_mtz4zcm9_xs77h8e': [
      {
        id: 'att_20261006_cls9a',
        schoolId: 'id_mtz4zcm9_xs77h8e',
        classId: 'cls_grade9a',
        className: 'Grade 9A',
        date: '2026-10-06',
        teacherId: 'tc_science',
        teacherName: 'Mr. Sivaneswaran',
        records: {
          'st_kasun': 'present',
          'st_vimal': 'present',
        },
        presentCount: 2,
        absentCount: 0,
        lateCount: 0,
        createdAt: new Date().toISOString(),
      },
    ],
  },
  results: {
    'id_mtz4zcm9_xs77h8e': [
      {
        id: 'res_kasun_science',
        schoolId: 'id_mtz4zcm9_xs77h8e',
        classId: 'cls_grade9a',
        studentId: 'st_kasun',
        studentName: 'Kasun Bandara',
        subject: 'Science',
        term: 'Term 1 Mid Exam',
        marks: 88,
        grade: 'A',
        feedback: 'Excellent grasp of kinematics and experimental diagrams.',
        teacherName: 'Mr. Sivaneswaran',
        createdAt: new Date().toISOString(),
      },
    ],
  },
  announcements: {
    'id_mtz4zcm9_xs77h8e': [
      {
        id: 'anc_welcome',
        schoolId: 'id_mtz4zcm9_xs77h8e',
        title: 'Welcome to JMC Classroom 2026 Academic Term',
        content: 'Welcome students, parents, and teachers to the live JMC Classroom digital learning portal. Term 1 schedules and assignments are now active.',
        authorId: 'admin',
        authorName: 'Mr. Pushparathanam (Principal)',
        authorRole: 'school',
        targetType: 'all',
        createdAt: new Date().toISOString(),
      },
    ],
  },
  auditLogs: {
    'id_mtz4zcm9_xs77h8e': [],
  },
  notes: {
    'id_mtz4zcm9_xs77h8e': [],
  },
  schoolApplications: {},
  applicationDocuments: {},
  workspaceConfig: {
    configured: false,
    primaryAccountEmail: 'info@jmcinnovator.cc.cd',
  },
};

function loadStore(): DataStore {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const data = JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
      return { ...defaultStore, ...data };
    }
  } catch (err) {
    console.error('Error reading store:', err);
  }
  return defaultStore;
}

function saveStore(store: DataStore) {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving store:', err);
  }
}

// Ensure initial store is saved
if (!fs.existsSync(STORE_PATH)) {
  saveStore(defaultStore);
}

// Schools list & create
app.get('/api/schools', (_req, res) => {
  const store = loadStore();
  res.json(Object.values(store.schools || {}));
});

app.post('/api/schools', (req, res) => {
  const store = loadStore();
  const school = req.body;
  if (!school.id) {
    school.id = 'sch_' + Date.now();
  }
  store.schools[school.id] = school;
  saveStore(store);
  res.json(school);
});

app.delete('/api/schools/:id', async (req, res) => {
  if (!(await isAuthorizedOperator(req))) {
    return res.status(403).json({ error: 'Unauthorized: Operator access required.' });
  }
  const { id } = req.params;
  const store = loadStore();
  if (store.schools && store.schools[id]) {
    delete store.schools[id];
    saveStore(store);
  }
  res.json({ success: true, id });
});

// Collection CRUD
app.get('/api/data/:schoolId/:collection', (req, res) => {
  const { schoolId, collection } = req.params;
  const store = loadStore();
  const bucket = (store as any)[collection] || {};
  const items = bucket[schoolId] || [];
  res.json(items);
});

app.post('/api/data/:schoolId/:collection', (req, res) => {
  const { schoolId, collection } = req.params;
  const store = loadStore();
  if (!(store as any)[collection]) {
    (store as any)[collection] = {};
  }
  if (!(store as any)[collection][schoolId]) {
    (store as any)[collection][schoolId] = [];
  }
  const item = req.body;
  const list: any[] = (store as any)[collection][schoolId];
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...item };
  } else {
    list.push(item);
  }
  saveStore(store);
  res.json(item);
});

app.delete('/api/data/:schoolId/:collection/:id', (req, res) => {
  const { schoolId, collection, id } = req.params;
  const store = loadStore();
  if ((store as any)[collection] && (store as any)[collection][schoolId]) {
    (store as any)[collection][schoolId] = (store as any)[collection][schoolId].filter((x: any) => x.id !== id);
    saveStore(store);
  }
  res.json({ success: true, id });
});

// -------------------------------------------------------------
// School Registration & Operator Approval API
// -------------------------------------------------------------
const OPERATOR_EMAILS = [
  'info@jmcinnovator.cc.cd',
  'jmc.class2027@gmail.com',
  'operator@jmc.internal',
  'operator@jmc.com',
];

function getFirebaseApiKey(): string {
  try {
    const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return cfg.apiKey || '';
    }
  } catch {}
  return process.env.VITE_FIREBASE_API_KEY || '';
}

async function isAuthorizedOperator(req: express.Request): Promise<boolean> {
  const authHeader = String(req.headers.authorization || '');
  if (authHeader.startsWith('Bearer ')) {
    const idToken = authHeader.slice(7).trim();
    const apiKey = getFirebaseApiKey();
    if (idToken && apiKey) {
      try {
        const verifyRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
          }
        );
        if (verifyRes.ok) {
          const data: any = await verifyRes.json();
          const fbUser = data?.users?.[0];
          const verifiedEmail = String(fbUser?.email || '').toLowerCase().trim();
          if (verifiedEmail && OPERATOR_EMAILS.includes(verifiedEmail)) {
            return true;
          }
          return false;
        }
      } catch (err) {
        console.warn('Firebase token verification warning:', err);
      }
    }
  }

  const actorRole = String(req.headers['x-actor-role'] || req.body?.actorRole || '').toLowerCase().trim();
  const actorEmail = String(
    req.headers['x-actor-email'] || req.body?.operatorEmail || req.body?.actorEmail || ''
  )
    .toLowerCase()
    .trim();

  if (actorRole === 'operator' && actorEmail && OPERATOR_EMAILS.includes(actorEmail)) {
    return true;
  }
  return false;
}

// 0. Google Workspace Configuration Storage (Non-secret Drive Folder & Sheet IDs)
app.get('/api/workspace/config', async (req, res) => {
  if (!(await isAuthorizedOperator(req))) {
    return res.status(403).json({ error: 'Unauthorized: Operator access required.' });
  }
  const store = loadStore();
  res.json(
    store.workspaceConfig || {
      configured: false,
      primaryAccountEmail: 'info@jmcinnovator.cc.cd',
    }
  );
});

app.post('/api/workspace/config', async (req, res) => {
  if (!(await isAuthorizedOperator(req))) {
    return res.status(403).json({ error: 'Unauthorized: Operator access required.' });
  }
  const store = loadStore();
  store.workspaceConfig = {
    ...(store.workspaceConfig || {}),
    ...(req.body || {}),
    primaryAccountEmail: 'info@jmcinnovator.cc.cd',
    updatedAt: new Date().toISOString(),
  };
  saveStore(store);
  res.json(store.workspaceConfig);
});

// 1. Submit School Application
app.post('/api/school-applications', async (req, res) => {
  try {
    const {
      schoolName,
      principalName,
      administratorName,
      administratorEmail,
      contactNumber,
      province,
      district,
      address,
      schoolType,
      website,
      additionalInfo,
      documentFile,
    } = req.body || {};

    // Validate required fields
    if (
      !schoolName?.trim() ||
      !administratorName?.trim() ||
      !administratorEmail?.trim() ||
      !contactNumber?.trim() ||
      !district?.trim() ||
      !address?.trim() ||
      !schoolType?.trim()
    ) {
      return res.status(400).json({ error: 'All required fields must be completed.' });
    }

    // Validate email format
    const cleanEmail = String(administratorEmail).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please enter a valid official school email address.' });
    }

    // Validate phone number (minimum 7 digits)
    const cleanPhone = String(contactNumber).trim();
    const digitsOnly = cleanPhone.replace(/[^0-9]/g, '');
    if (digitsOnly.length < 7) {
      return res.status(400).json({ error: 'Please enter a valid contact phone number with at least 7 digits.' });
    }

    const store = loadStore();
    if (!store.schoolApplications) {
      store.schoolApplications = {};
    }
    if (!store.applicationDocuments) {
      store.applicationDocuments = {};
    }

    // Check duplicate applications (prevent duplicate active or pending)
    const existing = Object.values(store.schoolApplications).find((app: any) => {
      const sameEmail = app.administratorEmail?.toLowerCase() === cleanEmail;
      const sameName = app.schoolName?.toLowerCase() === schoolName.trim().toLowerCase();
      return (sameEmail || sameName) && app.status !== 'REJECTED';
    });

    if (existing) {
      return res.status(409).json({
        error: `An application for "${schoolName.trim()}" or email "${cleanEmail}" is already ${existing.status.toLowerCase()} (ID: ${existing.id}).`,
        applicationId: existing.id,
      });
    }

    // Generate unique Registration ID: REG-2026-XXXXXX
    const year = new Date().getFullYear();
    const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const applicationId = `REG-${year}-${randomCode}`;
    const submissionDate = new Date().toISOString();

    let documentName = '';
    let documentMimeType = '';
    let documentSize = 0;
    let hasPendingDocumentUpload = false;
    let driveFileId = '';
    let driveFileUrl = '';

    if (documentFile?.base64Data && documentFile?.fileName) {
      documentName = String(documentFile.fileName).trim();
      documentMimeType = String(documentFile.mimeType || 'application/octet-stream');
      documentSize = Number(documentFile.size || 0);
      hasPendingDocumentUpload = true;
      store.applicationDocuments[applicationId] = {
        fileName: documentName,
        mimeType: documentMimeType,
        size: documentSize,
        base64Data: String(documentFile.base64Data),
      };
    }

    // Forward to Google Apps Script Web App if configured
    const appsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
    if (appsScriptUrl) {
      try {
        const scriptRes = await fetch(appsScriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'register',
            id: applicationId,
            schoolName: schoolName.trim(),
            principalName: (principalName || administratorName).trim(),
            administratorName: administratorName.trim(),
            administratorEmail: cleanEmail,
            contactNumber: cleanPhone,
            province: (province || 'Sri Lanka').trim(),
            district: district.trim(),
            address: address.trim(),
            schoolType: schoolType.trim(),
            website: (website || '').trim(),
            additionalInfo: (additionalInfo || '').trim(),
            submissionDate,
            ...(documentFile?.base64Data ? { documentFile } : {}),
          }),
        });
        if (scriptRes.ok) {
          const scriptJson: any = await scriptRes.json().catch(() => null);
          if (scriptJson?.driveFileUrl) {
            driveFileId = scriptJson.driveFileId || '';
            driveFileUrl = scriptJson.driveFileUrl;
            hasPendingDocumentUpload = false;
          }
        }
      } catch (scriptErr) {
        console.warn('Apps Script forward notice:', scriptErr);
      }
    }

    const application = {
      id: applicationId,
      schoolName: schoolName.trim(),
      principalName: (principalName || administratorName).trim(),
      administratorName: administratorName.trim(),
      administratorEmail: cleanEmail,
      contactNumber: cleanPhone,
      province: (province || 'Sri Lanka').trim(),
      district: district.trim(),
      address: address.trim(),
      schoolType: schoolType.trim(),
      website: (website || '').trim(),
      additionalInfo: (additionalInfo || '').trim(),
      ...(documentName ? { documentName, documentMimeType, documentSize, hasPendingDocumentUpload } : {}),
      ...(driveFileUrl ? { driveFileId, driveFileUrl } : {}),
      submissionDate,
      status: 'PENDING',
      operatorRemarks: '',
      createdAt: submissionDate,
    };

    store.schoolApplications[applicationId] = application;
    saveStore(store);

    res.status(201).json({
      success: true,
      message: 'Your school registration has been submitted successfully. Our administration team will review your application.',
      applicationId,
      status: 'PENDING',
      application,
    });
  } catch (err: any) {
    console.error('Error submitting application:', err);
    res.status(500).json({ error: err.message || 'Internal server error submitting application.' });
  }
});

// Retrieve pending uploaded supporting document for Drive sync (Operator Only)
app.get('/api/school-applications/:id/document', async (req, res) => {
  if (!(await isAuthorizedOperator(req))) {
    return res.status(403).json({ error: 'Unauthorized: Operator access required.' });
  }
  const store = loadStore();
  const docItem = store.applicationDocuments?.[req.params.id];
  if (!docItem) {
    return res.status(404).json({ error: 'No uploaded document found for this application.' });
  }
  res.json(docItem);
});

// 2. Retrieve School Applications for Operator
app.get('/api/school-applications', async (req, res) => {
  try {
    if (!(await isAuthorizedOperator(req))) {
      return res.status(403).json({ error: 'Unauthorized: Operator access required (info@jmcinnovator.cc.cd).' });
    }
    const store = loadStore();
    const applications = Object.values(store.schoolApplications || {}).sort((a: any, b: any) =>
      (b.submissionDate || '').localeCompare(a.submissionDate || '')
    );
    res.json(applications);
  } catch (err: any) {
    console.error('Error fetching applications:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch applications.' });
  }
});

// 3. Operator Approves School Application
app.post('/api/school-applications/:id/approve', async (req, res) => {
  try {
    if (!(await isAuthorizedOperator(req))) {
      return res.status(403).json({ error: 'Unauthorized: Operator access required (info@jmcinnovator.cc.cd).' });
    }

    const { id } = req.params;
    const store = loadStore();
    if (!store.schoolApplications) store.schoolApplications = {};
    let appRecord = store.schoolApplications[id];

    // Hydrate from Firestore-backed payload if backend store restarted cleanly
    if (!appRecord && req.body?.applicationData && req.body.applicationData.id === id) {
      appRecord = { ...req.body.applicationData };
    }

    if (!appRecord) {
      return res.status(404).json({ error: `Application ${id} not found.` });
    }

    if (appRecord.status !== 'PENDING') {
      return res.status(400).json({
        error: `Cannot approve application with status ${appRecord.status}. Only PENDING applications can be approved.`,
      });
    }

    const existingApprovedSchool = Object.values(store.schools || {}).find(
      (s: any) => s.applicationId === id
    );
    if (existingApprovedSchool) {
      return res.status(409).json({
        error: `Application ${id} has already created an active school (${(existingApprovedSchool as any).id}).`,
      });
    }

    // Generate unique School ID
    const cleanPrefix = appRecord.schoolName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase() || 'SCH';
    const schoolId = `SCH-${cleanPrefix}-${Date.now().toString(36).toUpperCase()}`;
    const approvalDate = new Date().toISOString();
    const operatorRemarks = req.body.operatorRemarks || 'Approved by Platform Operator';
    const approvedByEmail = String(req.body.operatorEmail || req.headers['x-actor-email'] || 'info@jmcinnovator.cc.cd').toLowerCase().trim();
    const approvedByName = String(req.body.operatorName || approvedByEmail);

    // 1. Update Application Record
    appRecord.status = 'APPROVED';
    appRecord.approvalDate = approvalDate;
    appRecord.approvedBy = approvedByName;
    appRecord.approvedByEmail = approvedByEmail;
    appRecord.schoolId = schoolId;
    appRecord.operatorRemarks = operatorRemarks;
    appRecord.updatedAt = approvalDate;
    store.schoolApplications[id] = appRecord;

    // 2. Create Active School Document
    const newSchool = {
      id: schoolId,
      name: appRecord.schoolName,
      schoolName: appRecord.schoolName,
      principalName: appRecord.principalName,
      administratorName: appRecord.administratorName,
      adminEmail: appRecord.administratorEmail,
      administratorEmail: appRecord.administratorEmail,
      phone: appRecord.contactNumber,
      contactNumber: appRecord.contactNumber,
      province: appRecord.province,
      district: appRecord.district,
      address: appRecord.address,
      schoolType: appRecord.schoolType,
      website: appRecord.website || '',
      status: 'ACTIVE',
      applicationId: id,
      approvedAt: approvalDate,
      approvedBy: approvedByEmail,
      createdAt: approvalDate,
      academicYear: '2026',
    };

    store.schools[schoolId] = newSchool;
    saveStore(store);

    // 3. Sync to Google Apps Script (Updates Google Sheet and sends Automatic Approval Email)
    const appsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
    if (appsScriptUrl) {
      try {
        await fetch(appsScriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'approveApplication',
            applicationId: id,
            schoolId,
            operatorRemarks,
            operatorEmail: approvedByEmail,
            operatorName: approvedByName,
          }),
        });
      } catch (scriptErr) {
        console.warn('Apps Script approve sync notice:', scriptErr);
      }
    }

    res.json({
      success: true,
      message: 'Application approved and school activated.',
      applicationId: id,
      schoolId,
      status: 'APPROVED',
      approvedAt: approvalDate,
      approvedBy: approvedByEmail,
      school: newSchool,
      application: appRecord,
    });
  } catch (err: any) {
    console.error('Error approving application:', err);
    res.status(500).json({ error: err.message || 'Failed to approve application.' });
  }
});

// 4. Operator Rejects School Application
app.post('/api/school-applications/:id/reject', async (req, res) => {
  try {
    if (!(await isAuthorizedOperator(req))) {
      return res.status(403).json({ error: 'Unauthorized: Operator access required (info@jmcinnovator.cc.cd).' });
    }

    const { id } = req.params;
    const store = loadStore();
    if (!store.schoolApplications) store.schoolApplications = {};
    let appRecord = store.schoolApplications[id];

    if (!appRecord && req.body?.applicationData && req.body.applicationData.id === id) {
      appRecord = { ...req.body.applicationData };
    }

    if (!appRecord) {
      return res.status(404).json({ error: `Application ${id} not found.` });
    }

    if (appRecord.status !== 'PENDING') {
      return res.status(400).json({
        error: `Cannot reject application with status ${appRecord.status}. Only PENDING applications can be rejected.`,
      });
    }

    const operatorRemarks = req.body.operatorRemarks || 'Application did not meet verification criteria.';
    const rejectionDate = new Date().toISOString();

    appRecord.status = 'REJECTED';
    appRecord.operatorRemarks = operatorRemarks;
    appRecord.updatedAt = rejectionDate;
    store.schoolApplications[id] = appRecord;
    saveStore(store);

    // Sync to Google Apps Script (Updates Google Sheet and sends Rejection Email)
    const appsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
    if (appsScriptUrl) {
      try {
        await fetch(appsScriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'rejectApplication',
            applicationId: id,
            operatorRemarks,
          }),
        });
      } catch (scriptErr) {
        console.warn('Apps Script reject sync notice:', scriptErr);
      }
    }

    res.json({
      success: true,
      message: 'Application rejected.',
      applicationId: id,
      status: 'REJECTED',
      operatorRemarks,
      application: appRecord,
    });
  } catch (err: any) {
    console.error('Error rejecting application:', err);
    res.status(500).json({ error: err.message || 'Failed to reject application.' });
  }
});

// Cloud Firestore real connection health check
app.get('/api/health/firestore', async (_req, res) => {
  const start = Date.now();
  let projectId = 'gen-lang-client-0883116641';
  let databaseId = 'ai-studio-jmcclass-20742766-c8cd-4030-95f3-22ca7c7d152d';
  try {
    const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (cfg.projectId) projectId = cfg.projectId;
      if (cfg.firestoreDatabaseId) databaseId = cfg.firestoreDatabaseId;
    }
    const firebaseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/schools`;
    const response = await fetch(firebaseUrl, { method: 'GET' });
    const latencyMs = Date.now() - start;
    res.json({
      connected: true,
      projectId,
      firestoreDatabaseId: databaseId,
      status: response.status === 200 || response.status === 403 || response.status === 404 ? 'online' : 'error',
      statusCode: response.status,
      latencyMs,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.json({
      connected: false,
      projectId,
      latencyMs: Date.now() - start,
      error: err.message,
    });
  }
});

// Mount Vite middleware in development mode
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve built static files
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`JMC Classroom server running at http://0.0.0.0:${port}`);
  });
}

startServer();
