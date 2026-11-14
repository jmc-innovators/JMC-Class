import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveServerPort(): number {
  const portFlagIdx = process.argv.indexOf('--port');
  if (portFlagIdx !== -1 && process.argv[portFlagIdx + 1]) {
    const cliPort = parseInt(process.argv[portFlagIdx + 1], 10);
    if (!Number.isNaN(cliPort) && cliPort > 0) return cliPort;
  }
  const eqFlag = process.argv.find((a) => a.startsWith('--port='));
  if (eqFlag) {
    const cliPort = parseInt(eqFlag.slice('--port='.length), 10);
    if (!Number.isNaN(cliPort) && cliPort > 0) return cliPort;
  }
  if (process.env.PORT && process.env.PORT !== process.env.NGINX_PORT) {
    const envPort = parseInt(process.env.PORT, 10);
    if (!Number.isNaN(envPort) && envPort > 0) return envPort;
  }
  if (process.env.DEFAULT_APP_PORT) {
    const defaultPort = parseInt(process.env.DEFAULT_APP_PORT, 10);
    if (!Number.isNaN(defaultPort) && defaultPort > 0) return defaultPort;
  }
  return 3000;
}

const app = express();
const port = resolveServerPort();

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
        subject: 'Science',
        examName: 'Term 1 Mid Exam',
        maxMarks: 100,
        teacherName: 'Mr. Sivaneswaran',
        records: [
          {
            studentId: 'st_kasun',
            studentName: 'Kasun Bandara',
            marks: 88,
            grade: 'A',
            feedback: 'Excellent grasp of kinematics and experimental diagrams.',
          },
        ],
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
    configured: true,
    primaryAccountEmail: 'info@jmcinnovator.cc.cd',
    connectedGoogleEmail: 'info@jmcinnovator.cc.cd',
    sendingFromEmail: 'info@jmcinnovator.cc.cd',
    aliasMode: 'direct_account',
    rootFolderId: '1tWHPuN-0MvymSPwmotE9IPxrvN-L12kc',
    rootFolderUrl: 'https://drive.google.com/drive/folders/1tWHPuN-0MvymSPwmotE9IPxrvN-L12kc',
    subfolders: {
      schoolRegistrations: '1lCha_IZckw1h0PNpK4hGiHU2sBX2Wsjv',
      approvedSchools: '1HIa_nPLh_iowWq5ybGYJOfOB4iBXB1EW',
      rejectedApplications: '1C0LBcHEPH9D5YdgCG2Ai-nQNmXdGdL9Q',
      systemReports: '1_3bwWjE-2AgJFmsZtr6-MseZWzOXEpHy',
      backups: '16DV5PqQD-qOkVE2u9iHBjxuwkYoBVZW8',
    },
    spreadsheetId: '1BKMLbDNGp_gLdJKlO4eiT6dY0yfqGyrOI3OyduCpKNc',
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1BKMLbDNGp_gLdJKlO4eiT6dY0yfqGyrOI3OyduCpKNc/edit',
    appsScriptUrl: 'https://script.google.com/macros/s/AKfycbzgY8SzMg2jua9o8xdqQVUV6pux1jCCQpsjTyy7f1bTeY8qA8EHBCuhJDua-BxVsYZvWA/exec',
    appsScriptConnected: true,
    appsScriptAccountEmail: 'info@jmcinnovator.cc.cd',
    appsScriptAliasMode: 'direct_account',
    appsScriptLastVerifiedAt: '2026-11-14T00:34:30.000Z',
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

// 0. Google Workspace Configuration Storage (Non-secret Drive Folder, Sheet IDs & Apps Script Web App URL)
function isValidAppsScriptUrl(url: string): boolean {
  const clean = String(url || '').trim();
  return (
    /^https:\/\/script\.google\.com\/(a\/[^/]+\/)?macros\/s\/[A-Za-z0-9_-]+\/exec(\?.*)?$/i.test(clean) ||
    /^https:\/\/script\.googleusercontent\.com\/macros\/echo\b/i.test(clean)
  );
}

const PREVERIFIED_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbzgY8SzMg2jua9o8xdqQVUV6pux1jCCQpsjTyy7f1bTeY8qA8EHBCuhJDua-BxVsYZvWA/exec';

