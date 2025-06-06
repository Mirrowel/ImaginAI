
// src/utils.ts
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import type { Card } from './types';

export function generateId(): string {
  return `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Renamed from sanitizeHTML - this function escapes HTML special characters.
export function escapeHTML(str: string): string {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

// New function to sanitize HTML content (e.g., output from Markdown parser)
export function sanitizeAndRenderMarkdown(markdownText: string): string {
    if (typeof markdownText !== 'string') {
        markdownText = String(markdownText); // Ensure it's a string
    }
    try {
        // Configure DOMPurify to allow common Markdown elements.
        const dirtyHtml = marked.parse(markdownText) as string;
        const cleanHtml = DOMPurify.sanitize(dirtyHtml, {
            USE_PROFILES: { html: true },
            ADD_TAGS: ['ul', 'ol', 'li', 'p', 'strong', 'em', 'blockquote', 'code', 'pre', 'br', 'hr', 'a', 'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
            ADD_ATTR: ['href', 'title', 'alt', 'src', 'id'], // Allow id for heading links if any
            ALLOW_DATA_ATTR: false, // Disallow data-* attributes
        });
        return cleanHtml;
    } catch (e) {
        console.error("Error in sanitizeAndRenderMarkdown:", e);
        // Fallback to basic escaping if DOMPurify or marked fails
        return escapeHTML(markdownText).replace(/\n/g, '<br>');
    }
}


export function formatCardsForPrompt(cards: Card[]): string {
  if (!cards || cards.length === 0) return "No specific cards defined for this scenario.";

  const groupedCards = cards.reduce((acc, card) => {
    const typeKey = card.type.trim().toLowerCase() || 'misc'; // Handle empty or whitespace-only types, normalize
    if (!acc[typeKey]) {
      acc[typeKey] = [];
    }
    acc[typeKey].push(`- ${escapeHTML(card.name)}: ${escapeHTML(card.description)}`);
    return acc;
  }, {} as Record<string, string[]>);

  let promptText = "Relevant Cards:\n";
  for (const type in groupedCards) {
    promptText += `${escapeHTML(type.charAt(0).toUpperCase() + type.slice(1))}s:\n${groupedCards[type].join("\n")}\n`;
  }
  return promptText;
}
