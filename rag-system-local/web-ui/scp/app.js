// API Base URL
const API_BASE_URL = 'http://45.92.217.15:3000/api';

// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadStatus = document.getElementById('uploadStatus');
const uploadProgress = document.getElementById('uploadProgress');
const chatContainer = document.getElementById('chatContainer');
const questionInput = document.getElementById('questionInput');
const sendButton = document.getElementById('sendButton');
const refreshStatsButton = document.getElementById('refreshStatsButton');
const darkModeToggle = document.getElementById('darkModeToggle');
const clearChatButton = document.getElementById('clearChatButton');

let hasDocuments = false;
let activeTimer = null;
let lastQueryTime = 0;

// Initialize
async function init() {
  setupEventListeners();
  loadDarkModePreference();
  await loadStats();
  await loadDocuments();
  await checkHealth();
}

// Event Listeners
function setupEventListeners() {
  // Upload
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
    if (files.length > 0) handleFileUpload(files[0]);
  });

  // Chat
  sendButton.addEventListener('click', handleSendQuestion);
  questionInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendQuestion();
    }
  });

  // Actions
  if (refreshStatsButton) refreshStatsButton.addEventListener('click', loadStats);
  if (darkModeToggle) darkModeToggle.addEventListener('click', toggleDarkMode);
  if (clearChatButton) clearChatButton.addEventListener('click', clearChat);
}

// Dark Mode
function loadDarkModePreference() {
  const isDark = localStorage.getItem('darkMode') === 'true';
  if (isDark) {
    document.body.classList.add('dark-mode');
    if (darkModeToggle) darkModeToggle.querySelector('span').textContent = '○';
  }
}

function toggleDarkMode() {
  const isDark = document.body.classList.toggle('dark-mode');
  localStorage.setItem('darkMode', isDark);
  if (darkModeToggle) darkModeToggle.querySelector('span').textContent = isDark ? '○' : '◐';
}

// Clear Chat
function clearChat() {
  const messages = chatContainer.querySelectorAll('.message');
  messages.forEach(msg => {
    msg.style.opacity = '0';
    setTimeout(() => msg.remove(), 300);
  });

  setTimeout(() => {
    const welcomeMsg = document.createElement('div');
    welcomeMsg.className = 'welcome-message';
    welcomeMsg.innerHTML = `
      <h3>Willkommen beim RAG System</h3>
      <p>Laden Sie ein PDF-Dokument hoch und stellen Sie Fragen zum Inhalt.</p>
    `;
    chatContainer.appendChild(welcomeMsg);
  }, 300);
}

// File Upload
function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) handleFileUpload(file);
}

