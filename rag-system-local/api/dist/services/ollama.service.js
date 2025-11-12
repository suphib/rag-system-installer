"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaService = void 0;
const axios_1 = __importDefault(require("axios"));
class OllamaService {
    constructor(baseUrl = 'http://localhost:11434', modelName = 'llama3.1:8b', embeddingModel = 'nomic-embed-text') {
        this.baseUrl = baseUrl;
        this.modelName = modelName;
        this.embeddingModel = embeddingModel;
    }
    async generateEmbedding(text) {
        try {
            const response = await axios_1.default.post(`${this.baseUrl}/api/embeddings`, {
                model: this.embeddingModel, // Use dedicated embedding model
                prompt: text,
            });
            return response.data.embedding;
        }
        catch (error) {
            console.error('Error generating embedding:', error.message);
            throw new Error('Failed to generate embedding');
        }
    }
    async generate(prompt) {
        try {
            const response = await axios_1.default.post(`${this.baseUrl}/api/generate`, {
                model: this.modelName, // Use chat model for generation
                prompt: prompt,
                stream: false,
            });
            return response.data.response;
        }
        catch (error) {
            console.error('Error generating response:', error.message);
            throw new Error('Failed to generate response');
        }
    }
}
exports.OllamaService = OllamaService;
