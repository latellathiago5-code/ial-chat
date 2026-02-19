const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000/api' 
  : '/api';
let token = localStorage.getItem('ial_token');
let currentChatId = null;
let socket = null;
let typingTimeout = null;

// Auth
const authModal = document.getElementById('authModal');
const authForm = document.getElementById('authForm');
const app = document.getElementById('app');
let isRegisterMode = false;

if (token) {
  authModal.style.display = 'none';
  app.style.display = 'flex';
  initApp();
} else {
  authModal.style.display = 'flex';
}

authForm.onsubmit = async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;
  const username = document.getElementById('authUsername').value;

  try {
    const endpoint = isRegisterMode ? '/auth/register' : '/auth/login';
    const body = isRegisterMode 
      ? { username, email, password }
      : { email, password };

    const res = await fetch(API_URL + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    
    if (!res.ok) throw new Error(data.error);

    token = data.token;
    localStorage.setItem('ial_token', token);
    
    authModal.style.display = 'none';
    app.style.display = 'flex';
    initApp();
  } catch (err) {
    alert(err.message);
  }
};

function toggleAuthMode(e) {
  e.preventDefault();
  isRegisterMode = !isRegisterMode;
  
  const title = document.getElementById('authTitle');
  const usernameInput = document.getElementById('authUsername');
  const toggleText = document.getElementById('authToggleText');
  const toggleLink = e.target;
  
  if (isRegisterMode) {
    title.textContent = 'Registrarse';
    usernameInput.style.display = 'block';
    usernameInput.required = true;
    toggleText.textContent = '¿Ya tenés cuenta?';
    toggleLink.textContent = 'Iniciá sesión';
  } else {
    title.textContent = 'Iniciar Sesión';
    usernameInput.style.display = 'none';
    usernameInput.required = false;
    toggleText.textContent = '¿No tenés cuenta?';
    toggleLink.textContent = 'Registrate';
  }
}

function logout() {
  localStorage.removeItem('ial_token');
  location.reload();
}

// Init
async function initApp() {
  await loadTheme();
  await loadChats();
  initWebSocket();
  initParticles();
}

// WebSocket
function initWebSocket() {
  const socketUrl = window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : window.location.origin;
  
  socket = io(socketUrl);
  
  socket.on('connect', () => {
    console.log('WebSocket conectado');
  });

  socket.on('message-received', (data) => {
    if (data.chatId === currentChatId && data.userId !== getUserId()) {
      appendMessage(data.message);
    }
  });

  socket.on('user-typing', (data) => {
    if (data.chatId === currentChatId) {
      showTypingIndicator();
    }
  });
}

function getUserId() {
  if (!token) return null;
  const payload = JSON.parse(atob(token.split('.')[1]));
  return payload.id;
}

// Tema
async function loadTheme() {
  const savedTheme = localStorage.getItem("theme") || "dark";
  document.getElementById("themeSelect").value = savedTheme;
  document.body.classList.remove("theme-dark", "theme-light");
  if (savedTheme === "dark") {
    document.body.classList.add("theme-dark");
  } else {
    document.body.classList.add("theme-light");
  }
}

function changeTheme() {
  const theme = document.getElementById("themeSelect").value;
  document.body.classList.remove("theme-dark", "theme-light");
  if (theme === "dark") {
    document.body.classList.add("theme-dark");
    localStorage.setItem("theme", "dark");
  } else {
    document.body.classList.add("theme-light");
    localStorage.setItem("theme", "light");
  }
}


