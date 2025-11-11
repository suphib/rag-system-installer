// API Base URL - Anpassen falls nötig
const API_BASE_URL = 'http://45.92.217.15:3000/api';

// DOM Elemente
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadStatus = document.getElementById('uploadStatus');
const uploadProgress = document.getElementById('uploadProgress');
const chatContainer = document.getElementById('chatContainer');
const questionInput = document.getElementById('questionInput');
const sendButton = document.getElementById('sendButton');
const refreshStatsButton = document.getElementById('refreshStatsButton');
const darkModeToggle = document.getElementById('darkModeToggle');

let hasDocuments = false;
let activeTimer = null;

// ========== Initialisierung ==========
async function init() {
  setupEventListeners();
  loadDarkModePreference();
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

  // Dark Mode Toggle
  if (darkModeToggle) {
    darkModeToggle.addEventListener('click', toggleDarkMode);
  }
}

// ========== Dark Mode ==========
function loadDarkModePreference() {
  const isDark = localStorage.getItem('darkMode') === 'true';
  if (isDark) {
    document.body.classList.add('dark-mode');
    if (darkModeToggle) {
      darkModeToggle.textContent = '☀️';
    }
  }
}

function toggleDarkMode() {
  const isDark = document.body.classList.toggle('dark-mode');
  localStorage.setItem('darkMode', isDark);
  darkModeToggle.textContent = isDark ? '☀️' : '🌙';
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
      const seconds = (data.processingTime / 1000).toFixed(1);
      showStatus(
        `✅ Erfolgreich hochgeladen: ${data.filename} (${data.chunks} Chunks in ${seconds}s)`,
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

  // Loading-Indikator mit Timer
  const loadingId = addLoadingMessageWithTimer();

  const startTime = Date.now();

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
    welcomeMsg.style.opacity = '0';
    setTimeout(() => welcomeMsg.remove(), 300);
  }

  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;
  messageDiv.dataset.messageId = Date.now();
  messageDiv.style.opacity = '0';

  let metaHtml = '';

  // Processing Time in Sekunden
  if (meta.processingTime) {
    const seconds = (meta.processingTime / 1000).toFixed(1);
    metaHtml += `<div class="message-meta"><span class="timer">⏱️ ${seconds}s</span></div>`;
  }

  // Sources
  if (meta.sources && meta.sources.length > 0) {
    const sourceList = meta.sources.map(s => {
      if (typeof s === 'string') {
        return `<span class="source-badge">📄 ${escapeHtml(s)}</span>`;
      } else {
        return `<span class="source-badge">📄 ${escapeHtml(s.filename)} (Chunk ${s.chunkIndex + 1})</span>`;
      }
    }).join('');
    metaHtml += `<div class="message-meta sources-meta">Quellen: ${sourceList}</div>`;
  }

  // Markdown-Rendering für Assistent
  let contentHtml;
  if (role === 'assistant') {
    contentHtml = renderMarkdown(content);
  } else {
    contentHtml = escapeHtml(content).replace(/\n/g, '<br>');
  }

  messageDiv.innerHTML = `
        <div class="message-header">${role === 'user' ? '👤 Sie' : '🤖 Assistent'}</div>
        <div class="message-content">${contentHtml}</div>
        ${metaHtml}
    `;

  chatContainer.appendChild(messageDiv);

  // Fade-in Animation
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

  // Timer starten
  let seconds = 0;
  const timerInterval = setInterval(() => {
    seconds += 0.1;
    const timerEl = messageDiv.querySelector('.live-timer');
    if (timerEl) {
      timerEl.textContent = seconds.toFixed(1) + 's';
    }
  }, 100);

  // Timer-ID speichern
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

  // Fade-in Animation
  requestAnimationFrame(() => {
    messageDiv.style.opacity = '1';
    messageDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });
  });

  return loadingId;
}

function removeMessage(messageId) {
  const message = chatContainer.querySelector(`[data-message-id="${messageId}"]`);
  if (message) {
    // Timer stoppen
    const timerId = message.dataset.timerInterval;
    if (timerId) {
      clearInterval(parseInt(timerId));
      if (activeTimer === parseInt(timerId)) {
        activeTimer = null;
      }
    }

    // Fade-out Animation
    message.style.opacity = '0';
    setTimeout(() => message.remove(), 300);
  }
}

function enableChat() {
  questionInput.disabled = false;
  sendButton.disabled = false;
  questionInput.placeholder = 'Ihre Frage hier eingeben...';
}

// ========== Markdown Rendering ==========
function renderMarkdown(text) {
  let html = escapeHtml(text);

  // Code-Blöcke (```code```)
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    return `<pre class="code-block"><code class="language-${lang || 'plaintext'}">${code.trim()}</code></pre>`;
  });

  // Inline Code (`code`)
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // Fett (**text**)
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Kursiv (*text*)
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Listen (- item)
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

  // Links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

  // Zeilenumbrüche
  html = html.replace(/\n/g, '<br>');

  return html;
}

// ========== Statistik ==========
async function loadStats() {
  try {
    const response = await fetch(`${API_BASE_URL}/stats`);
    const data = await response.json();

    if (response.ok) {
      animateValue('docCount', 0, data.points_count || 0, 500);
      animateValue('vectorCount', 0, data.indexed_vectors_count || 0, 500);

      if (data.points_count > 0) {
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
      statusEl.innerHTML = '<span class="status-badge success">✅ Online</span>';
    } else {
      statusEl.innerHTML = '<span class="status-badge error">❌ Offline</span>';
    }
  } catch (error) {
    document.getElementById('systemStatus').innerHTML = '<span class="status-badge error">❌ Offline</span>';
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
  return div.innerHTML;
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

// ========== Start ==========
init();
