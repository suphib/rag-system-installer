"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RagService = void 0;
const ollama_service_1 = require("./ollama.service");
const qdrant_service_1 = require("./qdrant.service");
class RagService {
    constructor() {
        this.ollama = new ollama_service_1.OllamaService(process.env.OLLAMA_URL, process.env.MODEL_NAME, process.env.EMBEDDING_MODEL);
        this.qdrant = new qdrant_service_1.QdrantService(process.env.QDRANT_URL, process.env.COLLECTION_NAME);
    }
    async indexDocument(filename, content, metadata) {
        const startTime = Date.now();
        // Split content into chunks
        const chunks = this.chunkText(content, 1000);
        console.log(`Indexing ${chunks.length} chunks from ${filename}`);
        const pointIds = [];
        let indexed = 0;
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            // Generate embedding
            const embedding = await this.ollama.generateEmbedding(chunk);
            // Store in Qdrant
            const pointId = Date.now() + i;
            pointIds.push(pointId);
            await this.qdrant.upsertPoint(pointId, embedding, {
                text: chunk,
                filename,
                chunkIndex: i,
                totalChunks: chunks.length,
                ...(metadata || {}),
            });
            indexed++;
            console.log(`Indexed chunk ${i + 1}/${chunks.length}`);
        }
        // Update indexingTime for all chunks
        const indexingTime = Date.now() - startTime;
        console.log(`Indexing completed in ${indexingTime}ms`);
        for (const pointId of pointIds) {
            await this.qdrant.setPayload(pointId, { indexingTime });
        }
        return indexed;
    }
    async chat(request) {
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
            .map((result) => result.payload.text)
            .join('\n\n---\n\n');
        const sources = [...new Set(searchResults.map((r) => r.payload.filename))];
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
    chunkText(text, chunkSize = 1000) {
        const chunks = [];
        const paragraphs = text.split('\n\n');
        let currentChunk = '';
        for (const paragraph of paragraphs) {
            if (currentChunk.length + paragraph.length > chunkSize && currentChunk.length > 0) {
                chunks.push(currentChunk.trim());
                currentChunk = paragraph;
            }
            else {
                currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
            }
        }
        if (currentChunk) {
            chunks.push(currentChunk.trim());
        }
        return chunks;
    }
}
exports.RagService = RagService;