// Chats
async function loadChats() {
  try {
    const res = await fetch(API_URL + '/chat', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const chats = await res.json();
    renderChatList(chats);
  } catch (err) {
    console.error('Error cargando chats:', err);
  }
}

function renderChatList(chats) {
  const list = document.getElementById('chatList');
  list.innerHTML = '';

  chats.forEach(chat => {
    const div = document.createElement('div');
    div.className = 'chatItem' + (chat._id === currentChatId ? ' active' : '');

    const span = document.createElement('span');
    span.textContent = chat.title || 'Nuevo chat';

    const editBtn = document.createElement('button');
    editBtn.textContent = '✏️';
    editBtn.style.background = 'none';
    editBtn.style.border = 'none';
    editBtn.style.cursor = 'pointer';
    editBtn.style.fontSize = '14px';
    editBtn.style.marginLeft = 'auto';
    editBtn.style.marginRight = '4px';
    editBtn.onclick = (e) => {
      e.stopPropagation();
      renameChat(span, chat._id);
    };

    const del = document.createElement('button');
    del.textContent = '✕';
    del.onclick = e => {
      e.stopPropagation();
      deleteChat(chat._id);
    };

    div.onclick = () => openChat(chat._id);

    div.appendChild(span);
    div.appendChild(editBtn);
    div.appendChild(del);
    list.appendChild(div);
  });
}

async function newChat() {
  try {
    const res = await fetch(API_URL + '/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title: 'Nuevo chat' })
    });
    const chat = await res.json();
    await loadChats();
    openChat(chat._id);
  } catch (err) {
    console.error('Error creando chat:', err);
  }
}