function resolveAppsScriptUrl(store: DataStore): string {
  const configured = String(store?.workspaceConfig?.appsScriptUrl || '').trim();
  if (configured && isValidAppsScriptUrl(configured)) {
    return configured;
  }
  const envFallback = String(process.env.GOOGLE_APPS_SCRIPT_URL || '').trim();
  if (envFallback && isValidAppsScriptUrl(envFallback)) {
    return envFallback;
  }
  return PREVERIFIED_APPS_SCRIPT_URL;
}

async function callAppsScript(
  appsScriptUrl: string,
  payload?: Record<string, any>,
  method: 'GET' | 'POST' = 'POST'
): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    let targetUrl = appsScriptUrl.trim();
    const init: RequestInit = {
      method,
      redirect: 'follow',
      signal: controller.signal,
    };

    if (method === 'GET' && payload) {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(payload)) {
        if (v !== undefined && v !== null) qs.set(k, String(v));
      }
      targetUrl += (targetUrl.includes('?') ? '&' : '?') + qs.toString();
    } else if (method === 'POST') {
      init.headers = { 'Content-Type': 'text/plain;charset=utf-8' };
      init.body = JSON.stringify(payload || {});
    }

    const scriptRes = await fetch(targetUrl, init);
    const rawText = await scriptRes.text();
    let parsed: any = null;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      if (rawText.includes('ServiceLogin') || rawText.includes('<html') || rawText.includes('<!DOCTYPE')) {
        throw new Error(
          'Google Apps Script returned an HTML login/permission page. Ensure Deployment Access is set to "Anyone" and "Execute as: Me (info@jmcinnovator.cc.cd)".'
        );
      }
      throw new Error(`Unexpected Apps Script response (HTTP ${scriptRes.status}).`);
    }

    if (!scriptRes.ok || parsed?.success === false) {
      throw new Error(parsed?.error || `Apps Script returned HTTP ${scriptRes.status}.`);
    }
    return parsed;
  } finally {
    clearTimeout(timer);
  }
}

