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

// Helper function to get file icon
function getFileIcon(filename) {
  const ext = filename.toLowerCase();
  if (ext.endsWith('.pdf')) return '📄';
  if (ext.endsWith('.xlsx') || ext.endsWith('.xls')) return '📊';
  if (ext.endsWith('.docx') || ext.endsWith('.doc')) return '📝';
  if (ext.endsWith('.pptx') || ext.endsWith('.ppt')) return '📊';
  return '📎';
}

// Helper function to format metadata
function getMetadataText(doc) {
  const parts = [];
  parts.push(`${doc.chunks} Chunks`);

  if (doc.pages) parts.push(`${doc.pages} Seiten`);
  if (doc.sheetCount) parts.push(`${doc.sheetCount} Sheets`);
  if (doc.slideCount) parts.push(`${doc.slideCount} Slides`);
  if (doc.wordCount) parts.push(`${doc.wordCount} Wörter`);

  if (doc.fileSize) {
    const size = doc.fileSize > 1024 * 1024
      ? `${(doc.fileSize / (1024 * 1024)).toFixed(1)} MB`
      : `${(doc.fileSize / 1024).toFixed(1)} KB`;
    parts.push(size);
  }

  return parts.join(' • ');
}

// Toast Notification System
function showToast(title, message, type = 'info', duration = 5000) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || icons.info}</div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      ${message ? `<div class="toast-message">${message}</div>` : ''}
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;

  container.appendChild(toast);

  // Auto remove after duration
  if (duration > 0) {
    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  return toast;
}

// Confirmation Modal
function showConfirmModal(options) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">
            <div class="modal-icon warning">${options.icon || '⚠️'}</div>
            <span>${options.title || 'Bestätigung erforderlich'}</span>
          </div>
        </div>
        <div class="modal-body">
          <div class="modal-message">${options.message || ''}</div>
          ${options.details ? `<div class="modal-details">${options.details}</div>` : ''}
        </div>
        <div class="modal-footer">
          <button class="modal-button cancel">${options.cancelText || 'Abbrechen'}</button>
          <button class="modal-button confirm">${options.confirmText || 'Löschen'}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const cancelBtn = overlay.querySelector('.modal-button.cancel');
    const confirmBtn = overlay.querySelector('.modal-button.confirm');

    const close = (result) => {
      overlay.classList.add('removing');
      setTimeout(() => {
        overlay.remove();
        resolve(result);
      }, 200);
    };

    cancelBtn.addEventListener('click', () => close(false));
    confirmBtn.addEventListener('click', () => close(true));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(false);
    });
  });
}

// Model Management
function getModelDescription(modelName) {
  const name = modelName.toLowerCase();
  if (name.includes('mistral')) return 'schnell';
  if (name.includes('70b')) return 'sehr präzise';
  if (name.includes('8b') && name.includes('3.1')) return 'balanced';
  if (name.includes('3b')) return 'ultraschnell';
  return 'standard';
}

async function loadCurrentModel() {
  try {
    const response = await fetch(`${API_BASE_URL}/model`);
    const data = await response.json();

    if (response.ok) {
      const modelSelect = document.getElementById('modelSelect');
      if (modelSelect) {
        // Clear existing options
        modelSelect.innerHTML = '';

        // Add available models from backend
        if (data.available && data.available.length > 0) {
          data.available.forEach(model => {
            const option = document.createElement('option');
            option.value = model.value;

            // Calculate size in GB
            const sizeGB = (model.size / (1024 * 1024 * 1024)).toFixed(1);
            const description = getModelDescription(model.value);

            // Format: "Llama 3.1 8B • 4.7GB • balanced"
            option.textContent = `${model.label} • ${sizeGB}GB • ${description}`;

            modelSelect.appendChild(option);
          });

          // Set current model as selected
          modelSelect.value = data.model;
          console.log(`Current model: ${data.model}, Available: ${data.available.length} models`);
        } else {
          // Fallback if no models available
          const option = document.createElement('option');
          option.value = data.model || 'llama3.1:8b';
          option.textContent = data.model || 'llama3.1:8b';
          modelSelect.appendChild(option);
          modelSelect.value = data.model;
        }
      }
    }
  } catch (error) {
    console.error('Failed to load current model:', error);
    // Fallback UI
    const modelSelect = document.getElementById('modelSelect');
    if (modelSelect) {
      modelSelect.innerHTML = '<option value="llama3.1:8b">Llama 3.1 8B (offline)</option>';
    }
  }
}

