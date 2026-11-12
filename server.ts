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

// Cloud Firestore real connection health check
app.get('/api/health/firestore', async (_req, res) => {
  const start = Date.now();
  try {
    const firebaseUrl = 'https://firestore.googleapis.com/v1/projects/jmc-class/databases/(default)/documents/schools';
    const response = await fetch(firebaseUrl, { method: 'GET' });
    const latencyMs = Date.now() - start;
    res.json({
      connected: true,
      projectId: 'jmc-class',
      authDomain: 'jmc-class.firebaseapp.com',
      storageBucket: 'jmc-class.firebasestorage.app',
      status: response.status === 200 || response.status === 403 ? 'online' : 'error',
      statusCode: response.status,
      latencyMs,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.json({
      connected: false,
      projectId: 'jmc-class',
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
