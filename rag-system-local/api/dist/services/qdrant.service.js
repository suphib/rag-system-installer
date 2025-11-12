"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QdrantService = void 0;
const js_client_rest_1 = require("@qdrant/js-client-rest");
class QdrantService {
    constructor(url = 'http://localhost:6333', collectionName = 'documents') {
        this.client = new js_client_rest_1.QdrantClient({ url });
        this.collectionName = collectionName;
    }
    async upsertPoint(id, vector, payload) {
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
    async search(queryVector, limit = 5) {
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
    async setPayload(pointId, payload) {
        await this.client.setPayload(this.collectionName, {
            points: [pointId],
            payload,
        });
    }
    async getDocuments() {
        const scrollResult = await this.client.scroll(this.collectionName, {
            limit: 1000,
            with_payload: true,
            with_vector: false
        });
        // Extract unique filenames with metadata
        const filesMap = new Map();
        for (const point of scrollResult.points) {
            const filename = point.payload?.filename;
            if (filename && !filesMap.has(filename)) {
                filesMap.set(filename, {
                    filename,
                    uploadedAt: point.payload?.uploadedAt || null,
                    fileSize: point.payload?.fileSize || 0,
                    pages: point.payload?.pages || 0,
                    contentLength: point.payload?.contentLength || 0,
                    indexingTime: point.payload?.indexingTime || 0,
                    chunks: 1
                });
            }
            else if (filename) {
                const doc = filesMap.get(filename);
                doc.chunks++;
                // Update indexingTime from first chunk
                if (point.payload?.indexingTime) {
                    doc.indexingTime = point.payload.indexingTime;
                }
            }
        }
        return Array.from(filesMap.values()).sort((a, b) => (b.uploadedAt || 0) - (a.uploadedAt || 0));
    }
    async deleteDocument(filename) {
        const scrollResult = await this.client.scroll(this.collectionName, {
            limit: 10000,
            with_payload: true,
            with_vector: false,
            filter: { must: [{ key: 'filename', match: { value: filename } }] }
        });
        const pointIds = scrollResult.points.map(p => p.id);
        if (pointIds.length === 0)
            throw new Error('Dokument nicht gefunden');
        await this.client.delete(this.collectionName, { wait: true, points: pointIds });
        return { deletedChunks: pointIds.length };
    }
    async deleteAllDocuments() {
        await this.client.deleteCollection(this.collectionName);
        await this.client.createCollection(this.collectionName, {
            vectors: { size: 768, distance: 'Cosine' }
        });
    }
}
exports.QdrantService = QdrantService;