async function handleModelChange(event) {
  const newModel = event.target.value;
  const modelSelect = document.getElementById('modelSelect');

  try {
    const response = await fetch(`${API_BASE_URL}/model`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: newModel })
    });

    const data = await response.json();

    if (response.ok) {
      showToast(
        'Model gewechselt',
        `Aktives Model: ${newModel}`,
        'success',
        3000
      );
      console.log(`Switched to model: ${newModel}`);
    } else {
      showToast(
        'Fehler beim Wechseln',
        data.error || 'Model konnte nicht gewechselt werden',
        'error'
      );
      // Revert selection on error
      await loadCurrentModel();
    }
  } catch (error) {
    showToast(
      'Verbindungsfehler',
      `Konnte Model nicht wechseln: ${error.message}`,
      'error'
    );
    // Revert selection on error
    await loadCurrentModel();
  }
}

function showModelInfo() {
  // Direkt die Vergleichstabelle zeigen
  showAllModelsComparison();
}

function showAllModelsComparison() {
  showConfirmModal({
    title: 'Model-Vergleich & Empfehlungen',
    icon: '📊',
    message: 'Wählen Sie das passende Model für Ihre Anforderungen:',
    details: `
      <div style="overflow-x: auto; margin-top: 12px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background: rgba(99, 102, 241, 0.1);">
              <th style="padding: 8px; text-align: left; border: 1px solid rgba(0,0,0,0.1);">Model</th>
              <th style="padding: 8px; text-align: left; border: 1px solid rgba(0,0,0,0.1);">Wann verwenden?</th>
              <th style="padding: 8px; text-align: left; border: 1px solid rgba(0,0,0,0.1);">Performance</th>
              <th style="padding: 8px; text-align: left; border: 1px solid rgba(0,0,0,0.1);">RAM</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background: rgba(16, 185, 129, 0.05);">
              <td style="padding: 8px; border: 1px solid rgba(0,0,0,0.1);"><strong>Llama 3.1 8B ⚡</strong></td>
              <td style="padding: 8px; border: 1px solid rgba(0,0,0,0.1);">Standard-Analysen, schnelle Antworten</td>
              <td style="padding: 8px; border: 1px solid rgba(0,0,0,0.1);">20-30 tok/s</td>
              <td style="padding: 8px; border: 1px solid rgba(0,0,0,0.1);">8-12 GB</td>
            </tr>
            <tr style="background: rgba(168, 85, 247, 0.05);">
              <td style="padding: 8px; border: 1px solid rgba(0,0,0,0.1);"><strong>Mistral 7B 🚀</strong></td>
              <td style="padding: 8px; border: 1px solid rgba(0,0,0,0.1);">Schnell & effizient, gute Alternative zu Llama</td>
              <td style="padding: 8px; border: 1px solid rgba(0,0,0,0.1);">25-35 tok/s</td>
              <td style="padding: 8px; border: 1px solid rgba(0,0,0,0.1);">6-8 GB</td>
            </tr>
            <tr style="background: rgba(239, 68, 68, 0.05);">
              <td style="padding: 8px; border: 1px solid rgba(0,0,0,0.1);"><strong>Llama 3.1 70B 🔥</strong></td>
              <td style="padding: 8px; border: 1px solid rgba(0,0,0,0.1);">Wissenschaftliche Arbeiten, höchste Präzision</td>
              <td style="padding: 8px; border: 1px solid rgba(0,0,0,0.1);">3-5 tok/s</td>
              <td style="padding: 8px; border: 1px solid rgba(0,0,0,0.1);">40+ GB</td>
            </tr>
            <tr style="background: rgba(245, 158, 11, 0.05);">
              <td style="padding: 8px; border: 1px solid rgba(0,0,0,0.1);"><strong>Llama 3.2 3B ⚡⚡</strong></td>
              <td style="padding: 8px; border: 1px solid rgba(0,0,0,0.1);">Einfache Fragen, begrenzte Ressourcen</td>
              <td style="padding: 8px; border: 1px solid rgba(0,0,0,0.1);">40-50 tok/s</td>
              <td style="padding: 8px; border: 1px solid rgba(0,0,0,0.1);">4-6 GB</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style="margin-top: 12px; padding: 8px; background: rgba(99, 102, 241, 0.1); border-radius: 6px; font-size: 12px;">
        <strong>💡 Tipp:</strong> Starten Sie mit <strong>Llama 3.1 8B</strong> oder <strong>Mistral 7B</strong> und wechseln Sie zu größeren Models nur wenn nötig.
      </div>
    `,
    confirmText: 'Verstanden',
    cancelText: ''
  });
}

