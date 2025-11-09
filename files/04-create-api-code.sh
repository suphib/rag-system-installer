#!/bin/bash

##################################################
# Create API Source Code
# RAG API with Ollama + Qdrant
##################################################

set -e

echo "🚀 Creating API source code..."

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

cd /opt/rag-system/api

# Create src directory
mkdir -p src/{services,routes,types,utils}

# 1. Types
echo -e "${YELLOW}📝 Creating types...${NC}"
cat > src/types/index.ts <<'EOF'
export interface Document {
  id: string;
  filename: string;
  content: string;
  chunks: string[];
  uploadedAt: Date;
}

export interface ChatRequest {
  question: string;
  maxResults?: number;
}

export interface ChatResponse {
  answer: string;
  sources: string[];
  processingTime: number;
}

export interface UploadResponse {
  success: boolean;
  filename: string;
  chunks: number;
  message: string;
}
EOF

# 2. Ollama Service
echo -e "${YELLOW}🤖 Creating Ollama service...${NC}"
cat > src/services/ollama.service.ts <<'EOF'
import axios from 'axios';

export class OllamaService {
  private baseUrl: string;
  private modelName: string;
  private embeddingModel: string;

  constructor(
    baseUrl: string = 'http://localhost:11434', 
    modelName: string = 'llama3.1:8b',
    embeddingModel: string = 'nomic-embed-text'
  ) {
    this.baseUrl = baseUrl;
    this.modelName = modelName;
    this.embeddingModel = embeddingModel;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/embeddings`, {
        model: this.embeddingModel,  // Use dedicated embedding model
        prompt: text,
      });
      return response.data.embedding;
    } catch (error: any) {
      console.error('Error generating embedding:', error.message);
      throw new Error('Failed to generate embedding');
    }
  }

  async generate(prompt: string): Promise<string> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/generate`, {
        model: this.modelName,  // Use chat model for generation
        prompt: prompt,
        stream: false,
      });
      return response.data.response;
    } catch (error: any) {
      console.error('Error generating response:', error.message);
      throw new Error('Failed to generate response');
    }
  }
}
EOF

# 3. Qdrant Service
echo -e "${YELLOW}📊 Creating Qdrant service...${NC}"
cat > src/services/qdrant.service.ts <<'EOF'
import { QdrantClient } from '@qdrant/js-client-rest';

export class QdrantService {
  private client: QdrantClient;
  private collectionName: string;

  constructor(url: string = 'http://localhost:6333', collectionName: string = 'documents') {
    this.client = new QdrantClient({ url });
    this.collectionName = collectionName;
  }

  async upsertPoint(id: number, vector: number[], payload: any): Promise<void> {
    await this.client.upsert(this.collectionName, {
      wait: true,
      points: [
        {
          id,
          vector,
          payload,
        },
      ],
    });
  }

  async search(queryVector: number[], limit: number = 5) {
    const results = await this.client.search(this.collectionName, {
      vector: queryVector,
      limit,
      with_payload: true,
    });
    return results;
  }

  async getCollectionInfo() {
    return await this.client.getCollection(this.collectionName);
  }
}
EOF

# 4. RAG Service (Main Logic)
echo -e "${YELLOW}🧠 Creating RAG service...${NC}"
cat > src/services/rag.service.ts <<'EOF'
import { OllamaService } from './ollama.service';
import { QdrantService } from './qdrant.service';
import { ChatRequest, ChatResponse } from '../types';

export class RagService {
  private ollama: OllamaService;
  private qdrant: QdrantService;

  constructor() {
    this.ollama = new OllamaService(
      process.env.OLLAMA_URL,
      process.env.MODEL_NAME,
      process.env.EMBEDDING_MODEL
    );
    this.qdrant = new QdrantService(
      process.env.QDRANT_URL,
      process.env.COLLECTION_NAME
    );
  }

