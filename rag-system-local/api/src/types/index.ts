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
