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
    // Get current model name
    getModelName() {
        return this.modelName;
    }
    // Set model name at runtime
    setModelName(modelName) {
        this.modelName = modelName;
        console.log(`Model switched to: ${modelName}`);
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
    async *generateStream(prompt) {
        try {
            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.modelName,
                    prompt: prompt,
                    stream: true,
                }),
            });
            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.statusText}`);
            }
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            if (!reader) {
                throw new Error('No response body');
            }
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(line => line.trim());
                for (const line of lines) {
                    try {
                        const json = JSON.parse(line);
                        if (json.response) {
                            yield json.response;
                        }
                    }
                    catch (e) {
                        // Ignore JSON parse errors for incomplete chunks
                    }
                }
            }
        }
        catch (error) {
            console.error('Error streaming response:', error.message);
            throw new Error('Failed to stream response');
        }
    }
}
exports.OllamaService = OllamaService;
