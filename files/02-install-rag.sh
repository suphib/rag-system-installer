#!/bin/bash

##################################################
# RAG System Setup
# Ollama + Qdrant + LLM Model
##################################################

set -e

echo "🚀 Setting up RAG System..."

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

cd /opt/rag-system

# 1. Qdrant mit Docker Compose starten
echo -e "${YELLOW}📊 Setting up Qdrant...${NC}"

cat > docker-compose.yml <<EOF
version: '3.8'

services:
  qdrant:
    image: qdrant/qdrant:latest
    container_name: qdrant
    restart: unless-stopped
    ports:
      - "6333:6333"  # REST API & Dashboard
      - "6334:6334"  # gRPC
    volumes:
      - ./qdrant:/qdrant/storage
    environment:
      - QDRANT__SERVICE__GRPC_PORT=6334
    mem_limit: 4g
    cpus: 2
EOF

# Qdrant starten
echo -e "${YELLOW}🚀 Starting Qdrant...${NC}"
docker-compose up -d

# Warte bis Qdrant bereit ist
echo -e "${YELLOW}⏳ Waiting for Qdrant to be ready...${NC}"
sleep 10

# Check ob Qdrant läuft
if curl -s http://localhost:6333/healthz | grep -q "ok"; then
    echo -e "${GREEN}✅ Qdrant is running!${NC}"
else
    echo -e "${RED}❌ Qdrant failed to start${NC}"
    exit 1
fi

# 2. Llama 3.1 8B Model + Embedding Model herunterladen
echo -e "${YELLOW}🧠 Downloading Llama 3.1 8B model (this takes 5-10 minutes)...${NC}"
echo "Model size: ~4.7GB"

# Retry mechanism for model download
MAX_RETRIES=3
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if ollama pull llama3.1:8b; then
        echo -e "${GREEN}✅ Llama 3.1 8B downloaded successfully!${NC}"
        break
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            echo -e "${YELLOW}⚠️ Download failed, retrying ($RETRY_COUNT/$MAX_RETRIES)...${NC}"
            sleep 5
        else
            echo -e "${RED}❌ Model download failed after $MAX_RETRIES attempts${NC}"
            exit 1
        fi
    fi
done

# Embedding Model (dediziert für bessere Embeddings)
echo -e "${YELLOW}📦 Downloading Nomic Embed Text (embedding model)...${NC}"
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if ollama pull nomic-embed-text; then
        echo -e "${GREEN}✅ Nomic Embed Text downloaded successfully!${NC}"
        break
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            echo -e "${YELLOW}⚠️ Download failed, retrying ($RETRY_COUNT/$MAX_RETRIES)...${NC}"
            sleep 5
        else
            echo -e "${RED}❌ Embedding model download failed after $MAX_RETRIES attempts${NC}"
            exit 1
        fi
    fi
done

# Verify model is downloaded
if ollama list | grep -q "llama3.1:8b"; then
    echo -e "${GREEN}✅ Llama 3.1 8B downloaded successfully!${NC}"
else
    echo -e "${RED}❌ Model download failed${NC}"
    exit 1
fi

# 3. Test Ollama
echo -e "${YELLOW}🧪 Testing Ollama...${NC}"
echo "Hallo!" | ollama run llama3.1:8b

# 4. Create collection in Qdrant
echo -e "${YELLOW}📦 Creating Qdrant collection...${NC}"
curl -X PUT "http://localhost:6333/collections/documents" \
  -H "Content-Type: application/json" \
  -d '{
    "vectors": {
      "size": 768,
      "distance": "Cosine"
    }
  }'

echo -e "${GREEN}✅ Collection created with 768 dimensions (nomic-embed-text)${NC}"

# 5. System Status
echo ""
echo "=========================================="
echo -e "${GREEN}✅ RAG System Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Services running:"
echo "• Ollama: http://localhost:11434"
echo "• Qdrant API: http://localhost:6333"
echo "• Qdrant Dashboard: http://localhost:6333/dashboard"
echo ""
echo "Installed Models:"
ollama list
echo ""
echo "Qdrant Status:"
curl -s http://localhost:6333/collections/documents | jq '.'
echo ""
echo "=========================================="
echo "Next steps:"
echo "1. Run: ./03-install-api.sh (to setup the API)"
echo "=========================================="
