import express from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import fs from 'fs';
import axios from 'axios';
import { RagService } from '../services/rag.service';
import { QdrantService } from '../services/qdrant.service';
import { ExcelService } from '../services/excel.service';
import { WordService } from '../services/word.service';
import { PowerPointService } from '../services/powerpoint.service';

const router = express.Router();
const upload = multer({ dest: '/tmp/uploads/' });
const ragService = new RagService();
const qdrantService = new QdrantService();
const excelService = new ExcelService();
const wordService = new WordService();
const pptService = new PowerPointService();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get current model and available models from Ollama
router.get('/model', async (req, res) => {
  try {
    const currentModel = ragService.getCurrentModel();

    // Fetch available models from Ollama
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    const response = await axios.get(`${ollamaUrl}/api/tags`);

    // Filter out embedding models and format for frontend
    const available = response.data.models
      .filter((m: any) => !m.name.includes('embed') && !m.name.includes('nomic'))
      .map((m: any) => ({
        value: m.name,
        label: formatModelName(m.name),
        size: m.size,
        modified: m.modified_at
      }));

    res.json({
      model: currentModel,
      available
    });
  } catch (error: any) {
    console.error('Get model error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Set model with validation
router.post('/model', async (req, res) => {
  try {
    const { model } = req.body;
    if (!model) {
      return res.status(400).json({ error: 'Model name is required' });
    }

    // Validate model exists in Ollama
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    const response = await axios.get(`${ollamaUrl}/api/tags`);
    const availableModels = response.data.models.map((m: any) => m.name);

    if (!availableModels.includes(model)) {
      return res.status(400).json({
        error: `Model '${model}' not found. Available models: ${availableModels.filter((m: string) => !m.includes('embed')).join(', ')}`
      });
    }

    console.log(`🔄 Switching model to: ${model}`);
    ragService.setModel(model);

    res.json({
      success: true,
      model,
      message: `Model switched to ${model}`
    });
  } catch (error: any) {
    console.error('Set model error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to format model names for display
function formatModelName(name: string): string {
  return name
    .replace('command-r:', 'Command R ')
    .replace('qwen2-math:', 'Qwen2 Math ')
    .replace('falcon3:', 'Falcon3 ')
    .replace('llama3.1:', 'Llama 3.1 ')
    .replace('mistral:', 'Mistral ')
    .replace('qwen2.5:', 'Qwen 2.5 ')
    .replace('phi3:', 'Phi3 ')
    .replace(':latest', '')
    .replace(':35b', '35B')
    .replace(':14b', '14B')
    .replace(':8b', '8B')
    .replace(':7b', '7B');
}

// Upload and index documents (PDF, Excel, Word, PowerPoint)
router.post('/upload', upload.single('file'), async (req, res) => {
  const startTime = Date.now();

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, path, size } = req.file;
    const ext = originalname.toLowerCase();

    // Validate file type
    const validExtensions = ['.pdf', '.xlsx', '.xls', '.docx', '.doc', '.pptx', '.ppt'];
    const isValid = validExtensions.some(validExt => ext.endsWith(validExt));

    if (!isValid) {
      fs.unlinkSync(path);
      return res.status(400).json({
        error: 'Invalid file type. Supported: PDF, Excel, Word, PowerPoint'
      });
    }

    console.log(`Processing: ${originalname} (${size} bytes)`);

    const dataBuffer = fs.readFileSync(path);
    let content = '';
    let metadata: any = {
      uploadedAt: Date.now(),
      fileSize: size,
    };

    // Extract text based on file type
    if (ext.endsWith('.pdf')) {
      const pdfData = await pdfParse(dataBuffer);
      content = pdfData.text;
      metadata.pages = pdfData.numpages;
      metadata.fileType = 'pdf';
    }
    else if (ext.endsWith('.xlsx') || ext.endsWith('.xls')) {
      content = await excelService.extractText(dataBuffer);
      const excelMeta = await excelService.getMetadata(dataBuffer);
      metadata = { ...metadata, ...excelMeta, fileType: 'excel' };
    }
    else if (ext.endsWith('.docx') || ext.endsWith('.doc')) {
      content = await wordService.extractText(dataBuffer);
      const wordMeta = await wordService.getMetadata(dataBuffer);
      metadata = { ...metadata, ...wordMeta, fileType: 'word' };
    }
    else if (ext.endsWith('.pptx') || ext.endsWith('.ppt')) {
      content = await pptService.extractText(dataBuffer);
      const pptMeta = await pptService.getMetadata(dataBuffer);
      metadata = { ...metadata, ...pptMeta, fileType: 'powerpoint' };
    }

    console.log(`Extracted ${content.length} characters`);

    // Save original file
    const storageDir = '/opt/rag-system/documents';
    const storagePath = `${storageDir}/${originalname}`;

    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    fs.copyFileSync(path, storagePath);
    fs.unlinkSync(path);

    metadata.contentLength = content.length;
    metadata.storagePath = storagePath;

    // Index document
    const chunks = await ragService.indexDocument(originalname, content, metadata);

    res.json({
      success: true,
      filename: originalname,
      chunks,
      fileType: metadata.fileType,
      processingTime: `${Date.now() - startTime}ms`,
      message: `Successfully indexed ${chunks} chunks`,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Chat endpoint
router.post('/chat', async (req, res) => {
  try {
    const { question, maxResults } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    console.log(`Question: ${question}`);

    const response = await ragService.chat({ question, maxResults });

    res.json(response);
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Chat streaming endpoint (Server-Sent Events)
router.post('/chat/stream', async (req, res) => {
  try {
    const { question, maxResults } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    console.log(`Streaming question: ${question}`);

    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Stream the response
    for await (const event of ragService.chatStream({ question, maxResults })) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    console.error('Stream error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', data: { error: error.message } })}\n\n`);
    res.end();
  }
});

// Get collection stats
router.get('/stats', async (req, res) => {
  try {
    const info = await qdrantService.getCollectionInfo();
    res.json(info);
  } catch (error: any) {
    console.error('Stats error:', error);
    res.status(500).json({ error: error.message });
  }
});


// Get list of documents
router.get("/documents", async (req, res) => {
  try {
    const documents = await qdrantService.getDocuments();
    res.json({ documents });
  } catch (error: any) {
    console.error("Documents error:", error);
    res.status(500).json({ error: error.message });
  }
});


router.delete("/documents/:filename", async (req, res) => {
  try {
    const { filename } = req.params;
    if (!filename) return res.status(400).json({ error: "Filename required" });
    console.log(`🗑️  Deleting: ${filename}`);
    const result = await qdrantService.deleteDocument(filename);
    console.log(`✅ Deleted ${result.deletedChunks} chunks`);
    res.json({ success: true, filename, deletedChunks: result.deletedChunks });
  } catch (error: any) {
    console.error("Delete error:", error);
    res.status(error.message === "Dokument nicht gefunden" ? 404 : 500).json({ error: error.message });
  }
});

router.delete("/documents", async (req, res) => {
  try {
    console.log("🗑️  Deleting ALL documents...");
    await qdrantService.deleteAllDocuments();
    console.log("✅ All deleted");
    res.json({ success: true, message: "All documents deleted" });
  } catch (error: any) {
    console.error("Delete all error:", error);
    res.status(500).json({ error: error.message });
  }
});

// View document in browser
router.get('/documents/:filename/view', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = `/opt/rag-system/documents/${filename}`;

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const ext = filename.toLowerCase();
    const buffer = fs.readFileSync(filePath);

    // PDF: Send as-is
    if (ext.endsWith('.pdf')) {
      res.contentType('application/pdf');
      return res.send(buffer);
    }

    // Office files: Convert to HTML preview
    let html = '';

    if (ext.endsWith('.xlsx') || ext.endsWith('.xls')) {
      html = await excelService.convertToHTML(buffer);
    }
    else if (ext.endsWith('.docx') || ext.endsWith('.doc')) {
      html = await wordService.convertToHTML(buffer);
    }
    else if (ext.endsWith('.pptx') || ext.endsWith('.ppt')) {
      html = await pptService.convertToHTML(buffer);
    }

    res.contentType('text/html');
    res.send(html);
  } catch (error: any) {
    console.error('View error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Download document
router.get('/documents/:filename/download', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = `/opt/rag-system/documents/${filename}`;

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const ext = filename.toLowerCase();
    let mimeType = 'application/octet-stream';

    if (ext.endsWith('.pdf')) mimeType = 'application/pdf';
    else if (ext.endsWith('.xlsx')) mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    else if (ext.endsWith('.xls')) mimeType = 'application/vnd.ms-excel';
    else if (ext.endsWith('.docx')) mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    else if (ext.endsWith('.doc')) mimeType = 'application/msword';
    else if (ext.endsWith('.pptx')) mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    else if (ext.endsWith('.ppt')) mimeType = 'application/vnd.ms-powerpoint';

    res.contentType(mimeType);
    res.download(filePath, filename);
  } catch (error: any) {
    console.error('Download error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