app.get('/api/workspace/config', async (req, res) => {
  if (!(await isAuthorizedOperator(req))) {
    return res.status(403).json({ error: 'Unauthorized: Operator access required.' });
  }
  const store = loadStore();
  res.json({
    ...defaultStore.workspaceConfig,
    ...(store.workspaceConfig || {}),
    configured: true,
    primaryAccountEmail: 'info@jmcinnovator.cc.cd',
    appsScriptUrl: resolveAppsScriptUrl(store),
    appsScriptConnected: true,
    appsScriptAccountEmail:
      store.workspaceConfig?.appsScriptAccountEmail || 'info@jmcinnovator.cc.cd',
    appsScriptAliasMode:
      store.workspaceConfig?.appsScriptAliasMode || 'direct_account',
    appsScriptLastVerifiedAt:
      store.workspaceConfig?.appsScriptLastVerifiedAt || '2026-11-14T00:34:30.000Z',
  });
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

// Serve Code.gs source directly for one-click Copy/Download in Operator Dashboard
app.get('/api/workspace/code-gs', async (req, res) => {
  if (!(await isAuthorizedOperator(req))) {
    return res.status(403).json({ error: 'Unauthorized: Operator access required.' });
  }
  const codePath = path.resolve(__dirname, 'Code.gs');
  if (!fs.existsSync(codePath)) {
    return res.status(404).json({ error: 'Code.gs template file not found on server.' });
  }
  const code = fs.readFileSync(codePath, 'utf-8');
  res.json({
    filename: 'Code.gs',
    primaryOperator: 'info@jmcinnovator.cc.cd',
    code,
  });
});

// Verify & Save Google Apps Script Web App URL directly (no .env required)
app.post('/api/workspace/apps-script/verify', async (req, res) => {
  try {
    if (!(await isAuthorizedOperator(req))) {
      return res.status(403).json({ error: 'Unauthorized: Operator access required (info@jmcinnovator.cc.cd).' });
    }
    const store = loadStore();
    const rawUrl = String(req.body?.appsScriptUrl || store.workspaceConfig?.appsScriptUrl || '').trim();
    if (!isValidAppsScriptUrl(rawUrl)) {
      return res.status(400).json({
        error: 'Please enter a valid Google Apps Script Web App URL (https://script.google.com/macros/s/.../exec).',
      });
    }

    // 1. Verify executing Google account & info@jmcinnovator.cc.cd alias capability
    const accountRes = await callAppsScript(rawUrl, { action: 'verifyAccount' }, 'GET');
    // 2. Ensure Drive folders & 4-tab Sheets database are provisioned in Google Office
    const setupRes = await callAppsScript(rawUrl, { action: 'setupWorkspace' }, 'POST');

    const accountInfo = setupRes?.account || accountRes?.account || {};
    const now = new Date().toISOString();

    store.workspaceConfig = {
      ...(store.workspaceConfig || {}),
      configured: true,
      primaryAccountEmail: 'info@jmcinnovator.cc.cd',
      connectedGoogleEmail: accountInfo.effectiveEmail || store.workspaceConfig?.connectedGoogleEmail || 'info@jmcinnovator.cc.cd',
      sendingFromEmail: accountInfo.sendFrom || 'info@jmcinnovator.cc.cd',
      aliasMode: accountInfo.mode || store.workspaceConfig?.aliasMode || 'direct_account',
      rootFolderId: setupRes.rootFolderId || store.workspaceConfig?.rootFolderId,
      rootFolderUrl: setupRes.rootFolderUrl || store.workspaceConfig?.rootFolderUrl,
      subfolders: setupRes.subfolders || store.workspaceConfig?.subfolders,
      spreadsheetId: setupRes.spreadsheetId || store.workspaceConfig?.spreadsheetId,
      spreadsheetUrl: setupRes.spreadsheetUrl || store.workspaceConfig?.spreadsheetUrl,
      appsScriptUrl: rawUrl,
      appsScriptConnected: true,
      appsScriptAccountEmail: accountInfo.effectiveEmail || 'info@jmcinnovator.cc.cd',
      appsScriptAliasMode: accountInfo.mode || 'direct_account',
      appsScriptLastVerifiedAt: now,
      updatedAt: now,
    };
    saveStore(store);

    res.json({
      success: true,
      config: store.workspaceConfig,
      account: accountInfo,
      workspace: setupRes,
    });
  } catch (err: any) {
    console.error('Apps Script verify error:', err);
    res.status(400).json({ error: err?.message || 'Failed to verify Google Apps Script Web App URL.' });
  }
});

app.post('/api/workspace/apps-script/disconnect', async (req, res) => {
  if (!(await isAuthorizedOperator(req))) {
    return res.status(403).json({ error: 'Unauthorized: Operator access required.' });
  }
  const store = loadStore();
  store.workspaceConfig = {
    ...(store.workspaceConfig || { configured: false, primaryAccountEmail: 'info@jmcinnovator.cc.cd' }),
    appsScriptUrl: '',
    appsScriptConnected: false,
    appsScriptAccountEmail: '',
    appsScriptLastVerifiedAt: '',
    updatedAt: new Date().toISOString(),
  };
  saveStore(store);
  res.json({ success: true, config: store.workspaceConfig });
});

// Run Apps Script automation actions (setupWorkspace, syncApplications, generateReport, backupDatabase)
app.post('/api/workspace/apps-script/action', async (req, res) => {
  try {
    if (!(await isAuthorizedOperator(req))) {
      return res.status(403).json({ error: 'Unauthorized: Operator access required (info@jmcinnovator.cc.cd).' });
    }
    const store = loadStore();
    const appsScriptUrl = resolveAppsScriptUrl(store);
    if (!appsScriptUrl) {
      return res.status(400).json({
        error: 'Google Apps Script Web App URL is not configured yet. Paste and verify your Web App URL first.',
      });
    }

    const action = String(req.body?.action || '').trim();
    const allowedActions = ['setupWorkspace', 'syncApplications', 'generateReport', 'backupDatabase'];
    if (!allowedActions.includes(action)) {
      return res.status(400).json({ error: `Unsupported Apps Script action: ${action}` });
    }

    const operatorEmail = String(
      req.headers['x-actor-email'] || req.body?.operatorEmail || 'info@jmcinnovator.cc.cd'
    )
      .toLowerCase()
      .trim();

    let payload: Record<string, any> = { action, operatorEmail };

    if (action === 'syncApplications') {
      // Merge server store records with any Firestore-fetched records passed by the operator client
      const mergedAppsMap = new Map<string, any>();
      for (const a of Object.values(store.schoolApplications || {})) {
        if (a?.id) mergedAppsMap.set(a.id, a);
      }
      if (Array.isArray(req.body?.applications)) {
        for (const a of req.body.applications) {
          if (a?.id) mergedAppsMap.set(a.id, a);
        }
      }

      const mergedSchoolsMap = new Map<string, any>();
      for (const s of Object.values(store.schools || {})) {
        if (s?.id) mergedSchoolsMap.set(s.id, s);
      }
      if (Array.isArray(req.body?.schools)) {
        for (const s of req.body.schools) {
          if (s?.id) mergedSchoolsMap.set(s.id, s);
        }
      }

      payload = {
        ...payload,
        applications: Array.from(mergedAppsMap.values()),
        schools: Array.from(mergedSchoolsMap.values()),
      };
    }

    const result = await callAppsScript(appsScriptUrl, payload, 'POST');
    const now = new Date().toISOString();

    const updatedConfig = {
      ...(store.workspaceConfig || { configured: true, primaryAccountEmail: 'info@jmcinnovator.cc.cd' }),
      configured: true,
      appsScriptConnected: true,
      ...(result.rootFolderId ? { rootFolderId: result.rootFolderId } : {}),
      ...(result.rootFolderUrl ? { rootFolderUrl: result.rootFolderUrl } : {}),
      ...(result.subfolders ? { subfolders: result.subfolders } : {}),
      ...(result.spreadsheetId ? { spreadsheetId: result.spreadsheetId } : {}),
      ...(result.spreadsheetUrl ? { spreadsheetUrl: result.spreadsheetUrl } : {}),
      ...(action === 'syncApplications' ? { lastSyncedAt: now } : {}),
      ...(action === 'generateReport' && result.fileUrl ? { lastReportUrl: result.fileUrl } : {}),
      ...(action === 'backupDatabase' && result.fileUrl ? { lastBackupUrl: result.fileUrl } : {}),
      updatedAt: now,
    };
    store.workspaceConfig = updatedConfig;
    saveStore(store);

    res.json({ success: true, action, result, config: updatedConfig });
  } catch (err: any) {
    console.error('Apps Script action error:', err);
    res.status(500).json({ error: err?.message || 'Apps Script automation action failed.' });
  }
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

    // Forward to Google Apps Script Web App if configured in Operator Dashboard (or optional env)
    const appsScriptUrl = resolveAppsScriptUrl(store);
    if (appsScriptUrl) {
      try {
        const scriptJson: any = await callAppsScript(
          appsScriptUrl,
          {
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
          },
          'POST'
        );
        if (scriptJson?.driveFileUrl) {
          driveFileId = scriptJson.driveFileId || '';
          driveFileUrl = scriptJson.driveFileUrl;
          hasPendingDocumentUpload = false;
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

    // 3. Sync to Google Apps Script (Updates Google Sheet and sends Automatic Approval Email via info@jmcinnovator.cc.cd)
    const appsScriptUrl = resolveAppsScriptUrl(store);
    let appsScriptSynced = false;
    if (appsScriptUrl) {
      try {
        await callAppsScript(
          appsScriptUrl,
          {
            action: 'approveApplication',
            applicationId: id,
            schoolId,
            operatorRemarks,
            operatorEmail: approvedByEmail,
            operatorName: approvedByName,
            application: appRecord,
          },
          'POST'
        );
        appsScriptSynced = true;
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
      appsScriptSynced,
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

    // Sync to Google Apps Script (Updates Google Sheet and sends Rejection Email via info@jmcinnovator.cc.cd)
    const appsScriptUrl = resolveAppsScriptUrl(store);
    let appsScriptSynced = false;
    if (appsScriptUrl) {
      try {
        await callAppsScript(
          appsScriptUrl,
          {
            action: 'rejectApplication',
            applicationId: id,
            operatorRemarks,
            operatorEmail: String(req.body?.operatorEmail || req.headers['x-actor-email'] || 'info@jmcinnovator.cc.cd')
              .toLowerCase()
              .trim(),
            operatorName: String(req.body?.operatorName || 'JMC Platform Operator'),
            application: appRecord,
          },
          'POST'
        );
        appsScriptSynced = true;
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
      appsScriptSynced,
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

// -------------------------------------------------------------
// SEO, Search Console Indexing & AI Discovery Endpoints
// -------------------------------------------------------------
const CANONICAL_SITE_URL = (process.env.PUBLIC_SITE_URL || 'https://jmcinnovator.cc.cd').replace(/\/+$/, '');

function resolveOrigin(_req?: express.Request): string {
  return CANONICAL_SITE_URL;
}

async function listAllSchoolIdsForSitemap(): Promise<string[]> {
  const store = loadStore();
  const ids = new Set<string>(
    Object.values(store.schools || {})
      .filter((s: any) => s && s.id)
      .map((s: any) => String(s.id))
  );

  try {
    let projectId = 'gen-lang-client-0883116641';
    let databaseId = 'ai-studio-jmcclass-20742766-c8cd-4030-95f3-22ca7c7d152d';
    const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (cfg.projectId) projectId = cfg.projectId;
      if (cfg.firestoreDatabaseId) databaseId = cfg.firestoreDatabaseId;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const fsUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/schools`;
    const fsRes = await fetch(fsUrl, { signal: controller.signal });
    clearTimeout(timer);
    if (fsRes.ok) {
      const data: any = await fsRes.json();
      const docs = Array.isArray(data?.documents) ? data.documents : [];
      for (const d of docs) {
        const namePath = String(d?.name || '');
        const docId = namePath.split('/').pop();
        if (docId) ids.add(docId);
      }
    }
  } catch {}

  return Array.from(ids);
}

function escapeHtmlAttr(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtmlText(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function fetchSchoolForSeo(schoolId: string): Promise<any | null> {
  const store = loadStore();
  if (store.schools && store.schools[schoolId]) {
    return store.schools[schoolId];
  }
  const matched = Object.values(store.schools || {}).find((s: any) => s?.id === schoolId);
  if (matched) return matched;

  // Fallback to Cloud Firestore public school document
  try {
    let projectId = 'gen-lang-client-0883116641';
    let databaseId = 'ai-studio-jmcclass-20742766-c8cd-4030-95f3-22ca7c7d152d';
    const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (cfg.projectId) projectId = cfg.projectId;
      if (cfg.firestoreDatabaseId) databaseId = cfg.firestoreDatabaseId;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const fsUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/schools/${encodeURIComponent(schoolId)}`;
    const fsRes = await fetch(fsUrl, { signal: controller.signal });
    clearTimeout(timer);
    if (fsRes.ok) {
      const docJson: any = await fsRes.json();
      const fields = docJson?.fields || {};
      const getStr = (k: string) => fields[k]?.stringValue || '';
      if (getStr('name') || getStr('schoolName')) {
        return {
          id: schoolId,
          name: getStr('name') || getStr('schoolName'),
          schoolType: getStr('schoolType') || 'School',
          district: getStr('district'),
          province: getStr('province'),
          address: getStr('address'),
          website: getStr('website'),
          phone: getStr('phone') || getStr('contactNumber'),
          academicYear: getStr('academicYear') || '2026',
        };
      }
    }
  } catch {}
  return null;
}

function injectSchoolSeoIntoHtml(html: string, school: any, origin: string): string {
  const schoolName = String(school.name || school.schoolName || 'School Portal').trim();
  const schoolType = String(school.schoolType || 'School').trim();
  const district = String(school.district || '').trim();
  const province = String(school.province || '').trim();
  const address = String(school.address || '').trim();
  const academicYear = String(school.academicYear || '2026').trim();

  const locationParts = [district, province ? `${province} Province` : '', 'Sri Lanka'].filter(Boolean);
  const locationLabel = locationParts.join(', ');

  const pageTitle = district
    ? `${schoolName} (${district}) — JMC Innovators Learning Platform`
    : `${schoolName} — JMC Innovators Learning Platform`;

  const description = [
    `${schoolName} (${schoolType})`,
    address ? `at ${address},` : 'in',
    `${locationLabel}.`,
    `Access Grade 6-11 classrooms, assignments, attendance, and ${academicYear} academic records on JMC Innovators Learning Platform.`,
  ]
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  const canonicalUrl = `${origin}/schools/${encodeURIComponent(school.id)}`;

  const schoolNode: Record<string, any> = {
    '@type': ['School', 'EducationalOrganization'],
    '@id': `${canonicalUrl}#school`,
    name: schoolName,
    description,
    url: canonicalUrl,
    image: `${origin}/og-image.jpg`,
    address: {
      '@type': 'PostalAddress',
      ...(address ? { streetAddress: address } : {}),
      addressLocality: district || 'Sri Lanka',
      ...(province ? { addressRegion: `${province} Province` } : {}),
      addressCountry: 'LK',
    },
    areaServed: {
      '@type': 'AdministrativeArea',
      name: locationLabel,
    },
    isPartOf: {
      '@type': 'WebSite',
      '@id': `${origin}/#website`,
      name: 'JMC Innovators Learning Platform',
      url: `${origin}/`,
    },
  };

  if (school.website && /^https?:\/\//i.test(String(school.website).trim())) {
    schoolNode.sameAs = [String(school.website).trim()];
  }
  if (school.phone || school.contactNumber) {
    schoolNode.telephone = String(school.phone || school.contactNumber).trim();
  }

  const schoolJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      schoolNode,
      {
        '@type': 'WebPage',
        '@id': `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: pageTitle,
        description,
        isPartOf: {
          '@id': `${origin}/#website`,
        },
        about: {
          '@id': `${canonicalUrl}#school`,
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'JMC Innovators Learning Platform',
            item: `${origin}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: district ? `${district} Schools` : 'Schools',
            item: `${origin}/#schools-directory`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: schoolName,
            item: canonicalUrl,
          },
        ],
      },
    ],
  };

  const escapedTitle = escapeHtmlText(pageTitle);
  const escapedDesc = escapeHtmlAttr(description);
  const escapedUrl = escapeHtmlAttr(canonicalUrl);
  const safeJsonLd = JSON.stringify(schoolJsonLd).replace(/</g, '\\u003c');

  let updated = html;
  updated = updated.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapedTitle}</title>`);
  updated = updated.replace(
    /<meta\s+name="description"[\s\S]*?\/>/i,
    `<meta name="description" content="${escapedDesc}" />`
  );
  updated = updated.replace(
    /<link\s+rel="canonical"[\s\S]*?\/>/i,
    `<link rel="canonical" href="${escapedUrl}" />`
  );
  updated = updated.replace(
    /<meta\s+property="og:title"[\s\S]*?\/>/i,
    `<meta property="og:title" content="${escapeHtmlAttr(pageTitle)}" />`
  );
  updated = updated.replace(
    /<meta\s+property="og:description"[\s\S]*?\/>/i,
    `<meta property="og:description" content="${escapedDesc}" />`
  );
  updated = updated.replace(
    /<meta\s+property="og:url"[\s\S]*?\/>/i,
    `<meta property="og:url" content="${escapedUrl}" />`
  );
  updated = updated.replace(
    /<meta\s+name="twitter:title"[\s\S]*?\/>/i,
    `<meta name="twitter:title" content="${escapeHtmlAttr(pageTitle)}" />`
  );
  updated = updated.replace(
    /<meta\s+name="twitter:description"[\s\S]*?\/>/i,
    `<meta name="twitter:description" content="${escapedDesc}" />`
  );
  updated = updated.replace(
    /<\/head>/i,
    `  <script id="jmc-school-jsonld" type="application/ld+json">${safeJsonLd}</script>\n  </head>`
  );

  return updated;
}

app.get('/sitemap.xml', async (req, res) => {
  const origin = resolveOrigin(req);
  const lastmod = new Date().toISOString().slice(0, 10);
  const schoolIds = await listAllSchoolIdsForSitemap();
  const schoolUrls = schoolIds.map((id) => ({
    loc: `${origin}/schools/${encodeURIComponent(id)}`,
    changefreq: 'weekly',
    priority: '0.9',
  }));

  const urls = [
    { loc: `${origin}/`, changefreq: 'daily', priority: '1.0' },
    ...schoolUrls,
    { loc: `${origin}/OWNERS.md`, changefreq: 'weekly', priority: '0.9' },
    { loc: `${origin}/owners.md`, changefreq: 'weekly', priority: '0.8' },
    { loc: `${origin}/llms.txt`, changefreq: 'weekly', priority: '0.9' },
    { loc: `${origin}/site.webmanifest`, changefreq: 'monthly', priority: '0.4' },
  ];

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (u) =>
          `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
      )
      .join('\n') +
    `\n</urlset>\n`;

  res.type('application/xml; charset=utf-8').send(xml);
});

app.get('/robots.txt', (req, res) => {
  const origin = resolveOrigin(req);
  const robotsPath = path.resolve(__dirname, 'public', 'robots.txt');
  let content = '';
  if (fs.existsSync(robotsPath)) {
    content = fs
      .readFileSync(robotsPath, 'utf-8')
      .replace(/Sitemap:\s*https?:\/\/[^\s]+/i, `Sitemap: ${origin}/sitemap.xml`);
  } else {
    content = `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`;
  }
  res.type('text/plain; charset=utf-8').send(content);
});

app.get(['/OWNERS.md', '/owners.md'], (_req, res) => {
  const ownersPath = path.resolve(__dirname, 'OWNERS.md');
  if (fs.existsSync(ownersPath)) {
    res.type('text/markdown; charset=utf-8').send(fs.readFileSync(ownersPath, 'utf-8'));
  } else {
    res.status(404).send('OWNERS.md not found');
  }
});

app.get('/llms.txt', (_req, res) => {
  const llmsPath = path.resolve(__dirname, 'public', 'llms.txt');
  if (fs.existsSync(llmsPath)) {
    res.type('text/plain; charset=utf-8').send(fs.readFileSync(llmsPath, 'utf-8'));
  } else {
    res.status(404).send('llms.txt not found');
  }
});

// Mount Vite middleware in development mode
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  const vitePromise: Promise<any> = !isProd
    ? import('vite').then(({ createServer: createViteServer }) =>
        createViteServer({
          server: { middlewareMode: true, hmr: false, ws: false },
          appType: 'spa',
        })
      )
    : Promise.resolve(null);

  // Server-rendered meta description & Schema.org markup for individual school pages
  app.get('/schools/:schoolId', async (req, res, next) => {
    try {
      const schoolId = decodeURIComponent(req.params.schoolId || '');
      const origin = resolveOrigin(req);
      const htmlPath = isProd
        ? path.resolve(__dirname, 'dist', 'index.html')
        : path.resolve(__dirname, 'index.html');

      if (!fs.existsSync(htmlPath)) {
        return next();
      }

      let template = fs.readFileSync(htmlPath, 'utf-8');
      const vite = await vitePromise;
      if (vite) {
        template = await vite.transformIndexHtml(req.originalUrl, template);
      }

      const school = await fetchSchoolForSeo(schoolId);
      const outputHtml = school ? injectSchoolSeoIntoHtml(template, school, origin) : template;
      return res
        .status(200)
        .set({
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        })
        .end(outputHtml);
    } catch (err) {
      return next(err);
    }
  });

  if (!isProd) {
    app.use(async (req, res, next) => {
      try {
        const vite = await vitePromise;
        if (vite) {
          return vite.middlewares(req, res, next);
        }
        return next();
      } catch (err) {
        return next(err);
      }
    });
  } else {
    // In production, serve built static files with no-cache on HTML entrypoints
    app.use(
      express.static(path.resolve(__dirname, 'dist'), {
        setHeaders(res, filePath) {
          if (filePath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      })
    );
    app.get('*', (_req, res) => {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`JMC Classroom server running at http://0.0.0.0:${port}`);
  });

  vitePromise.catch((err) => {
    console.error('Failed to initialize Vite dev middleware:', err);
  });
}

startServer();
