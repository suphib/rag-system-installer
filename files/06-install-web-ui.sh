#!/bin/bash

################################################################################
# 06-install-web-ui.sh
# Installiert eine Web-Benutzeroberfläche für das RAG-System
################################################################################

set -e  # Bei Fehler abbrechen

echo "=================================================="
echo "Web UI Installation für RAG-System"
echo "=================================================="
echo ""

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Prüfen ob als root ausgeführt
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Bitte als root ausführen (sudo ./06-install-web-ui.sh)${NC}"
    exit 1
fi

# Prüfen ob API läuft
if ! pm2 list | grep -q "rag-api"; then
    echo -e "${RED}Fehler: RAG API läuft nicht. Bitte zuerst 00-install-all.sh ausführen.${NC}"
    exit 1
fi

echo -e "${GREEN}[1/4] Erstelle Web UI Verzeichnis...${NC}"
mkdir -p /opt/rag-system/web-ui
cd /opt/rag-system/web-ui

echo -e "${GREEN}[2/4] Erstelle HTML Interface...${NC}"

# Haupt-HTML-Datei
cat > index.html << 'EOF'
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RAG System - Chat & Upload</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>🤖 RAG System</h1>
            <p>Dokumente hochladen und intelligente Fragen stellen</p>
        </header>

        <div class="main-content">
            <!-- Upload-Bereich -->
            <section class="card upload-section">
                <h2>📄 Dokumente hochladen</h2>
                <div class="upload-area" id="uploadArea">
                    <input type="file" id="fileInput" accept=".pdf" hidden>
                    <div class="upload-prompt">
                        <span class="upload-icon">📁</span>
                        <p>PDF hierher ziehen oder klicken zum Auswählen</p>
                        <small>Nur PDF-Dateien werden unterstützt</small>
                    </div>
                </div>
                <div id="uploadStatus" class="status-message"></div>
                <div id="uploadProgress" class="progress-bar hidden">
                    <div class="progress-fill"></div>
                </div>
            </section>

            <!-- Chat-Bereich -->
            <section class="card chat-section">
                <h2>💬 Fragen stellen</h2>
                <div class="chat-container" id="chatContainer">
                    <div class="welcome-message">
                        <p>👋 Willkommen! Laden Sie zuerst ein PDF hoch, dann können Sie Fragen dazu stellen.</p>
                    </div>
                </div>
                <div class="chat-input-container">
                    <textarea
                        id="questionInput"
                        placeholder="Ihre Frage hier eingeben..."
                        rows="2"
                        disabled
                    ></textarea>
                    <button id="sendButton" disabled>
                        <span>Senden</span>
                    </button>
                </div>
            </section>

            <!-- Statistik-Bereich -->
            <section class="card stats-section">
                <h2>📊 System-Statistik</h2>
                <div id="statsContainer" class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-label">Dokumente:</span>
                        <span class="stat-value" id="docCount">-</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Vektoren:</span>
                        <span class="stat-value" id="vectorCount">-</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Status:</span>
                        <span class="stat-value" id="systemStatus">-</span>
                    </div>
                </div>
                <button id="refreshStatsButton" class="secondary-button">Aktualisieren</button>
            </section>
        </div>

        <footer>
            <p>RAG System v1.0 | Powered by Ollama + Qdrant</p>
        </footer>
    </div>

    <script src="app.js"></script>
</body>
</html>
EOF

echo -e "${GREEN}[3/4] Erstelle CSS Styling...${NC}"

cat > style.css << 'EOF'
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

