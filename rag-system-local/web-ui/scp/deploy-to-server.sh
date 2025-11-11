#!/bin/bash

# Deploy RAG UI to server
# Usage: ./deploy-to-server.sh SERVER_IP

if [ -z "$1" ]; then
    echo "Usage: $0 SERVER_IP"
    echo "Example: $0 45.92.217.15"
    exit 1
fi

SERVER_IP=$1
SERVER_USER="root"
REMOTE_PATH="/var/www/rag-ui"

echo "Deploying RAG UI to ${SERVER_IP}..."

# Create remote directory if it doesn't exist
ssh ${SERVER_USER}@${SERVER_IP} "mkdir -p ${REMOTE_PATH}"

# Copy all UI files
scp index.html ${SERVER_USER}@${SERVER_IP}:${REMOTE_PATH}/
scp style.css ${SERVER_USER}@${SERVER_IP}:${REMOTE_PATH}/
scp app.js ${SERVER_USER}@${SERVER_IP}:${REMOTE_PATH}/
scp index-enhanced.html ${SERVER_USER}@${SERVER_IP}:${REMOTE_PATH}/
scp style-enhanced.css ${SERVER_USER}@${SERVER_IP}:${REMOTE_PATH}/
scp app-enhanced.js ${SERVER_USER}@${SERVER_IP}:${REMOTE_PATH}/
scp README.md ${SERVER_USER}@${SERVER_IP}:${REMOTE_PATH}/

echo "✅ Deployment complete!"
echo ""
echo "Access the UI at:"
echo "  Professional UI: http://${SERVER_IP}:8080/index.html"
echo "  Enhanced UI:     http://${SERVER_IP}:8080/index-enhanced.html"
echo ""
echo "Note: Clear browser cache (Ctrl+Shift+R) to see changes!"
