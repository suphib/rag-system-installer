#!/bin/bash

##################################################
# RAG API Setup
# Node.js + TypeScript API
##################################################

set -e

echo "🚀 Setting up RAG API..."

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

cd /opt/rag-system/api

# 1. Node.js installieren (via NodeSource)
echo -e "${YELLOW}📦 Installing Node.js 20...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 2. PM2 installieren (Process Manager)
echo -e "${YELLOW}🔧 Installing PM2...${NC}"
npm install -g pm2

# 3. API Package erstellen
echo -e "${YELLOW}📝 Creating API package...${NC}"

# package.json erstellen
cat > package.json <<'EOF'
{
  "name": "rag-api",
  "version": "1.0.0",
  "description": "RAG API for document Q&A",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts",
    "watch": "nodemon --watch src --exec ts-node src/index.ts"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "multer": "^1.4.5-lts.1",
    "pdf-parse": "^1.1.1",
    "@qdrant/js-client-rest": "^1.7.0",
    "axios": "^1.6.2"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/multer": "^1.4.11",
    "@types/node": "^20.10.5",
    "typescript": "^5.3.3",
    "ts-node": "^10.9.2",
    "nodemon": "^3.0.2"
  }
}
EOF

# tsconfig.json erstellen
cat > tsconfig.json <<'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
EOF

# .env erstellen
cat > .env <<'EOF'
PORT=3000
OLLAMA_URL=http://localhost:11434
QDRANT_URL=http://localhost:6333
COLLECTION_NAME=documents
MODEL_NAME=llama3.1:8b
EMBEDDING_MODEL=nomic-embed-text
EOF

# Dependencies installieren
echo -e "${YELLOW}📦 Installing dependencies (this may take a few minutes)...${NC}"
npm install

echo -e "${GREEN}✅ API Setup Complete!${NC}"
echo ""
echo "Next: Creating API source code..."
echo "Run: ./04-create-api-code.sh"