:root {
    --primary-color: #2563eb;
    --primary-hover: #1d4ed8;
    --success-color: #10b981;
    --error-color: #ef4444;
    --warning-color: #f59e0b;
    --bg-color: #f9fafb;
    --card-bg: #ffffff;
    --text-primary: #111827;
    --text-secondary: #6b7280;
    --border-color: #e5e7eb;
    --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background-color: var(--bg-color);
    color: var(--text-primary);
    line-height: 1.6;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

header {
    text-align: center;
    padding: 40px 20px;
    background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
    color: white;
    border-radius: 12px;
    margin-bottom: 30px;
    box-shadow: var(--shadow-lg);
}

header h1 {
    font-size: 2.5rem;
    margin-bottom: 10px;
}

header p {
    font-size: 1.1rem;
    opacity: 0.9;
}

.main-content {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
}

@media (min-width: 768px) {
    .main-content {
        grid-template-columns: 1fr 1fr;
    }

    .chat-section {
        grid-column: 1 / -1;
    }
}

.card {
    background: var(--card-bg);
    border-radius: 12px;
    padding: 25px;
    box-shadow: var(--shadow);
    border: 1px solid var(--border-color);
}

.card h2 {
    font-size: 1.5rem;
    margin-bottom: 20px;
    color: var(--text-primary);
}

/* Upload Bereich */
.upload-area {
    border: 2px dashed var(--border-color);
    border-radius: 8px;
    padding: 40px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
    background-color: var(--bg-color);
}

.upload-area:hover {
    border-color: var(--primary-color);
    background-color: rgba(37, 99, 235, 0.05);
}

.upload-area.drag-over {
    border-color: var(--primary-color);
    background-color: rgba(37, 99, 235, 0.1);
}

.upload-icon {
    font-size: 3rem;
    display: block;
    margin-bottom: 15px;
}

.upload-prompt p {
    font-size: 1.1rem;
    color: var(--text-primary);
    margin-bottom: 5px;
}

.upload-prompt small {
    color: var(--text-secondary);
}

/* Status Messages */
.status-message {
    margin-top: 15px;
    padding: 12px;
    border-radius: 6px;
    display: none;
    font-weight: 500;
}

.status-message.success {
    display: block;
    background-color: rgba(16, 185, 129, 0.1);
    color: var(--success-color);
    border: 1px solid var(--success-color);
}

.status-message.error {
    display: block;
    background-color: rgba(239, 68, 68, 0.1);
    color: var(--error-color);
    border: 1px solid var(--error-color);
}

.status-message.info {
    display: block;
    background-color: rgba(37, 99, 235, 0.1);
    color: var(--primary-color);
    border: 1px solid var(--primary-color);
}

/* Progress Bar */
.progress-bar {
    margin-top: 15px;
    height: 6px;
    background-color: var(--border-color);
    border-radius: 3px;
    overflow: hidden;
}

.progress-bar.hidden {
    display: none;
}

.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--primary-color), var(--primary-hover));
    width: 0%;
    transition: width 0.3s ease;
    animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}

/* Chat Bereich */
.chat-container {
    min-height: 400px;
    max-height: 600px;
    overflow-y: auto;
    padding: 20px;
    background-color: var(--bg-color);
    border-radius: 8px;
    margin-bottom: 20px;
}

.welcome-message {
    text-align: center;
    padding: 40px 20px;
    color: var(--text-secondary);
}

.message {
    margin-bottom: 20px;
    padding: 15px;
    border-radius: 8px;
    max-width: 85%;
}

.message.user {
    background-color: var(--primary-color);
    color: white;
    margin-left: auto;
    text-align: right;
}

.message.assistant {
    background-color: white;
    border: 1px solid var(--border-color);
}

.message-header {
    font-weight: 600;
    margin-bottom: 8px;
    font-size: 0.9rem;
}

.message-content {
    line-height: 1.6;
}

.message-meta {
    font-size: 0.8rem;
    opacity: 0.7;
    margin-top: 8px;
}

.loading-indicator {
    display: inline-block;
    padding: 15px;
}

.loading-indicator::after {
    content: '...';
    animation: dots 1.5s steps(4, end) infinite;
}

@keyframes dots {
    0%, 20% { content: '.'; }
    40% { content: '..'; }
    60%, 100% { content: '...'; }
}

/* Chat Input */
.chat-input-container {
    display: flex;
    gap: 10px;
}

#questionInput {
    flex: 1;
    padding: 12px;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    font-size: 1rem;
    font-family: inherit;
    resize: vertical;
    min-height: 50px;
}

#questionInput:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

#questionInput:disabled {
    background-color: var(--bg-color);
    cursor: not-allowed;
}

button {
    padding: 12px 24px;
    background-color: var(--primary-color);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
}

button:hover:not(:disabled) {
    background-color: var(--primary-hover);
    transform: translateY(-1px);
}

button:disabled {
    background-color: var(--border-color);
    cursor: not-allowed;
    transform: none;
}

.secondary-button {
    background-color: white;
    color: var(--primary-color);
    border: 1px solid var(--primary-color);
}

.secondary-button:hover:not(:disabled) {
    background-color: rgba(37, 99, 235, 0.05);
}

/* Statistik */
.stats-grid {
    display: grid;
    gap: 15px;
    margin-bottom: 20px;
}

.stat-item {
    display: flex;
    justify-content: space-between;
    padding: 12px;
    background-color: var(--bg-color);
    border-radius: 6px;
}

