"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WordService = void 0;
const mammoth_1 = __importDefault(require("mammoth"));
class WordService {
    /**
     * Extract text from Word file for RAG indexing
     */
    async extractText(buffer) {
        const result = await mammoth_1.default.extractRawText({ buffer });
        return result.value;
    }
    /**
     * Convert Word to HTML for browser preview
     */
    async convertToHTML(buffer) {
        const result = await mammoth_1.default.convertToHtml({ buffer });
        return `
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
        h1, h2, h3 { color: #333; }
        p { margin: 10px 0; }
      </style>
      ${result.value}
    `;
    }
    /**
     * Get Word metadata
     */
    async getMetadata(buffer) {
        const result = await mammoth_1.default.extractRawText({ buffer });
        const text = result.value;
        const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
        const paragraphs = text.split('\n').filter(p => p.trim().length > 0).length;
        return {
            wordCount,
            paragraphs,
            characters: text.length,
        };
    }
}
exports.WordService = WordService;