// Initialize
async function init() {
  setupEventListeners();
  loadDarkModePreference();
  await loadCurrentModel();
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

  // Model selector
  const modelSelect = document.getElementById('modelSelect');
  if (modelSelect) modelSelect.addEventListener('change', handleModelChange);

  // Model info button
  const modelInfoBtn = document.getElementById('modelInfoBtn');
  if (modelInfoBtn) {
    modelInfoBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showModelInfo();
    });
  }
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
  const ext = file.name.toLowerCase();
  const validExtensions = ['.pdf', '.xlsx', '.xls', '.docx', '.doc', '.pptx', '.ppt'];
  const isValid = validExtensions.some(validExt => ext.endsWith(validExt));

  if (!isValid) {
    showStatus('Unterstützte Formate: PDF, Excel, Word, PowerPoint', 'error');
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
        processingTime: data.processingTime,
        model: data.model
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

  // Model badge for assistant messages
  if (role === 'assistant' && meta.model) {
    const modelDisplay = meta.model.replace('llama3.1:', 'Llama 3.1 ').replace('llama3.2:', 'Llama 3.2 ').replace(':8b', ' 8B').replace(':13b', ' 13B').replace(':70b', ' 70B').replace(':3b', ' 3B');
    metaHtml += `<div class="message-meta"><span class="model-badge">🤖 ${modelDisplay}</span>`;
    if (meta.processingTime) {
      const seconds = (meta.processingTime / 1000).toFixed(1);
      metaHtml += ` <span class="timer">⏱️ ${seconds}s</span>`;
    }
    metaHtml += `</div>`;
  } else if (meta.processingTime) {
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

    const documentsTable = document.getElementById('documentsTable');
    if (!documentsTable) return;

    if (response.ok && data.documents && data.documents.length > 0) {
      const tableRows = data.documents.map(doc => {
        const date = doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) : 'Unbekannt';

        const fileIcon = getFileIcon(doc.filename);
        const fileSize = doc.fileSize ? formatFileSize(doc.fileSize) : '-';

        // File-specific metadata
        let infoCell = '-';
        if (doc.pages) infoCell = `${doc.pages} Seiten`;
        else if (doc.sheetCount) infoCell = `${doc.sheetCount} Sheets`;
        else if (doc.slideCount) infoCell = `${doc.slideCount} Slides`;
        else if (doc.wordCount) infoCell = `${doc.wordCount} Wörter`;

        const indexingTime = doc.indexingTime ? `${(doc.indexingTime / 1000).toFixed(1)}s` : '-';

        return `
          <tr>
            <td class="filename-cell">
              <a href="${API_BASE_URL}/documents/${encodeURIComponent(doc.filename)}/view"
                 target="_blank"
                 class="pdf-link"
                 title="Datei in neuem Tab öffnen">
                ${fileIcon} ${escapeHtml(doc.filename)}
              </a>
            </td>
            <td class="number-cell">${doc.chunks}</td>
            <td class="number-cell">${infoCell}</td>
            <td class="number-cell">${fileSize}</td>
            <td class="number-cell">${indexingTime}</td>
            <td class="date-cell">${date}</td>
            <td class="actions-cell">
              <button class="view-doc-btn" onclick="window.open('${API_BASE_URL}/documents/${encodeURIComponent(doc.filename)}/view', '_blank')" title="Datei ansehen">
                Ansehen
              </button>
              <button class="download-doc-btn" onclick="window.location.href='${API_BASE_URL}/documents/${encodeURIComponent(doc.filename)}/download'" title="Datei herunterladen">
                Download
              </button>
              <button class="delete-doc-btn" onclick="deleteDocument('${escapeHtml(doc.filename)}')" title="Dokument löschen">
                Löschen
              </button>
            </td>
          </tr>
        `;
      }).join('');

      documentsTable.innerHTML = `
        <table class="documents-table">
          <thead>
            <tr>
              <th>Dateiname</th>
              <th>Chunks</th>
              <th>Info</th>
              <th>Größe</th>
              <th>Indexierung</th>
              <th>Hochgeladen</th>
              <th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      `;
    } else {
      documentsTable.innerHTML = '<p class="no-documents">Keine Dokumente hochgeladen</p>';
    }
  } catch (error) {
    console.error('Documents error:', error);
  }
}

// Delete Document
async function deleteDocument(filename) {
  const confirmed = await showConfirmModal({
    title: 'Dokument löschen',
    icon: '🗑️',
    message: `Möchten Sie "${filename}" wirklich unwiderruflich löschen?`,
    details: 'Alle Chunks und Vektoren werden permanent aus der Datenbank entfernt.',
    confirmText: 'Ja, löschen',
    cancelText: 'Abbrechen'
  });

  if (!confirmed) return;

  try {
    const response = await fetch(`${API_BASE_URL}/documents/${encodeURIComponent(filename)}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (response.ok) {
      showToast(
        'Erfolgreich gelöscht',
        `"${filename}" wurde mit ${data.deletedChunks} Chunks entfernt`,
        'success'
      );
      await loadStats();
      await loadDocuments();
    } else {
      showToast(
        'Fehler beim Löschen',
        data.error || 'Das Dokument konnte nicht gelöscht werden',
        'error'
      );
    }
  } catch (error) {
    showToast(
      'Verbindungsfehler',
      `Konnte nicht mit Server verbinden: ${error.message}`,
      'error'
    );
  }
}

// Make deleteDocument available globally
window.deleteDocument = deleteDocument;

// Start
init();