.stat-label {
    color: var(--text-secondary);
    font-weight: 500;
}

.stat-value {
    color: var(--text-primary);
    font-weight: 700;
}

/* Footer */
footer {
    text-align: center;
    padding: 30px 20px;
    color: var(--text-secondary);
    margin-top: 40px;
}

/* Scrollbar Styling */
.chat-container::-webkit-scrollbar {
    width: 8px;
}

.chat-container::-webkit-scrollbar-track {
    background: var(--bg-color);
    border-radius: 4px;
}

.chat-container::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 4px;
}

.chat-container::-webkit-scrollbar-thumb:hover {
    background: var(--text-secondary);
}
EOF

echo -e "${GREEN}[4/4] Erstelle JavaScript Funktionalität...${NC}"

cat > app.js << 'EOF'
// API Base URL - Anpassen falls nötig
const API_BASE_URL = 'http://localhost:3000/api';

// DOM Elemente
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadStatus = document.getElementById('uploadStatus');
const uploadProgress = document.getElementById('uploadProgress');
const chatContainer = document.getElementById('chatContainer');
const questionInput = document.getElementById('questionInput');
const sendButton = document.getElementById('sendButton');
const refreshStatsButton = document.getElementById('refreshStatsButton');

let hasDocuments = false;

// ========== Initialisierung ==========
async function init() {
    setupEventListeners();
    await loadStats();
    await checkHealth();
}

// ========== Event Listeners ==========
function setupEventListeners() {
    // Upload Events
    uploadArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);

    // Drag & Drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    });

    // Chat Events
    sendButton.addEventListener('click', handleSendQuestion);
    questionInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendQuestion();
        }
    });

    // Stats Event
    refreshStatsButton.addEventListener('click', loadStats);
}

// ========== File Upload ==========
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        handleFileUpload(file);
    }
}

async function handleFileUpload(file) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
        showStatus('Nur PDF-Dateien werden unterstützt!', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    showStatus(`Lade "${file.name}" hoch...`, 'info');
    showProgress(true);

    try {
        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            showStatus(
                `✅ Erfolgreich hochgeladen: ${data.filename} (${data.chunks} Chunks in ${data.processingTime})`,
                'success'
            );
            hasDocuments = true;
            enableChat();
            await loadStats();
        } else {
            showStatus(`❌ Fehler: ${data.error}`, 'error');
        }
    } catch (error) {
        showStatus(`❌ Verbindungsfehler: ${error.message}`, 'error');
    } finally {
        showProgress(false);
        fileInput.value = '';
    }
}

// ========== Chat Funktionen ==========
async function handleSendQuestion() {
    const question = questionInput.value.trim();

    if (!question) {
        return;
    }

    // User-Nachricht anzeigen
    addMessage(question, 'user');
    questionInput.value = '';
    questionInput.disabled = true;
    sendButton.disabled = true;

    // Loading-Indikator
    const loadingId = addLoadingMessage();

    try {
        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ question })
        });

        const data = await response.json();

        removeMessage(loadingId);

        if (response.ok) {
            addMessage(data.answer, 'assistant', {
                sources: data.sources,
                processingTime: data.processingTime
            });
        } else {
            addMessage(`Fehler: ${data.error}`, 'assistant', { isError: true });
        }
    } catch (error) {
        removeMessage(loadingId);
        addMessage(`Verbindungsfehler: ${error.message}`, 'assistant', { isError: true });
    } finally {
        questionInput.disabled = false;
        sendButton.disabled = false;
        questionInput.focus();
    }
}

function addMessage(content, role, meta = {}) {
    // Willkommens-Nachricht entfernen
    const welcomeMsg = chatContainer.querySelector('.welcome-message');
    if (welcomeMsg) {
        welcomeMsg.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    messageDiv.dataset.messageId = Date.now();

    let metaHtml = '';
    if (meta.processingTime) {
        metaHtml += `<div class="message-meta">⏱️ ${meta.processingTime}</div>`;
    }
    if (meta.sources && meta.sources.length > 0) {
        const sourceList = meta.sources.map(s =>
            `📄 ${s.filename} (Chunk ${s.chunkIndex + 1}, Score: ${(s.score * 100).toFixed(1)}%)`
        ).join('<br>');
        metaHtml += `<div class="message-meta">Quellen:<br>${sourceList}</div>`;
    }

    messageDiv.innerHTML = `
        <div class="message-header">${role === 'user' ? '👤 Sie' : '🤖 Assistent'}</div>
        <div class="message-content">${escapeHtml(content)}</div>
        ${metaHtml}
    `;

    chatContainer.appendChild(messageDiv);
    messageDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });

    return messageDiv.dataset.messageId;
}

