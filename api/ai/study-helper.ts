import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: 'Gemini API key is not configured. Please set GEMINI_API_KEY in Vercel Project Settings.',
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const { question, subject, grade } = req.body || {};
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

    return res.status(200).json({ text: response.text });
  } catch (error) {
    console.error('Error in study-helper:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to answer question',
    });
  }
}
