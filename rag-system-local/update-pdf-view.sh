#!/bin/bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  PDF View & Download Feature           ║${NC}"
echo -e "${BLUE}║  Update Script for Server              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if running on server
if [ ! -d "/opt/rag-system" ]; then
    echo -e "${RED}❌ Error: /opt/rag-system not found${NC}"
    echo "This script must be run on the server."
    exit 1
fi

# 1. Create storage directory
echo -e "${YELLOW}[1/5] Creating PDF storage directory...${NC}"
mkdir -p /opt/rag-system/documents
chmod 755 /opt/rag-system/documents
echo -e "${GREEN}✓ Storage directory ready: /opt/rag-system/documents${NC}"

# 2. Backup current files
echo -e "${YELLOW}[2/5] Creating backups...${NC}"
cp /opt/rag-system/api/src/routes/index.ts /opt/rag-system/api/src/routes/index.ts.backup-pdf-view
cp /opt/rag-system/web-ui/app.js /opt/rag-system/web-ui/app.js.backup-pdf-view
cp /opt/rag-system/web-ui/style.css /opt/rag-system/web-ui/style.css.backup-pdf-view
echo -e "${GREEN}✓ Backups created${NC}"

# 3. Copy new files
echo -e "${YELLOW}[3/5] Updating files...${NC}"

# Check if files exist
if [ ! -f "./api/src/routes/index.ts" ]; then
    echo -e "${RED}❌ Error: ./api/src/routes/index.ts not found${NC}"
    echo "Make sure you're in the rag-system-local directory"
    exit 1
fi

cp ./api/src/routes/index.ts /opt/rag-system/api/src/routes/index.ts
cp ./web-ui/app.js /opt/rag-system/web-ui/app.js
cp ./web-ui/style.css /opt/rag-system/web-ui/style.css
echo -e "${GREEN}✓ Files updated${NC}"

# 4. Build API
echo -e "${YELLOW}[4/5] Building API...${NC}"
cd /opt/rag-system/api
npm run build
echo -e "${GREEN}✓ Build completed${NC}"

# 5. Restart services
echo -e "${YELLOW}[5/5] Restarting services...${NC}"
pm2 restart rag-api
echo -e "${GREEN}✓ API restarted${NC}"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ Update completed successfully!     ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}New Features:${NC}"
echo "  • PDFs are now permanently stored in /opt/rag-system/documents"
echo "  • Click on filename to view PDF in browser"
echo "  • 'Ansehen' button - Open PDF in new tab"
echo "  • 'Download' button - Download PDF file"
echo "  • 'Löschen' button - Delete document and chunks"
echo ""
echo -e "${YELLOW}Note:${NC} Only PDFs uploaded AFTER this update will have view/download functionality."
echo "Existing PDFs in Qdrant will still work for queries, but cannot be viewed."
echo ""
echo -e "${BLUE}Test the update:${NC}"
echo "  1. Upload a new PDF"
echo "  2. Click on the filename in the documents table"
echo "  3. PDF should open in a new browser tab"
echo ""
