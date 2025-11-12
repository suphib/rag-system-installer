import * as XLSX from 'xlsx';

export class ExcelService {
  /**
   * Extract text from Excel file for RAG indexing
   */
  async extractText(buffer: Buffer): Promise<string> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    let fullText = '';

    for (const sheetName of workbook.SheetNames) {
      fullText += `\n=== Sheet: ${sheetName} ===\n\n`;
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      data.forEach((row: any, index: number) => {
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
  async convertToHTML(buffer: Buffer): Promise<string> {
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
  async getMetadata(buffer: Buffer): Promise<any> {
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
