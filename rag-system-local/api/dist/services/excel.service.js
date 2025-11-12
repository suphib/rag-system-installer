"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExcelService = void 0;
const XLSX = __importStar(require("xlsx"));
class ExcelService {
    /**
     * Extract text from Excel file for RAG indexing
     */
    async extractText(buffer) {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        let fullText = '';
        for (const sheetName of workbook.SheetNames) {
            fullText += `\n=== Sheet: ${sheetName} ===\n\n`;
            const sheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            data.forEach((row, index) => {
                if (row.length > 0) {
                    fullText += `Row ${index + 1}: ${row.join(' | ')}\n`;
                }
            });
        }
        return fullText;
    }
    /**
     * Convert Excel to HTML for browser preview
     */
    async convertToHTML(buffer) {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        let html = '<style>table{border-collapse:collapse;width:100%;margin:20px 0}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#4CAF50;color:white}</style>';
        for (const sheetName of workbook.SheetNames) {
            html += `<h2>Sheet: ${sheetName}</h2>`;
            const sheet = workbook.Sheets[sheetName];
            html += XLSX.utils.sheet_to_html(sheet);
        }
        return html;
    }
    /**
     * Get Excel metadata
     */
    async getMetadata(buffer) {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        let totalRows = 0;
        for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            totalRows += data.length;
        }
        return {
            sheets: workbook.SheetNames,
            sheetCount: workbook.SheetNames.length,
            totalRows,
        };
    }
}
exports.ExcelService = ExcelService;
