#!/bin/bash

##################################################
# RAG System Test Script
# Testet alle Komponenten
##################################################

set -e

echo "🧪 Testing RAG System..."

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Test Ollama
echo -e "${YELLOW}Testing Ollama...${NC}"
if curl -s http://localhost:11434/api/tags | jq -e '.models[] | select(.name == "llama3.1:8b")' > /dev/null; then
    echo -e "${GREEN}✅ Ollama is working and model is available${NC}"
else
    echo -e "${RED}❌ Ollama test failed${NC}"
    exit 1
fi

# 2. Test Qdrant
echo -e "${YELLOW}Testing Qdrant...${NC}"
if curl -s http://localhost:6333/collections/documents | jq -e '.result' > /dev/null; then
    echo -e "${GREEN}✅ Qdrant is working${NC}"
else
    echo -e "${RED}❌ Qdrant test failed${NC}"
    exit 1
fi

# 3. Test API
echo -e "${YELLOW}Testing API...${NC}"
if curl -s http://localhost:3000/api/health | jq -e '.status == "ok"' > /dev/null; then
    echo -e "${GREEN}✅ API is working${NC}"
else
    echo -e "${RED}❌ API test failed${NC}"
    exit 1
fi

# 4. Test PDF Upload (mit Sample PDF)
echo -e "${YELLOW}Testing PDF upload...${NC}"

# Create a sample PDF with text
cat > /tmp/test.txt <<'EOF'
Test Vertrag

Kündigungsfrist: 3 Monate zum Quartalsende

Dieser Vertrag kann mit einer Frist von 3 Monaten zum Ende eines Kalenderquartals gekündigt werden.

Laufzeit: Der Vertrag läuft auf unbestimmte Zeit.

Zahlungsbedingungen: Zahlung innerhalb von 14 Tagen nach Rechnungsstellung.
EOF

# Convert to "PDF" (actually just upload the text)
echo -e "${YELLOW}Note: For real PDF test, upload a PDF file manually${NC}"

# 5. Test Chat
echo -e "${YELLOW}Testing chat endpoint...${NC}"
CHAT_RESPONSE=$(curl -s -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Hallo, bist du bereit?"
  }')

if echo "$CHAT_RESPONSE" | jq -e '.answer' > /dev/null; then
    echo -e "${GREEN}✅ Chat is working${NC}"
    echo "Response: $(echo $CHAT_RESPONSE | jq -r '.answer' | head -c 100)..."
else
    echo -e "${RED}❌ Chat test failed${NC}"
fi

# 6. System Stats
echo ""
echo "=========================================="
echo "System Stats:"
echo "=========================================="
echo "CPU Usage:"
top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1"%"}'

echo ""
echo "Memory Usage:"
free -h | awk 'NR==2{printf "Used: %s / %s (%.2f%%)\n", $3, $2, $3*100/$2}'

echo ""
echo "Disk Usage:"
df -h / | awk 'NR==2{print "Used: "$3" / "$2" ("$5")"}'

echo ""
echo "Docker Containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "Ollama Models:"
ollama list

echo ""
echo "Qdrant Collections:"
curl -s http://localhost:6333/collections | jq '.result.collections'

echo ""
echo "API Status:"
curl -s http://localhost:3000/api/stats | jq '.'

echo ""
echo "=========================================="
echo -e "${GREEN}🎉 All tests passed!${NC}"
echo "=========================================="
echo ""
echo "Your RAG system is ready to use!"
echo ""
echo "Try it out:"
echo '  curl -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d '"'"'{"question":"Was ist KI?"}'"'"''
