#!/bin/bash

##################################################
# Master Setup Script
# Führt alle Setup-Schritte nacheinander aus
##################################################

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

clear

echo -e "${BLUE}"
cat << "EOF"
╔═══════════════════════════════════════════════╗
║                                               ║
║    🚀 RAG System Installation               ║
║                                               ║
║    Ollama + Qdrant + TypeScript API          ║
║    für EPYC 03 Server (Debian 12)            ║
║                                               ║
╚═══════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo -e "${YELLOW}This script will install:${NC}"
echo "  • Docker & Docker Compose"
echo "  • Ollama (LLM Runtime)"
echo "  • Qdrant (Vector Database)"
echo "  • Node.js 20"
echo "  • TypeScript RAG API"
echo "  • Llama 3.1 8B Model (~4.7 GB)"
echo ""
echo -e "${YELLOW}Estimated time: ~30-40 minutes${NC}"
echo ""

read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Installation cancelled."
    exit 1
fi

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Log file
LOG_FILE="/root/rag-setup.log"
exec > >(tee -a "$LOG_FILE")
exec 2>&1

echo ""
echo -e "${GREEN}Starting installation...${NC}"
echo "Log file: $LOG_FILE"
echo ""

# Function to run script and handle errors
run_script() {
    local script=$1
    local description=$2
    
    echo ""
    echo "=========================================="
    echo -e "${BLUE}$description${NC}"
    echo "=========================================="
    echo ""
    
    if [ -f "$SCRIPT_DIR/$script" ]; then
        bash "$SCRIPT_DIR/$script"
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ $description completed${NC}"
        else
            echo -e "${RED}❌ $description failed${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ Script not found: $script${NC}"
        exit 1
    fi
}

# Step 1: Initial Setup
run_script "01-initial-setup.sh" "Step 1/5: Initial Server Setup (System, Docker, Security)"

# Step 2: RAG System
run_script "02-install-rag.sh" "Step 2/5: RAG System Setup (Qdrant + Ollama + Model Download)"

# Step 3: API Dependencies
run_script "03-install-api.sh" "Step 3/5: API Dependencies (Node.js + NPM Packages)"

# Step 4: API Code
run_script "04-create-api-code.sh" "Step 4/5: API Source Code (TypeScript + Build)"

# Step 5: Start API
echo ""
echo "=========================================="
echo -e "${BLUE}Step 5/5: Starting API${NC}"
echo "=========================================="
echo ""

cd /opt/rag-system/api
pm2 start ecosystem.config.js
pm2 save

# Setup PM2 startup
echo -e "${YELLOW}Setting up PM2 auto-start...${NC}"
env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root

echo -e "${GREEN}✅ API started${NC}"

# Final Test
echo ""
echo "=========================================="
echo -e "${BLUE}Running System Tests${NC}"
echo "=========================================="
echo ""

sleep 5  # Give services time to fully start

bash "$SCRIPT_DIR/05-test-system.sh"

# Success!
clear
echo -e "${GREEN}"
cat << "EOF"
╔═══════════════════════════════════════════════╗
║                                               ║
║    🎉 Installation Complete!                 ║
║                                               ║
╚═══════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Get server IP
SERVER_IP=$(hostname -I | awk '{print $1}')

echo ""
echo "Your RAG System is ready!"
echo ""
echo -e "${GREEN}🌐 Access Points:${NC}"
echo "  • API:           http://$SERVER_IP:3000"
echo "  • Qdrant API:    http://$SERVER_IP:6333"
echo "  • Qdrant UI:     http://$SERVER_IP:6335"
echo ""
echo -e "${GREEN}📝 Quick Start:${NC}"
echo ""
echo "1. Upload a PDF:"
echo "   curl -X POST http://$SERVER_IP:3000/api/upload \\"
echo "     -F \"file=@document.pdf\""
echo ""
echo "2. Ask a question:"
echo "   curl -X POST http://$SERVER_IP:3000/api/chat \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"question\":\"Was ist KI?\"}'"
echo ""
echo -e "${GREEN}🔧 Management Commands:${NC}"
echo "  • View API logs:      pm2 logs rag-api"
echo "  • Restart API:        pm2 restart rag-api"
echo "  • API status:         pm2 status"
echo "  • View Qdrant logs:   docker logs qdrant"
echo ""
echo -e "${GREEN}📚 Documentation:${NC}"
echo "  • Full guide:         cat $SCRIPT_DIR/README.md"
echo "  • Installation log:   cat $LOG_FILE"
echo ""
echo -e "${YELLOW}⚠️  Important Notes:${NC}"
echo "  • Firewall allows ports: 22, 80, 443, 3000"
echo "  • API runs on port 3000 (adjust if needed)"
echo "  • Model loaded: Llama 3.1 8B"
echo "  • First query may take ~10 seconds (model warmup)"
echo ""
echo -e "${GREEN}🚀 Next Steps:${NC}"
echo "  1. Test the system (scripts above)"
echo "  2. Upload your PDFs"
echo "  3. Start asking questions!"
echo "  4. Consider adding a frontend UI"
echo ""
echo "Need help? Check README.md or logs above."
echo ""

# Save important info
cat > /root/rag-info.txt <<EOF
RAG System Installation Complete
=================================

Date: $(date)
Server IP: $SERVER_IP

Services:
- API: http://$SERVER_IP:3000
- Qdrant: http://$SERVER_IP:6333
- Qdrant UI: http://$SERVER_IP:6335

Management:
- API logs: pm2 logs rag-api
- Restart API: pm2 restart rag-api
- Qdrant logs: docker logs qdrant

Files:
- Installation log: $LOG_FILE
- Documentation: $SCRIPT_DIR/README.md
- API code: /opt/rag-system/api
- Qdrant data: /opt/rag-system/qdrant

Model: Llama 3.1 8B
EOF

echo -e "${GREEN}Info saved to: /root/rag-info.txt${NC}"
