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

    const { subject, grade, topic, taskType, instructions } = req.body || {};
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

    return res.status(200).json({ text: response.text });
  } catch (error) {
    console.error('Error in lesson-assistant:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate content',
    });
  }
}