async function handleFileUpload(file) {
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    showStatus('Nur PDF-Dateien werden unterstützt!', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  showStatus(`Lade "${file.name}" hoch...`, 'info');
  showProgress(true, 0);

  try {
    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (response.ok) {
      showProgress(true, 100);
      const seconds = (data.processingTime / 1000).toFixed(1);
      showStatus(
        `✅ Erfolgreich: ${data.filename} (${data.chunks} Chunks in ${seconds}s)`,
        'success'
      );
      hasDocuments = true;
      enableChat();
      await loadStats();
      await loadDocuments();
    } else {
      showStatus(`❌ Fehler: ${data.error}`, 'error');
    }
  } catch (error) {
    showStatus(`❌ Verbindungsfehler: ${error.message}`, 'error');
  } finally {
    setTimeout(() => showProgress(false), 1000);
    fileInput.value = '';
  }
}

// Chat
async function handleSendQuestion() {
  const question = questionInput.value.trim();
  if (!question) return;

  addMessage(question, 'user');
  questionInput.value = '';
  questionInput.disabled = true;
  sendButton.disabled = true;

  const loadingId = addLoadingMessageWithTimer();

  try {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });

    const data = await response.json();
    removeMessage(loadingId);

    if (response.ok) {
      lastQueryTime = data.processingTime;
      updateLastQueryTime();
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
  const welcomeMsg = chatContainer.querySelector('.welcome-message');
  if (welcomeMsg) {
    welcomeMsg.style.opacity = '0';
    setTimeout(() => welcomeMsg.remove(), 300);
  }

  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;
  messageDiv.dataset.messageId = Date.now();
  messageDiv.style.opacity = '0';

  let metaHtml = '';
  if (meta.processingTime) {
    const seconds = (meta.processingTime / 1000).toFixed(1);
    metaHtml += `<div class="message-meta"><span class="timer">⏱️ ${seconds}s</span></div>`;
  }
  if (meta.sources && meta.sources.length > 0) {
    const sourceList = meta.sources.map(s =>
      typeof s === 'string' ? `<span class="source-badge">📄 ${escapeHtml(s)}</span>` :
      `<span class="source-badge">📄 ${escapeHtml(s.filename)}</span>`
    ).join('');
    metaHtml += `<div class="message-meta sources-meta">Quellen: ${sourceList}</div>`;
  }

  const contentHtml = role === 'assistant' ? renderMarkdown(content) : escapeHtml(content).replace(/\n/g, '<br>');

  messageDiv.innerHTML = `
    <div class="message-header">${role === 'user' ? '👤 Sie' : '🤖 Assistent'}</div>
    <div class="message-content">${contentHtml}</div>
    ${metaHtml}
  `;

  chatContainer.appendChild(messageDiv);
  requestAnimationFrame(() => {
    messageDiv.style.opacity = '1';
    messageDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });
  });

  return messageDiv.dataset.messageId;
}

function addLoadingMessageWithTimer() {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message assistant loading-message';
  const loadingId = 'loading-' + Date.now();
  messageDiv.dataset.messageId = loadingId;
  messageDiv.style.opacity = '0';

  let seconds = 0;
  const timerInterval = setInterval(() => {
    seconds += 0.1;
    const timerEl = messageDiv.querySelector('.live-timer');
    if (timerEl) timerEl.textContent = seconds.toFixed(1) + 's';
  }, 100);

  messageDiv.dataset.timerInterval = timerInterval;
  activeTimer = timerInterval;

  messageDiv.innerHTML = `
    <div class="message-header">🤖 Assistent</div>
    <div class="message-content">
      <span class="typing-indicator">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </span>
      <span class="thinking-text">Denke nach</span>
      <span class="live-timer">0.0s</span>
    </div>
  `;

  chatContainer.appendChild(messageDiv);
  requestAnimationFrame(() => {
    messageDiv.style.opacity = '1';
    messageDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });
  });

  return loadingId;
}

function removeMessage(messageId) {
  const message = chatContainer.querySelector(`[data-message-id="${messageId}"]`);
  if (message) {
    const timerId = message.dataset.timerInterval;
    if (timerId) {
      clearInterval(parseInt(timerId));
      if (activeTimer === parseInt(timerId)) activeTimer = null;
    }
    message.style.opacity = '0';
    setTimeout(() => message.remove(), 300);
  }
}

function enableChat() {
  questionInput.disabled = false;
  sendButton.disabled = false;
  questionInput.placeholder = 'Stellen Sie eine Frage zu Ihrem Dokument...';
}

// Markdown Rendering
function renderMarkdown(text) {
  let html = escapeHtml(text);
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) =>
    `<pre class="code-block"><code class="language-${lang || 'plaintext'}">${code.trim()}</code></pre>`
  );
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  html = html.replace(/\n/g, '<br>');
  return html;
}

