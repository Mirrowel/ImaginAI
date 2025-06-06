// src/config.ts
import { GoogleGenAI } from "@google/genai";

// API key is loaded from .env file via Vite's environment variable handling
// Vite exposes environment variables prefixed with VITE_ to client-side code
export const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
export const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;
