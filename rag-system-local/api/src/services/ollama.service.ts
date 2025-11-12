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

  // Get current model name
  getModelName(): string {
    return this.modelName;
  }

  // Set model name at runtime
  setModelName(modelName: string): void {
    this.modelName = modelName;
    console.log(`Model switched to: ${modelName}`);
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
