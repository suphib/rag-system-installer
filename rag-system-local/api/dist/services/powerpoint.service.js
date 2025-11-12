"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PowerPointService = void 0;
const officeparser_1 = __importDefault(require("officeparser"));
class PowerPointService {
    /**
     * Extract text from PowerPoint file for RAG indexing
     */
    async extractText(buffer) {
        return new Promise((resolve, reject) => {
            officeparser_1.default.parseOffice(buffer, (data, err) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(data);
                }
            });
        });
    }
    /**
     * Convert PowerPoint to HTML for browser preview
     */
    async convertToHTML(buffer) {
        const text = await this.extractText(buffer);
        const slides = text.split('\n\n').filter(s => s.trim());
        let html = '<style>body{font-family:Arial;max-width:800px;margin:40px auto;padding:20px}.slide{border:2px solid #ddd;padding:20px;margin:20px 0;border-radius:8px;background:#f9f9f9}.slide-number{background:#4CAF50;color:white;padding:5px 10px;border-radius:4px;display:inline-block;margin-bottom:10px}</style>';
        slides.forEach((slide, index) => {
            html += `<div class="slide"><div class="slide-number">Slide ${index + 1}</div><div>${slide.replace(/\n/g, '<br>')}</div></div>`;
        });
        return html;
    }
    /**
     * Get PowerPoint metadata
     */
    async getMetadata(buffer) {
        const text = await this.extractText(buffer);
        const slides = text.split('\n\n').filter(s => s.trim());
        return {
            slideCount: slides.length,
            totalText: text.length,
        };
    }
}
exports.PowerPointService = PowerPointService;