// Stats
async function loadStats() {
  try {
    const response = await fetch(`${API_BASE_URL}/stats`);
    const data = await response.json();

    if (response.ok) {
      // Update Header Status Bar
      const docCountEl = document.getElementById('docCount');
      const vectorCountEl = document.getElementById('vectorCount');

      if (docCountEl) {
        animateValue('docCount', parseInt(docCountEl.textContent) || 0, data.points_count || 0, 500);
      }
      if (vectorCountEl) {
        animateValue('vectorCount', parseInt(vectorCountEl.textContent) || 0, data.indexed_vectors_count || 0, 500);
      }

      // Update Sidebar Stats (if exists)
      const chunkCountEl = document.getElementById('chunkCount');
      const indexedCountEl = document.getElementById('indexedCount');
      if (chunkCountEl) chunkCountEl.textContent = data.points_count !== undefined ? data.points_count : '-';
      if (indexedCountEl) indexedCountEl.textContent = data.indexed_vectors_count !== undefined ? data.indexed_vectors_count : '-';

      if (data.points_count > 0) {
        hasDocuments = true;
        enableChat();
      }
    }
  } catch (error) {
    console.error('Stats error:', error);
  }
}

async function checkHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    const data = await response.json();

    const statusEl = document.getElementById('systemStatus');
    if (!statusEl) return;

    if (response.ok && data.status === 'ok') {
      statusEl.className = 'status-badge online';
      statusEl.innerHTML = '<span class="status-indicator"></span><span class="status-text">Online</span>';
    } else {
      statusEl.className = 'status-badge offline';
      statusEl.innerHTML = '<span class="status-indicator"></span><span class="status-text">Offline</span>';
    }
  } catch (error) {
    const statusEl = document.getElementById('systemStatus');
    if (statusEl) {
      statusEl.className = 'status-badge offline';
      statusEl.innerHTML = '<span class="status-indicator"></span><span class="status-text">Offline</span>';
    }
  }
}

function updateLastQueryTime() {
  const lastQueryTimeEl = document.getElementById('lastQueryTime');
  if (lastQueryTimeEl && lastQueryTime > 0) {
    const seconds = (lastQueryTime / 1000).toFixed(1);
    lastQueryTimeEl.textContent = `${seconds}s`;
  }
}

// Helpers
function showStatus(message, type) {
  uploadStatus.textContent = message;
  uploadStatus.className = `status-message ${type}`;
}

function showProgress(show, percent = 0) {
  if (show) {
    uploadProgress.classList.remove('hidden');
    const fillEl = uploadProgress.querySelector('.progress-fill');
    const textEl = uploadProgress.querySelector('.progress-text');
    if (fillEl) fillEl.style.width = `${percent}%`;
    if (textEl) textEl.textContent = `${percent}%`;
  } else {
    setTimeout(() => {
      uploadProgress.classList.add('hidden');
      const fillEl = uploadProgress.querySelector('.progress-fill');
      if (fillEl) fillEl.style.width = '0%';
    }, 500);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + ' ' + sizes[i];
}

function animateValue(id, start, end, duration) {
  const element = document.getElementById(id);
  if (!element) return;

  const range = end - start;
  const increment = range / (duration / 16);
  let current = start;

  const timer = setInterval(() => {
    current += increment;
    if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
      current = end;
      clearInterval(timer);
    }
    element.textContent = Math.floor(current);
  }, 16);
}

// Documents
async function loadDocuments() {
  try {
    const response = await fetch(`${API_BASE_URL}/documents`);
    const data = await response.json();

    const documentsList = document.getElementById('documentsList');
    if (!documentsList) return;

    if (response.ok && data.documents && data.documents.length > 0) {
      documentsList.innerHTML = data.documents.map(doc => {
        const date = doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) : 'Unbekannt';

        const fileSize = doc.fileSize ? formatFileSize(doc.fileSize) : '-';
        const pages = doc.pages || '-';
        const indexingTime = doc.indexingTime ? `${(doc.indexingTime / 1000).toFixed(1)}s` : '-';

        return `
          <div class="document-item">
            <div class="document-name">${escapeHtml(doc.filename)}</div>
            <div class="document-meta">
              ${doc.chunks} Chunks • ${pages} Seiten • ${fileSize}
            </div>
            <div class="document-meta">
              Indexiert: ${indexingTime} • ${date}
            </div>
          </div>
        `;
      }).join('');
    } else {
      documentsList.innerHTML = '<p class="no-documents">Keine Dokumente hochgeladen</p>';
    }
  } catch (error) {
    console.error('Documents error:', error);
  }
}

// Start
init();