  async indexDocument(filename: string, content: string): Promise<number> {
    // Split content into chunks
    const chunks = this.chunkText(content, 1000);
    console.log(`Indexing ${chunks.length} chunks from ${filename}`);

    let indexed = 0;
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Generate embedding
      const embedding = await this.ollama.generateEmbedding(chunk);
      
      // Store in Qdrant
      const pointId = Date.now() + i;
      await this.qdrant.upsertPoint(pointId, embedding, {
        text: chunk,
        filename,
        chunkIndex: i,
        totalChunks: chunks.length,
      });
      
      indexed++;
      console.log(`Indexed chunk ${i + 1}/${chunks.length}`);
    }

    return indexed;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();
    const { question, maxResults = 5 } = request;

    // 1. Generate embedding for question
    console.log('Generating question embedding...');
    const questionEmbedding = await this.ollama.generateEmbedding(question);

    // 2. Search for similar chunks
    console.log('Searching for relevant documents...');
    const searchResults = await this.qdrant.search(questionEmbedding, maxResults);

    // 3. Build context from results
    const context = searchResults
      .map((result: any) => result.payload.text)
      .join('\n\n---\n\n');

    const sources = [...new Set(searchResults.map((r: any) => r.payload.filename))];

    // 4. Generate answer with context
    console.log('Generating answer...');
    const prompt = `Du bist ein hilfreicher Assistent für Dokumentenanalyse. Beantworte die Frage basierend auf dem gegebenen Kontext.

Kontext:
${context}

Frage: ${question}

Antwort (auf Deutsch, präzise und basierend nur auf dem Kontext):`;

    const answer = await this.ollama.generate(prompt);

    const processingTime = Date.now() - startTime;

    return {
      answer,
      sources,
      processingTime,
    };
  }

  private chunkText(text: string, chunkSize: number = 1000): string[] {
    const chunks: string[] = [];
    const paragraphs = text.split('\n\n');
    
    let currentChunk = '';
    
    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = paragraph;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }
}
EOF

# 5. Routes
echo -e "${YELLOW}🛣️ Creating routes...${NC}"
cat > src/routes/index.ts <<'EOF'
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
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, path } = req.file;

    // Only allow PDFs
    if (!originalname.toLowerCase().endsWith('.pdf')) {
      fs.unlinkSync(path);
      return res.status(400).json({ error: 'Only PDF files are allowed' });
    }

    console.log(`Processing file: ${originalname}`);

    // Parse PDF
    const dataBuffer = fs.readFileSync(path);
    const pdfData = await pdfParse(dataBuffer);
    const content = pdfData.text;

    console.log(`Extracted ${content.length} characters from PDF`);

    // Index document
    const chunks = await ragService.indexDocument(originalname, content);

    // Clean up temp file
    fs.unlinkSync(path);

    res.json({
      success: true,
      filename: originalname,
      chunks,
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

export default router;
EOF

# 6. Main App
echo -e "${YELLOW}🎯 Creating main app...${NC}"
cat > src/index.ts <<'EOF'
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'RAG API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/health',
      upload: 'POST /api/upload',
      chat: 'POST /api/chat',
      stats: 'GET /api/stats',
    },
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║   RAG API Server                      ║
║   Running on http://localhost:${PORT}   ║
╚═══════════════════════════════════════╝
  `);
  console.log('Endpoints:');
  console.log('  GET  / - API info');
  console.log('  GET  /api/health - Health check');
  console.log('  POST /api/upload - Upload PDF');
  console.log('  POST /api/chat - Ask question');
  console.log('  GET  /api/stats - Collection stats');
});

export default app;
EOF

# 7. Build the project
echo -e "${YELLOW}🔨 Building TypeScript...${NC}"
npm run build

# 8. Create PM2 ecosystem file
cat > ecosystem.config.js <<'EOF'
module.exports = {
  apps: [{
    name: 'rag-api',
    script: './dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '../logs/err.log',
    out_file: '../logs/out.log',
    log_file: '../logs/combined.log',
    time: true
  }]
};
EOF

echo ""
echo -e "${GREEN}✅ API Source Code Created!${NC}"
echo ""
echo "To start the API:"
echo "  cd /opt/rag-system/api"
echo "  pm2 start ecosystem.config.js"
echo "  pm2 save"
echo "  pm2 startup"
echo ""