function addLoadingMessage() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant';
    const loadingId = 'loading-' + Date.now();
    messageDiv.dataset.messageId = loadingId;

    messageDiv.innerHTML = `
        <div class="message-header">🤖 Assistent</div>
        <div class="message-content"><span class="loading-indicator">Denke nach</span></div>
    `;

    chatContainer.appendChild(messageDiv);
    messageDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });

    return loadingId;
}

function removeMessage(messageId) {
    const message = chatContainer.querySelector(`[data-message-id="${messageId}"]`);
    if (message) {
        message.remove();
    }
}

function enableChat() {
    questionInput.disabled = false;
    sendButton.disabled = false;
    questionInput.placeholder = 'Ihre Frage hier eingeben...';
}

// ========== Statistik ==========
async function loadStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/stats`);
        const data = await response.json();

        if (response.ok) {
            document.getElementById('docCount').textContent = data.pointsCount || 0;
            document.getElementById('vectorCount').textContent = data.vectorCount || 0;

            if (data.pointsCount > 0) {
                hasDocuments = true;
                enableChat();
            }
        }
    } catch (error) {
        console.error('Fehler beim Laden der Statistik:', error);
    }
}

async function checkHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        const data = await response.json();

        const statusEl = document.getElementById('systemStatus');
        if (response.ok && data.status === 'ok') {
            statusEl.textContent = '✅ Online';
            statusEl.style.color = 'var(--success-color)';
        } else {
            statusEl.textContent = '❌ Offline';
            statusEl.style.color = 'var(--error-color)';
        }
    } catch (error) {
        document.getElementById('systemStatus').textContent = '❌ Offline';
        document.getElementById('systemStatus').style.color = 'var(--error-color)';
    }
}

// ========== Hilfsfunktionen ==========
function showStatus(message, type) {
    uploadStatus.textContent = message;
    uploadStatus.className = `status-message ${type}`;
}

function showProgress(show) {
    if (show) {
        uploadProgress.classList.remove('hidden');
        uploadProgress.querySelector('.progress-fill').style.width = '100%';
    } else {
        setTimeout(() => {
            uploadProgress.classList.add('hidden');
            uploadProgress.querySelector('.progress-fill').style.width = '0%';
        }, 500);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/\n/g, '<br>');
}

// ========== Start ==========
init();
EOF

echo -e "${GREEN}Web UI erfolgreich erstellt!${NC}"
echo ""
echo "=================================================="
echo "Installation abgeschlossen!"
echo "=================================================="
echo ""
echo -e "${YELLOW}Web UI Dateien:${NC}"
echo "  📁 Verzeichnis: /opt/rag-system/web-ui/"
echo "  📄 index.html - Hauptseite"
echo "  🎨 style.css  - Styling"
echo "  ⚡ app.js     - Funktionalität"
echo ""
echo -e "${YELLOW}Zugriff auf die Web UI:${NC}"
echo ""
echo "Option 1 - Einfacher Python Server:"
echo "  cd /opt/rag-system/web-ui"
echo "  python3 -m http.server 8080"
echo "  Dann: http://SERVER-IP:8080"
echo ""
echo "Option 2 - Mit Nginx (empfohlen):"
echo "  1. apt install nginx -y"
echo "  2. Nginx-Konfiguration erstellen (siehe Ausgabe unten)"
echo "  3. systemctl restart nginx"
echo "  Dann: http://SERVER-IP"
echo ""
echo -e "${YELLOW}Firewall-Ports öffnen (wenn nötig):${NC}"
echo "  ufw allow 8080  # Für Python Server"
echo "  ufw allow 80    # Für Nginx"
echo ""

# Optional: Nginx Config vorschlagen
echo -e "${YELLOW}Empfohlene Nginx-Konfiguration:${NC}"
echo "Erstelle Datei: /etc/nginx/sites-available/rag-ui"
echo ""
cat << 'NGINX_CONFIG'
server {
    listen 80;
    server_name _;

    # Web UI
    location / {
        root /opt/rag-system/web-ui;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API Proxy
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # Größere Timeouts für langsame LLM-Antworten
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;

        # Größere Upload-Größe für PDFs
        client_max_body_size 50M;
    }
}
NGINX_CONFIG

echo ""
echo -e "${GREEN}✅ Web UI Installation abgeschlossen!${NC}"
echo ""