async function openChat(id) {
  currentChatId = id;

  try {
    const res = await fetch(API_URL + `/chat/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const chat = await res.json();

    const panel = document.getElementById('chatPanel');
    panel.innerHTML = '';

    chat.messages.forEach(m => {
      appendMessage(m);
    });

    document.getElementById('topTitle').textContent = chat.title || 'iaL';
    document.getElementById('clearBtn').style.display = 'inline-block';
    document.getElementById('exportBtn').style.display = 'inline-block';
    document.getElementById('shareBtn').style.display = 'inline-block';

    scrollToBottom();
    await loadChats();
    
    if (socket) {
      socket.emit('join-chat', id);
    }
  } catch (err) {
    console.error('Error abriendo chat:', err);
  }
}

function appendMessage(msg) {
  const panel = document.getElementById('chatPanel');
  const div = document.createElement('div');
  div.className = 'msg ' + msg.role;

  if (msg.role === 'bot' && typeof marked !== 'undefined') {
    div.innerHTML = marked.parse(msg.text);
  } else {
    div.textContent = msg.text;
  }

  if (msg.attachments && msg.attachments.length > 0) {
    msg.attachments.forEach(att => {
      if (att.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = att.url;
        div.appendChild(img);
      } else {
        const link = document.createElement('a');
        link.href = att.url;
        link.textContent = att.filename;
        link.className = 'attachment';
        link.target = '_blank';
        div.appendChild(link);
      }
    });
  }

  panel.appendChild(div);
  scrollToBottom();
}

async function sendMsg() {
  const input = document.getElementById('msgInput');
  const text = input.value.trim();
  if (!text) return;

  if (!currentChatId) {
    alert('Creá un chat primero');
    return;
  }

  input.value = '';

  try {
    // Enviar mensaje del usuario
    await fetch(API_URL + `/chat/${currentChatId}/message`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role: 'user', text })
    });

    appendMessage({ role: 'user', text });

    if (socket) {
      socket.emit('new-message', {
        chatId: currentChatId,
        userId: getUserId(),
        message: { role: 'user', text }
      });
    }

    playSound('send');

    // Mostrar typing
    showTypingIndicator();

    // Obtener respuesta de IA
    const res = await fetch(API_URL + '/ai/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [{ role: 'user', text }]
      })
    });

    const data = await res.json();
    hideTypingIndicator();

    const botText = data.text || data.fallback;

    // Guardar respuesta del bot
    await fetch(API_URL + `/chat/${currentChatId}/message`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role: 'bot', text: botText })
    });

    appendMessage({ role: 'bot', text: botText });

    if (socket) {
      socket.emit('new-message', {
        chatId: currentChatId,
        userId: getUserId(),
        message: { role: 'bot', text: botText }
      });
    }

    playSound('receive');

    await loadChats();
  } catch (err) {
    hideTypingIndicator();
    console.error('Error enviando mensaje:', err);
    alert('Error al enviar mensaje');
  }
}

function handleTyping() {
  if (!socket || !currentChatId) return;

  clearTimeout(typingTimeout);
  
  socket.emit('typing', {
    chatId: currentChatId,
    userId: getUserId()
  });

  typingTimeout = setTimeout(() => {
    // Usuario dejó de escribir
  }, 1000);
}

function showTypingIndicator() {
  hideTypingIndicator();
  const panel = document.getElementById('chatPanel');
  const typing = document.createElement('div');
  typing.className = 'typing';
  typing.id = 'typingIndicator';
  typing.innerHTML = '<span></span><span></span><span></span>';
  panel.appendChild(typing);
  scrollToBottom();
}

function hideTypingIndicator() {
  const typing = document.getElementById('typingIndicator');
  if (typing) typing.remove();
}

async function deleteChat(id) {
  if (!confirm('¿Eliminar este chat?')) return;

  try {
    await fetch(API_URL + `/chat/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (currentChatId === id) {
      currentChatId = null;
      showHome();
    }

    await loadChats();
  } catch (err) {
    console.error('Error eliminando chat:', err);
  }
}

async function clearChat() {
  if (!currentChatId || !confirm('¿Vaciar este chat?')) return;

  try {
    const res = await fetch(API_URL + `/chat/${currentChatId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const chat = await res.json();

    chat.messages = [];

    await fetch(API_URL + `/chat/${currentChatId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(chat)
    });

    openChat(currentChatId);
  } catch (err) {
    console.error('Error vaciando chat:', err);
  }
}

async function renameChat(span, id) {
  const input = document.createElement('input');
  input.value = span.textContent;
  input.style.width = '100%';

  span.replaceWith(input);
  input.focus();

  input.onkeydown = e => {
    if (e.key === 'Enter') finish();
  };
  input.onblur = finish;

  async function finish() {
    const title = input.value.trim() || 'Chat';

    try {
      await fetch(API_URL + `/chat/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title })
      });

      await loadChats();
    } catch (err) {
      console.error('Error renombrando chat:', err);
    }
  }
}

async function shareChat() {
  if (!currentChatId) return;

  try {
    const res = await fetch(API_URL + `/chat/${currentChatId}/share`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

    prompt('Link para compartir:', data.shareUrl);
  } catch (err) {
    console.error('Error compartiendo chat:', err);
  }
}

async function exportChat() {
  if (!currentChatId) return;

  try {
    const res = await fetch(API_URL + `/chat/${currentChatId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const chat = await res.json();

    const content = JSON.stringify(chat, null, 2);
    downloadFile(`chat_${chat.title}.json`, content);
  } catch (err) {
    console.error('Error exportando chat:', err);
  }
}

function downloadFile(filename, content) {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function handleFileUpload() {
  const fileInput = document.getElementById('fileInput');
  const file = fileInput.files[0];
  
  console.log('Archivo seleccionado:', file);
  
  if (!file) {
    console.log('No hay archivo');
    return;
  }
  
  if (!currentChatId) {
    alert('Creá un chat primero');
    return;
  }

  // Si es imagen, convertir a base64 y enviar a la IA
  if (file.type.startsWith('image/')) {
    console.log('Es una imagen, procesando...');
    
    const reader = new FileReader();
    
    reader.onerror = (error) => {
      console.error('Error leyendo archivo:', error);
      alert('Error al leer la imagen');
    };
    
    reader.onload = async (e) => {
      const base64Image = e.target.result;
      console.log('Imagen convertida a base64');
      
      try {
        // Mostrar imagen del usuario
        appendMessage({
          role: 'user',
          text: '¿Qué ves en esta imagen?',
          attachments: [{ type: file.type, url: base64Image, filename: file.name }]
        });

        // Guardar mensaje con imagen
        await fetch(API_URL + `/chat/${currentChatId}/message`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            role: 'user',
            text: '¿Qué ves en esta imagen?',
            attachments: [{ type: file.type, url: base64Image, filename: file.name }]
          })
        });

        // Mostrar typing
        showTypingIndicator();

        console.log('Enviando imagen a la IA...');

        // Enviar a la IA con visión
        const res = await fetch(API_URL + '/ai/generate', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messages: [{
              role: 'user',
              text: '¿Qué ves en esta imagen? Describila en detalle en español.',
              image: base64Image
            }]
          })
        });

        const data = await res.json();
        console.log('Respuesta de la IA:', data);
        
        hideTypingIndicator();

        const botText = data.text || data.fallback || 'No pude analizar la imagen';

        // Guardar respuesta del bot
        await fetch(API_URL + `/chat/${currentChatId}/message`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ role: 'bot', text: botText })
        });

        appendMessage({ role: 'bot', text: botText });

        await loadChats();
      } catch (err) {
        hideTypingIndicator();
        console.error('Error analizando imagen:', err);
        alert('Error al analizar imagen: ' + err.message);
      }
    };

    reader.readAsDataURL(file);
    fileInput.value = '';
    return;
  }

  // Para otros archivos, subir normalmente
  console.log('Archivo no es imagen, subiendo normalmente...');
  
  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch(API_URL + `/chat/${currentChatId}/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });

    const attachment = await res.json();

    await fetch(API_URL + `/chat/${currentChatId}/message`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'user',
        text: `Archivo adjunto: ${file.name}`,
        attachments: [attachment]
      })
    });

    appendMessage({
      role: 'user',
      text: `Archivo adjunto: ${file.name}`,
      attachments: [attachment]
    });

    fileInput.value = '';
  } catch (err) {
    console.error('Error subiendo archivo:', err);
    alert('Error al subir archivo: ' + err.message);
  }
}

function filterChats() {
  const query = document.getElementById('searchInput').value.toLowerCase();
  const items = document.querySelectorAll('.chatItem');

  items.forEach(item => {
    const text = item.querySelector('span').textContent.toLowerCase();
    item.style.display = text.includes(query) ? 'flex' : 'none';
  });
}

function toggleSettings() {
  const panel = document.getElementById('settingsPanel');
  panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
}

function showHome() {
  const panel = document.getElementById('chatPanel');
  panel.innerHTML = '<div class="home">iaL</div>';
  document.getElementById('topTitle').textContent = 'iaL';
  document.getElementById('clearBtn').style.display = 'none';
  document.getElementById('exportBtn').style.display = 'none';
  document.getElementById('shareBtn').style.display = 'none';
}

function scrollToBottom() {
  const panel = document.getElementById('chatPanel');
  panel.scrollTop = panel.scrollHeight;
}

// Partículas
function initParticles() {
  const canvas = document.getElementById('bg');
  const ctx = canvas.getContext('2d');

  let w, h, parts = [];

  function resize() {
    w = canvas.width = innerWidth;
    h = canvas.height = innerHeight;
  }
  window.onresize = resize;
  resize();

  for (let i = 0; i < 70; i++) {
    parts.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 2 + 1,
      vx: (Math.random() - .5) * .25,
      vy: (Math.random() - .5) * .25
    });
  }

  function loop() {
    ctx.clearRect(0, 0, w, h);

    const isLight = document.body.classList.contains('light');
    ctx.fillStyle = isLight ? 'rgba(120,120,120,.35)' : 'rgba(200,200,200,.35)';

    parts.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(loop);
  }
  loop();
}


// Contador de caracteres
function updateCharCount() {
  const input = document.getElementById('msgInput');
  const counter = document.getElementById('charCount');
  if (input && counter) {
    counter.textContent = `${input.value.length}/2000`;
  }
}

// Pantalla completa
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}

// Chats archivados
let showingArchived = false;
function toggleArchived() {
  showingArchived = !showingArchived;
  // TODO: Implementar filtro de archivados
  alert('Función de archivados próximamente');
}

// Sonidos
function playSound(type) {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  if (type === 'send') {
    oscillator.frequency.value = 800;
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  } else if (type === 'receive') {
    oscillator.frequency.value = 600;
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
  }
}

// Forzar estilo del input
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('msgInput');
  if (input) {
    input.setAttribute('autocomplete', 'off');
  }
});
