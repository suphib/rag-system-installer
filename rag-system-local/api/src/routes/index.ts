import express from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import fs from 'fs';
import { RagService } from '../services/rag.service';
import { QdrantService } from '../services/qdrant.service';

const router = express.Router();
const upload = multer({ dest: '/tmp/uploads/' });
const ragService = new RagService();
const qdrantService = new QdrantService();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Upload and index PDF
router.post('/upload', upload.single('file'), async (req, res) => {
  const startTime = Date.now();

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, path, size } = req.file;

    if (!originalname.toLowerCase().endsWith('.pdf')) {
      fs.unlinkSync(path);
      return res.status(400).json({ error: 'Only PDF files are allowed' });
    }

    console.log(`Processing: ${originalname} (${size} bytes)`);

    const dataBuffer = fs.readFileSync(path);
    const pdfData = await pdfParse(dataBuffer);
    const content = pdfData.text;

    console.log(`Extracted ${content.length} chars from ${pdfData.numpages} pages`);

    // Create storage directory and save PDF permanently
    const storageDir = '/opt/rag-system/documents';
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    const storagePath = `${storageDir}/${originalname}`;
    fs.copyFileSync(path, storagePath);
    fs.unlinkSync(path); // Remove temp file

    const metadata = {
      uploadedAt: Date.now(),
      fileSize: size,
      pages: pdfData.numpages,
      contentLength: content.length,
      storagePath,
    };

    const chunks = await ragService.indexDocument(originalname, content, metadata);

    res.json({
      success: true,
      filename: originalname,
      chunks,
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

// View PDF in browser
router.get('/documents/:filename/view', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = `/opt/rag-system/documents/${filename}`;

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'PDF not found' });
    }

    res.contentType('application/pdf');
    res.sendFile(filePath);
  } catch (error: any) {
    console.error('View PDF error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Download PDF
router.get('/documents/:filename/download', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = `/opt/rag-system/documents/${filename}`;

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'PDF not found' });
    }

    res.download(filePath, filename);
  } catch (error: any) {
    console.error('Download PDF error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
