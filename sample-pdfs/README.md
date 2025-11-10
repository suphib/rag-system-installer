# Sample PDFs for Testing

This directory contains sample PDF files for testing the RAG system.

## Test PDFs

### Option 1: Use your own PDFs
Upload any PDF with text content to test the system.

### Option 2: Download test PDFs
```bash
# Example: German rental contract (Mietvertrag)
wget https://www.mietrecht.de/mietvertraege/muster-mietvertrag.pdf

# Or create a simple test PDF from text
```

## Quick Test

After installation, test with:

```bash
# Upload PDF
curl -X POST http://localhost:3000/api/upload \
  -F "file=@your-document.pdf"

# Ask questions
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question":"What is this document about?"}'
```

## Notes

- PDFs must contain actual text (not just scanned images without OCR)
- Larger PDFs will take longer to process
- Each PDF is chunked into ~1000 character segments
- German and English documents work well with Llama 3.1
