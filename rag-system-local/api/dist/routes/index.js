"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const fs_1 = __importDefault(require("fs"));
const rag_service_1 = require("../services/rag.service");
const qdrant_service_1 = require("../services/qdrant.service");
const excel_service_1 = require("../services/excel.service");
const word_service_1 = require("../services/word.service");
const powerpoint_service_1 = require("../services/powerpoint.service");
const router = express_1.default.Router();
const upload = (0, multer_1.default)({ dest: '/tmp/uploads/' });
const ragService = new rag_service_1.RagService();
const qdrantService = new qdrant_service_1.QdrantService();
const excelService = new excel_service_1.ExcelService();
const wordService = new word_service_1.WordService();
const pptService = new powerpoint_service_1.PowerPointService();
// Health check
router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
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
            fs_1.default.unlinkSync(path);
            return res.status(400).json({
                error: 'Invalid file type. Supported: PDF, Excel, Word, PowerPoint'
            });
        }
        console.log(`Processing: ${originalname} (${size} bytes)`);
        const dataBuffer = fs_1.default.readFileSync(path);
        let content = '';
        let metadata = {
            uploadedAt: Date.now(),
            fileSize: size,
        };
        // Extract text based on file type
        if (ext.endsWith('.pdf')) {
            const pdfData = await (0, pdf_parse_1.default)(dataBuffer);
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
        if (!fs_1.default.existsSync(storageDir)) {
            fs_1.default.mkdirSync(storageDir, { recursive: true });
        }
        fs_1.default.copyFileSync(path, storagePath);
        fs_1.default.unlinkSync(path);
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
    }
    catch (error) {
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
    }
    catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Get collection stats
router.get('/stats', async (req, res) => {
    try {
        const info = await qdrantService.getCollectionInfo();
        res.json(info);
    }
    catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Get list of documents
router.get("/documents", async (req, res) => {
    try {
        const documents = await qdrantService.getDocuments();
        res.json({ documents });
    }
    catch (error) {
        console.error("Documents error:", error);
        res.status(500).json({ error: error.message });
    }
});
router.delete("/documents/:filename", async (req, res) => {
    try {
        const { filename } = req.params;
        if (!filename)
            return res.status(400).json({ error: "Filename required" });
        console.log(`🗑️  Deleting: ${filename}`);
        const result = await qdrantService.deleteDocument(filename);
        console.log(`✅ Deleted ${result.deletedChunks} chunks`);
        res.json({ success: true, filename, deletedChunks: result.deletedChunks });
    }
    catch (error) {
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
    }
    catch (error) {
        console.error("Delete all error:", error);
        res.status(500).json({ error: error.message });
    }
});
// View document in browser
router.get('/documents/:filename/view', async (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = `/opt/rag-system/documents/${filename}`;
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }
        const ext = filename.toLowerCase();
        const buffer = fs_1.default.readFileSync(filePath);
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
    }
    catch (error) {
        console.error('View error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Download document
router.get('/documents/:filename/download', async (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = `/opt/rag-system/documents/${filename}`;
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }
        const ext = filename.toLowerCase();
        let mimeType = 'application/octet-stream';
        if (ext.endsWith('.pdf'))
            mimeType = 'application/pdf';
        else if (ext.endsWith('.xlsx'))
            mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        else if (ext.endsWith('.xls'))
            mimeType = 'application/vnd.ms-excel';
        else if (ext.endsWith('.docx'))
            mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        else if (ext.endsWith('.doc'))
            mimeType = 'application/msword';
        else if (ext.endsWith('.pptx'))
            mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        else if (ext.endsWith('.ppt'))
            mimeType = 'application/vnd.ms-powerpoint';
        res.contentType(mimeType);
        res.download(filePath, filename);
    }
    catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
