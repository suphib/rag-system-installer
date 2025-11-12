import mammoth from 'mammoth';

export class WordService {
  /**
   * Extract text from Word file for RAG indexing
   */
  async extractText(buffer: Buffer): Promise<string> {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  /**
   * Convert Word to HTML for browser preview
   */
  async convertToHTML(buffer: Buffer): Promise<string> {
    const result = await mammoth.convertToHtml({ buffer });
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
  async getMetadata(buffer: Buffer): Promise<any> {
    const result = await mammoth.extractRawText({ buffer });
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
