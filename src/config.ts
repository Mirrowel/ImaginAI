// src/config.ts
import { GoogleGenAI } from "@google/genai";

export const API_KEY = process.env.API_KEY;
export const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;
