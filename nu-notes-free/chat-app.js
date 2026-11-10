(() => {
  'use strict';

  const CHAT_KEY = 'nu-ai-chat-history-v1';
  const ACTIVE_KEY = 'nu-ai-active-chat-v1';
  const MAX_CHATS = 40;
  const MAX_FILES = 4;
  const MAX_IMAGES = 3;
  const MAX_FILE_BYTES = 8 * 1024 * 1024;
  const HOSTED_URL = 'https://nu-notes.pages.dev/';
  const $ = (selector) => document.querySelector(selector);
  const welcome = $('#welcome');
  const messageList = $('#message-list');
  const chatHistory = $('#chat-history');
  const historyEmpty = $('#history-empty');
  const form = $('#chat-form');
  const promptInput = $('#prompt');
  const fileInput = $('#file-input');
  const attachmentStrip = $('#attachment-strip');
  const sendButton = $('#send-button');
  const sendLabel = $('#send-label');
  const characterCount = $('#character-count');
  const serviceState = $('#service-state');
  const askModeButton = $('#ask-mode');
  const imageModeButton = $('#image-mode');
  const composerHint = $('#composer-hint');
  const sidebar = $('#sidebar');
  const scrim = $('#mobile-scrim');
  const toast = $('#toast');
  let chats = loadChats();
  let activeChatId = localStorage.getItem(ACTIVE_KEY) || '';
  let pendingFiles = [];
  let busy = false;
  let mode = 'ask';
  let lastRequest = null;
  let toastTimer;

  if (!chats.some((chat) => chat.id === activeChatId)) activeChatId = '';
  renderAll();
  checkService();

  function loadChats() {
    try {
      const value = JSON.parse(localStorage.getItem(CHAT_KEY) || '[]');
      return Array.isArray(value) ? value.filter((chat) => chat && typeof chat.id === 'string' && Array.isArray(chat.messages)) : [];
    } catch { return []; }
  }

  function persist() {
    const saved = chats.slice(0, MAX_CHATS).map((chat) => ({
      id: chat.id,
      title: chat.title,
      updatedAt: chat.updatedAt,
      messages: chat.messages.map((message) => ({
        role: message.role,
        text: message.text || '',
        attachments: (message.attachments || []).map((file) => ({ name: file.name, type: file.type, label: file.label || '' })),
        imageUnavailable: Boolean(message.imageData || message.imageUnavailable || message.attachments?.some((file) => file.preview)),
        generatedImageUnavailable: Boolean(message.generatedImageData || message.generatedImageUnavailable),
        isError: Boolean(message.isError || message.pending),
      })),
    }));
    try {
      localStorage.setItem(CHAT_KEY, JSON.stringify(saved));
      localStorage.setItem(ACTIVE_KEY, activeChatId);
    } catch {
      showToast('Your browser is low on storage. Older chats may need to be cleared.');
    }
  }

  function activeChat() { return chats.find((chat) => chat.id === activeChatId) || null; }

  function createChat() {
    const chat = { id: makeId(), title: 'New chat', updatedAt: Date.now(), messages: [] };
    chats.unshift(chat);
    activeChatId = chat.id;
    pendingFiles = [];
    renderAll();
    persist();
    closeSidebar();
    promptInput.focus();
    return chat;
  }

  function makeId() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
  function titleFrom(text) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    return clean.length > 42 ? `${clean.slice(0, 41).trimEnd()}…` : clean || 'New chat';
  }
  function showToast(text) {
    toast.textContent = text;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3400);
  }

  function renderAll() {
    renderHistory();
    renderConversation();
    renderFiles();
    updateMode();
  }

  function renderHistory() {
    const ordered = [...chats].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_CHATS);
    chatHistory.replaceChildren();
    historyEmpty.hidden = ordered.length > 0;
    ordered.forEach((chat) => {
      const row = document.createElement('div');
      row.className = `history-item${chat.id === activeChatId ? ' is-active' : ''}`;
      row.dataset.chatId = chat.id;
      row.tabIndex = 0;
      row.setAttribute('role', 'button');
      row.setAttribute('aria-label', `Open chat: ${chat.title || 'New chat'}`);
      const icon = document.createElement('span');
      icon.className = 'history-item-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = '◷';
      const title = document.createElement('span');
      title.className = 'history-item-title';
      title.textContent = chat.title || 'New chat';
      const remove = document.createElement('button');
      remove.className = 'history-delete';
      remove.type = 'button';
      remove.dataset.deleteChat = chat.id;
      remove.setAttribute('aria-label', `Remove chat: ${chat.title || 'New chat'}`);
      remove.textContent = '×';
      row.append(icon, title, remove);
      chatHistory.append(row);
    });
  }

  function renderConversation() {
    const chat = activeChat();
    const messages = chat?.messages || [];
    welcome.hidden = messages.length > 0;
    messageList.replaceChildren();
    messageList.hidden = messages.length === 0;
    messages.forEach((message, index) => messageList.append(renderMessage(message, index)));
    requestAnimationFrame(() => $('#conversation').scrollTop = $('#conversation').scrollHeight);
  }

  function renderMessage(message, index) {
    const item = document.createElement('article');
    item.className = `message message-${message.role}${message.isError ? ' message-error' : ''}`;
    item.dataset.messageIndex = String(index);
    const avatar = document.createElement('span');
    avatar.className = 'message-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = message.role === 'assistant' ? '✦' : 'YOU';
    const content = document.createElement('div');
    content.className = 'message-content';
    const meta = document.createElement('div');
    meta.className = 'message-meta';
    meta.textContent = message.role === 'assistant' ? 'NU AI' : 'YOU';
    const body = document.createElement('div');
    body.className = 'message-body';

    if (message.attachments?.length) body.append(renderAttachmentBadges(message.attachments));
    let textRendered = false;
    if (message.role === 'assistant' && message.generatedImageData) {
      if (message.text) { body.append(renderMarkdown(message.text)); textRendered = true; }
      const image = document.createElement('img');
      image.className = 'message-generated-image';
      image.src = message.generatedImageData;
      image.alt = message.imageAlt || 'Image created by NU AI';
      const download = document.createElement('a');
      download.className = 'download-image';
      download.href = message.generatedImageData;
      download.download = 'nu-ai-image.jpg';
      download.textContent = '↓ Download image';
      body.append(image, download);
    } else if (message.role === 'user' && message.attachments?.some((file) => file.preview)) {
      message.attachments.filter((file) => file.preview).forEach((file) => {
        const image = document.createElement('img');
        image.className = 'message-photo';
        image.src = file.preview;
        image.alt = file.name;
        body.append(image);
      });
    }
    if (message.text && !textRendered) body.append(renderMarkdown(message.text));
    if (message.imageUnavailable) {
      const note = document.createElement('p');
      note.textContent = message.role === 'user' ? 'The photo itself is not saved in past chats.' : 'This picture is not saved in your chat history. Save it before leaving if you want to keep it.';
      body.append(note);
    }
    if (message.generatedImageUnavailable) {
      const note = document.createElement('p');
      note.textContent = 'This created picture was not saved in your chat history. Download it before leaving to keep it.';
      body.append(note);
    }
    if (message.pending) {
      const loading = document.createElement('div');
      loading.className = 'loading-state';
      loading.innerHTML = '<span class="loading-orb">✦</span><span class="loading-copy"><strong>NU AI is thinking</strong>Working through your question<span class="thinking-dots"><i></i><i></i><i></i></span></span>';
      body.append(loading);
    }
    if (message.isError) {
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'message-action';
      retry.dataset.retry = 'true';
      retry.textContent = 'Try again';
      body.append(retry);
    }
    if (message.role === 'assistant' && !message.pending && !message.isError) {
      const actions = document.createElement('div');
      actions.className = 'message-actions';
      const copy = document.createElement('button');
      copy.type = 'button';
      copy.className = 'message-action';
      copy.dataset.copy = 'true';
      copy.textContent = 'Copy';
      actions.append(copy);
      body.append(actions);
    }
    content.append(meta, body);
    item.append(avatar, content);
    return item;
  }

  function renderAttachmentBadges(files) {
    const wrap = document.createElement('div');
    wrap.className = 'message-attachments';
    files.forEach((file) => {
      const chip = document.createElement('div');
      chip.className = 'attachment-chip';
      const icon = document.createElement('i');
      icon.textContent = file.type?.startsWith('image/') ? '▧' : (file.type === 'application/pdf' ? 'PDF' : 'TXT');
      const name = document.createElement('span');
      name.textContent = file.name;
      chip.append(icon, name);
      wrap.append(chip);
    });
    return wrap;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  }

  function inlineMarkdown(value) {
    return escapeHtml(value)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');
  }

  function renderMarkdown(text) {
    const fragment = document.createDocumentFragment();
    const input = String(text || '');
    const fence = /```([^\n]*)\n?([\s\S]*?)```/g;
    let last = 0;
    let match;
    while ((match = fence.exec(input))) {
      appendMarkdownBlocks(fragment, input.slice(last, match.index));
      const code = match[2].replace(/\n$/, '');
      if (/molecule|structure/i.test(match[1]) || maybeMolecule(code)) {
        const card = drawMolecule(code);
        if (card) fragment.append(card);
        else appendCode(fragment, code);
      } else appendCode(fragment, code);
      last = fence.lastIndex;
    }
    appendMarkdownBlocks(fragment, input.slice(last));
    return fragment;
  }

  function appendCode(fragment, value) {
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.textContent = value;
    pre.append(code);
    fragment.append(pre);
  }

  function appendMarkdownBlocks(fragment, text) {
    String(text).trim().split(/\n\s*\n/).filter(Boolean).forEach((block) => {
      const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
      if (!lines.length) return;
      if (lines.every((line) => /^[-*]\s+/.test(line))) {
        const list = document.createElement('ul');
        lines.forEach((line) => { const li = document.createElement('li'); li.innerHTML = inlineMarkdown(line.replace(/^[-*]\s+/, '')); list.append(li); });
        fragment.append(list);
      } else if (lines.every((line) => /^\d+[.)]\s+/.test(line))) {
        const list = document.createElement('ol');
        lines.forEach((line) => { const li = document.createElement('li'); li.innerHTML = inlineMarkdown(line.replace(/^\d+[.)]\s+/, '')); list.append(li); });
        fragment.append(list);
      } else if (lines.length === 1 && /^#{1,3}\s+/.test(lines[0])) {
        const heading = document.createElement(lines[0].startsWith('# ') ? 'h2' : 'h3');
        heading.innerHTML = inlineMarkdown(lines[0].replace(/^#{1,3}\s+/, ''));
        fragment.append(heading);
      } else {
        const paragraph = document.createElement('p');
        paragraph.innerHTML = lines.map(inlineMarkdown).join('<br>');
        fragment.append(paragraph);
      }
    });
  }

  function maybeMolecule(text) {
    try { const data = JSON.parse(text); return Array.isArray(data.atoms) && Array.isArray(data.bonds); } catch { return false; }
  }

  function drawMolecule(text) {
    let data;
    try { data = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)); } catch { return null; }
    const elements = new Set(['H','C','N','O','S','P','F','Cl','Br','I','B','Si','Na','K','Ca','Mg','Fe','Cu','Zn']);
    const atoms = Array.isArray(data.atoms) ? data.atoms.slice(0, 60) : [];
    if (!atoms.length || atoms.some((atom) => !elements.has(String(atom.element || atom.symbol)))) return null;
    const ids = new Map();
    atoms.forEach((atom, i) => ids.set(String(atom.id ?? i), i));
    const width = 400;
    const height = 260;
    const points = atoms.map((atom, i) => {
      const explicitX = Number(atom.x); const explicitY = Number(atom.y);
      if (Number.isFinite(explicitX) && Number.isFinite(explicitY)) return { x: 25 + explicitX / 400 * 350, y: 20 + explicitY / 260 * 220 };
      const angle = Math.PI * 2 * i / atoms.length - Math.PI / 2;
      const radius = Math.min(122, Math.max(42, atoms.length * 17));
      return { x: width / 2 + Math.cos(angle) * radius, y: height / 2 + Math.sin(angle) * radius };
    });
    const svgNS = 'http://www.w3.org/2000/svg';
    const figure = document.createElement('figure');
    figure.className = 'molecule-card';
    const caption = document.createElement('figcaption');
    caption.textContent = String(data.title || 'Molecular structure').slice(0, 100);
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', caption.textContent);
    (Array.isArray(data.bonds) ? data.bonds.slice(0, 100) : []).forEach((bond) => {
      const from = ids.get(String(bond.from)); const to = ids.get(String(bond.to));
      if (from === undefined || to === undefined || from === to) return;
      const a = points[from]; const b = points[to];
      const dx = b.x-a.x; const dy=b.y-a.y; const len=Math.hypot(dx,dy)||1; const ox=-dy/len; const oy=dx/len;
      const order = Math.max(1, Math.min(3, Number(bond.order)||1));
      const offsets = order===1 ? [0] : order===2 ? [-3.5,3.5] : [-6,0,6];
      offsets.forEach((offset) => { const line=document.createElementNS(svgNS,'line'); line.setAttribute('x1',String(a.x+dx/len*12+ox*offset)); line.setAttribute('y1',String(a.y+dy/len*12+oy*offset)); line.setAttribute('x2',String(b.x-dx/len*12+ox*offset)); line.setAttribute('y2',String(b.y-dy/len*12+oy*offset)); line.setAttribute('class','molecule-bond'); svg.append(line); });
    });
    atoms.forEach((atom, i) => {
      const bg=document.createElementNS(svgNS,'circle'); bg.setAttribute('cx',String(points[i].x)); bg.setAttribute('cy',String(points[i].y)); bg.setAttribute('r','13'); bg.setAttribute('class','molecule-label-bg');
      const label=document.createElementNS(svgNS,'text'); label.setAttribute('x',String(points[i].x)); label.setAttribute('y',String(points[i].y+4)); label.setAttribute('class','molecule-label'); label.textContent=String(atom.element||atom.symbol);
      svg.append(bg,label);
    });
    figure.append(caption,svg);
    return figure;
  }

  $('#new-chat').addEventListener('click', createChat);
  $('#brand-home').addEventListener('click', (event) => { event.preventDefault(); createChat(); });
  $('#clear-history').addEventListener('click', () => {
    if (!chats.length || !window.confirm('Clear all chat history saved on this device?')) return;
    chats = [];
    activeChatId = '';
    pendingFiles = [];
    persist();
    renderAll();
    closeSidebar();
  });

  chatHistory.addEventListener('click', (event) => {
    const deleteButton = event.target.closest('[data-delete-chat]');
    if (deleteButton) {
      const id = deleteButton.dataset.deleteChat;
      chats = chats.filter((chat) => chat.id !== id);
      if (activeChatId === id) activeChatId = '';
      persist(); renderAll();
      return;
    }
    const row = event.target.closest('[data-chat-id]');
    if (!row) return;
    activeChatId = row.dataset.chatId;
    pendingFiles = [];
    persist(); renderAll(); closeSidebar();
  });
  chatHistory.addEventListener('keydown', (event) => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-chat-id]')) { event.preventDefault(); event.target.click(); }
  });

  document.querySelectorAll('[data-prompt]').forEach((button) => button.addEventListener('click', () => {
    promptInput.value = button.dataset.prompt || '';
    resizePrompt(); updateCount(); promptInput.focus();
  }));
  askModeButton.addEventListener('click', () => setMode('ask'));
  imageModeButton.addEventListener('click', () => setMode('image'));
  function setMode(next) { mode = next; updateMode(); promptInput.focus(); }
  function updateMode() {
    askModeButton.classList.toggle('is-selected', mode === 'ask');
    imageModeButton.classList.toggle('is-selected', mode === 'image');
    askModeButton.setAttribute('aria-pressed', String(mode === 'ask'));
    imageModeButton.setAttribute('aria-pressed', String(mode === 'image'));
    sendLabel.textContent = mode === 'image' ? 'Create' : 'Send';
    $('#attach-button').disabled = mode === 'image' || busy;
    $('#attach-button').title = mode === 'image' ? 'Attachments are for questions' : 'Attach a photo or document';
    composerHint.textContent = mode === 'image' ? 'Creates one study illustration · free daily allowance' : 'Photos, PDFs, text · sent to Cloudflare';
    promptInput.placeholder = mode === 'image' ? 'Describe the picture you want NU AI to create…' : 'Ask NU AI anything…';
    renderFiles();
  }

  $('#attach-button').addEventListener('click', () => { if (mode === 'ask') fileInput.click(); });
  fileInput.addEventListener('change', async () => {
    const files = Array.from(fileInput.files || []);
    fileInput.value = '';
    if (pendingFiles.length + files.length > MAX_FILES) { showToast(`Attach up to ${MAX_FILES} files at once.`); return; }
    try {
      for (const file of files) {
        if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name} is over 8 MB. Choose a smaller file.`);
        const processed = await prepareFile(file);
        if (processed.kind === 'image' && pendingFiles.filter((item) => item.kind === 'image').length >= MAX_IMAGES) throw new Error(`Attach up to ${MAX_IMAGES} photos at once.`);
        const imageCount = pendingFiles.filter((item) => item.kind === 'image').length + (processed.images?.length || 0);
        if (imageCount > MAX_IMAGES) throw new Error(`This document contains scanned pages. Attach no more than ${MAX_IMAGES} photos or scanned pages at once.`);
        pendingFiles.push(processed);
      }
      renderFiles();
    } catch (error) { showToast(error.message || 'This file could not be opened.'); }
  });

  async function prepareFile(file) {
    const extension = file.name.split('.').pop().toLowerCase();
    if (file.type.startsWith('image/')) {
      if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Please use a JPG, PNG, or WebP photo.');
      const dataUrl = await shrinkImage(file);
      return { kind: 'image', name: file.name, type: 'image/jpeg', dataUrl, preview: dataUrl };
    }
    if (file.type === 'application/pdf' || extension === 'pdf') return readPdf(file);
    if (['txt','md','csv'].includes(extension) || file.type.startsWith('text/')) {
      const text = (await file.text()).slice(0, 20000);
      if (!text.trim()) throw new Error(`${file.name} has no readable text.`);
      return { kind: 'text', name: file.name, type: 'text/plain', text };
    }
    throw new Error('Supported files: JPG, PNG, WebP, PDF, TXT, Markdown, and CSV.');
  }

  async function shrinkImage(file) {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
    return canvas.toDataURL('image/jpeg', 0.8);
  }

  async function readPdf(file) {
    let pdfjs;
    try {
      pdfjs = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs');
    } catch { throw new Error('PDF reading did not load. Try again with a photo or text file.'); }
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';
    const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    let extracted = '';
    const pageLimit = Math.min(pdf.numPages, 35);
    for (let pageNumber = 1; pageNumber <= pageLimit; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = content.items.map((item) => item.str || '').join(' ').replace(/\s+/g, ' ').trim();
      if (pageText) extracted += `\n\n[Page ${pageNumber}]\n${pageText}`;
      if (extracted.length >= 20000) break;
    }
    if (extracted.trim().length > 80) return { kind: 'text', name: file.name, type: 'application/pdf', text: extracted.slice(0, 20000), label: `PDF · ${pdf.numPages} pages` };
    const scans = [];
    for (let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, 2); pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.1 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width; canvas.height = viewport.height;
      await page.render({ canvas, canvasContext: canvas.getContext('2d') }).promise;
      const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
      scans.push({ kind: 'image', name: `${file.name} · page ${pageNumber}`, type: 'image/jpeg', dataUrl, preview: dataUrl });
    }
    return { kind: 'document-scan', name: file.name, type: 'application/pdf', images: scans, label: `Scanned PDF · first ${scans.length} pages` };
  }

  function renderFiles() {
    attachmentStrip.replaceChildren();
    attachmentStrip.hidden = pendingFiles.length === 0;
    pendingFiles.forEach((file, index) => {
      const item = document.createElement('div');
      item.className = 'pending-file';
      if (file.preview) { const image=document.createElement('img'); image.className='pending-file-thumb'; image.src=file.preview; image.alt=''; item.append(image); }
      else { const type=document.createElement('i'); type.className='pending-file-type'; type.textContent=file.type==='application/pdf'?'PDF':'TXT'; item.append(type); }
      const name = document.createElement('span'); name.textContent=file.label || file.name; name.title=file.name;
      const remove=document.createElement('button'); remove.type='button'; remove.textContent='×'; remove.setAttribute('aria-label',`Remove ${file.name}`); remove.addEventListener('click',()=>{pendingFiles.splice(index,1);renderFiles();});
      item.append(name,remove); attachmentStrip.append(item);
    });
  }

  promptInput.addEventListener('input', () => { resizePrompt(); updateCount(); });
  function updateCount() { characterCount.textContent = `${promptInput.value.length} / 1600`; }
  function resizePrompt() { promptInput.style.height = 'auto'; promptInput.style.height = `${Math.min(promptInput.scrollHeight, 160)}px`; }
  promptInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); form.requestSubmit(); }
  });

  form.addEventListener('submit', (event) => { event.preventDefault(); submitPrompt(); });
  async function submitPrompt(retry = false) {
    if (busy) return;
    const text = retry && lastRequest ? lastRequest.text : promptInput.value.trim();
    const attachments = retry && lastRequest ? lastRequest.attachments : pendingFiles;
    const sendMode = retry && lastRequest ? lastRequest.mode : mode;
    if (!text && !attachments.length) { promptInput.focus(); return; }
    if (sendMode === 'image' && !text) { showToast('Describe the picture you would like NU AI to create.'); return; }
    if (window.location.protocol === 'file:') {
      showToast('Open the hosted NU AI website to use chat: nu-notes.pages.dev');
      return;
    }

    const chat = activeChat() || createChat();
    const question = text || 'Please explain the attached study material clearly.';
    const imageAttachments = attachments.flatMap((file) => file.kind === 'image' ? [file] : (file.images || []));
    const documentText = attachments.filter((file) => file.kind === 'text').map((file) => `[Document: ${file.name}]\n${file.text}`).join('\n\n');
    const visibleAttachments = attachments.flatMap((file) => file.kind === 'document-scan' ? [{ name: file.name, type: file.type, label: file.label }] : [{ name: file.name, type: file.type, preview: file.preview, label: file.label }]);
    if (!retry) {
      const firstQuestion = !chat.messages.some((message) => message.role === 'user');
      chat.messages.push({ role: 'user', text: question, attachments: visibleAttachments });
      if (firstQuestion) chat.title = titleFrom(question);
      chat.updatedAt = Date.now();
      pendingFiles = [];
      promptInput.value = '';
      resizePrompt(); updateCount(); renderFiles();
    }

    const pending = { role: 'assistant', pending: true };
    chat.messages.push(pending);
    busy = true;
    sendButton.disabled = true;
    $('#attach-button').disabled = true;
    lastRequest = { text: question, attachments, mode: sendMode, chatId: chat.id };
    persist(); renderHistory(); renderConversation();
    const previousMessages = chat.messages.filter((message) => ['user','assistant'].includes(message.role) && !message.pending && !message.isError).slice(-9, -1).map((message) => ({ role: message.role, content: message.text || '' })).filter((message) => message.content);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), sendMode === 'image' ? 70000 : 50000);
    try {
      if (sendMode === 'image') {
        const response = await fetch('/api/image', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ prompt: question }), signal: controller.signal });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'NU AI could not create that picture. Please try again.');
        const index = chat.messages.indexOf(pending);
        if (index >= 0) chat.messages.splice(index,1);
        chat.messages.push({ role:'assistant', text:'Here is your picture. Save it with the download button below.', generatedImageData:result.dataUrl, imageAlt:question });
      } else {
        const response = await fetch('/api/ask', {
          method: 'POST',
          headers: { 'Content-Type':'application/json' },
          body: JSON.stringify({
            question,
            material: documentText,
            messages: previousMessages,
            attachments: imageAttachments.map((file) => ({ name:file.name, type:file.type, dataUrl:file.dataUrl })),
          }),
          signal: controller.signal,
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'NU AI could not answer right now. Please try again.');
        const index = chat.messages.indexOf(pending);
        if (index >= 0) chat.messages.splice(index,1);
        chat.messages.push({ role:'assistant', text:result.answer });
      }
      chat.updatedAt = Date.now();
      lastRequest = null;
    } catch (error) {
      const index = chat.messages.indexOf(pending);
      if (index >= 0) chat.messages.splice(index,1);
      const message = friendlyError(error);
      chat.messages.push({ role:'assistant', text:message, isError:true });
      showToast(message);
    } finally {
      window.clearTimeout(timeoutId);
      busy = false;
      sendButton.disabled = false;
      updateMode();
      persist(); renderAll(); promptInput.focus();
    }
  }

  function friendlyError(error) {
    const message = String(error?.message || '');
    if (error?.name === 'AbortError') return 'NU AI took too long this time. Your question is still here; please try again.';
    if (/limit|allowance|tomorrow|daily/i.test(message)) return 'NU AI’s shared free daily allowance has been used. It resets tomorrow; please come back then.';
    if (/fetch|network|failed/i.test(message)) return 'NU AI could not reach its service just now. Check your connection and try again.';
    return message || 'NU AI is having a brief pause. Your question is still here; try again in a moment.';
  }

  messageList.addEventListener('click', async (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.retry) { if (lastRequest?.chatId === activeChatId) await submitPrompt(true); else showToast('Start a new question to continue this chat.'); return; }
    if (button.dataset.copy) {
      const message = button.closest('.message');
      const chat = activeChat();
      const stored = chat?.messages[Number(message?.dataset.messageIndex)];
      if (!stored?.text) return;
      try { await navigator.clipboard.writeText(stored.text); showToast('Copied to clipboard.'); }
      catch { showToast('Copy is unavailable in this browser.'); }
    }
  });

  async function checkService() {
    if (window.location.protocol === 'file:') { setService('Open hosted site to chat', 'is-limited'); return; }
    try {
      const response = await fetch('/api/status', { cache:'no-store' });
      const status = await response.json();
      if (status.aiReady) setService('Ready to help', 'is-ready');
      else setService('AI is not connected', 'is-limited');
    } catch { setService('Trying to reconnect…', 'is-limited'); }
  }
  function setService(label, stateClass) {
    serviceState.className = `service-state ${stateClass || ''}`;
    serviceState.querySelector('span:last-child').textContent = label;
  }

  function openSidebar() { sidebar.classList.add('is-open'); scrim.hidden = false; }
  function closeSidebar() { sidebar.classList.remove('is-open'); scrim.hidden = true; }
  $('#menu-button').addEventListener('click', openSidebar);
  $('#sidebar-close').addEventListener('click', closeSidebar);
  scrim.addEventListener('click', closeSidebar);
  window.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); createChat(); }
    if (event.key === 'Escape') closeSidebar();
  });
})();
