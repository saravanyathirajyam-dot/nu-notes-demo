(() => {
  const notePreviewModal = document.querySelector('#note-preview-modal');
  const noteSearch = document.querySelector('#note-search');
  const noteRows = [...document.querySelectorAll('.note-row')];
  const filterChips = [...document.querySelectorAll('.filter-chip')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let activeCategory = 'All';
  let lastFocusedElement;
  const aiConversationStorageKey = 'nuNotes:aiConversation:v1';
  function loadAiConversation() {
    try {
      const saved = JSON.parse(localStorage.getItem(aiConversationStorageKey) || '[]');
      if (!Array.isArray(saved)) return [];
      return saved
        .filter((message) => message && ['user', 'assistant'].includes(message.role) && typeof message.content === 'string')
        .map((message) => ({ role: message.role, content: message.content.trim().slice(0, 6000) }))
        .filter((message) => message.content)
        .slice(-12);
    } catch {
      return [];
    }
  }
  let aiConversation = loadAiConversation();
  const topicSamples = {
    chemistry: {
      subject: 'CHEMISTRY', chapter: 'CHAPTER 03', title: 'Chemical Bonding',
      summary: 'How atoms share or transfer electrons to form stable compounds.',
      concept: 'Shared electron pairs create covalent bonds.',
      intro: 'Atoms form bonds by interacting through their valence electrons. The type of interaction helps explain a compound’s structure and properties.',
      core: 'A covalent bond forms when atoms share electron pairs. Ionic bonding involves electron transfer and attraction between charged ions.',
      revision: 'Identify the atoms, count valence electrons, then determine whether electrons are shared or transferred.',
    },
    mathematics: {
      subject: 'MATHEMATICS', chapter: 'UNIT 02', title: 'Integration by Parts',
      summary: 'A method for integrating products by choosing a part to differentiate and a part to integrate.',
      concept: '∫ u dv = uv − ∫ v du',
      intro: 'Integration by parts is useful when an integrand is a product of two functions. Choose u and dv, then apply the identity.',
      core: 'The method reverses the product rule for differentiation and moves the problem to a simpler integral.',
      revision: 'For ∫x eˣ dx, choose u = x and dv = eˣ dx. The result is eˣ(x − 1) + C.',
    },
    physics: {
      subject: 'PHYSICS', chapter: 'CHAPTER 05', title: 'Wave Optics: Interference',
      summary: 'How overlapping light waves combine to form bright and dark fringes.',
      concept: 'Constructive interference: Δx = nλ',
      intro: 'When coherent waves meet, their amplitudes combine. The path difference determines whether the result is brighter or darker.',
      core: 'Bright fringes form when the path difference is an integer multiple of the wavelength: Δx = nλ.',
      revision: 'For a bright fringe, use Δx = nλ. For a dark fringe, use Δx = (n + ½)λ.',
    },
  };

  function openModal(modal) {
    lastFocusedElement = document.activeElement;
    modal.hidden = false;
    document.body.classList.add('no-scroll');
    const focusTarget = modal.querySelector('input, button');
    if (focusTarget) window.setTimeout(() => focusTarget.focus(), 20);
  }

  function closeModal(modal) {
    modal.hidden = true;
    if (notePreviewModal.hidden) document.body.classList.remove('no-scroll');
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') lastFocusedElement.focus();
  }

  document.querySelectorAll('[data-close]').forEach((button) => {
    button.addEventListener('click', () => closeModal(button.closest('.modal-backdrop')));
  });
  [notePreviewModal].forEach((modal) => {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeModal(modal);
    });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (!notePreviewModal.hidden) closeModal(notePreviewModal);
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      noteSearch.focus();
      document.querySelector('#library').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  });

  const menuToggle = document.querySelector('#menu-toggle');
  const mainNav = document.querySelector('.main-nav');
  menuToggle.addEventListener('click', () => {
    const isOpen = mainNav.classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    menuToggle.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
  });
  mainNav.querySelectorAll('a, button').forEach((item) => item.addEventListener('click', () => {
    mainNav.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
  }));

  function filterNotes() {
    const query = noteSearch.value.trim().toLowerCase();
    let visibleCount = 0;
    noteRows.forEach((row) => {
      const categoryMatches = activeCategory === 'All'
        || row.dataset.category === activeCategory
        || (activeCategory === 'Sciences' && ['Chemistry', 'Mathematics', 'Physics'].includes(row.dataset.category));
      const textMatches = !query || `${row.dataset.search} ${row.textContent}`.toLowerCase().includes(query);
      const isVisible = categoryMatches && textMatches;
      row.hidden = !isVisible;
      if (isVisible) visibleCount += 1;
    });
    document.querySelector('#empty-state').hidden = visibleCount > 0;
  }

  function selectCategory(category) {
    activeCategory = category;
    filterChips.forEach((chip) => chip.classList.toggle('is-active', chip.dataset.category === category));
    filterNotes();
    document.querySelector('#library').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
  }

  filterChips.forEach((chip) => chip.addEventListener('click', () => selectCategory(chip.dataset.category)));
  noteSearch.addEventListener('input', filterNotes);
  document.querySelectorAll('.department-card').forEach((card) => card.addEventListener('click', () => {
    selectCategory(card.dataset.filter);
  }));
  document.querySelector('#clear-filters').addEventListener('click', () => {
    noteSearch.value = '';
    selectCategory('All');
  });

  function showNoteReader(topic, key = '') {
    document.querySelector('#reader-unit').textContent = topic.chapter;
    document.querySelector('#reader-kicker').innerHTML = `${escapeHtml(topic.subject)} <i>·</i> ${escapeHtml(topic.chapter)}`;
    document.querySelector('#reader-title').textContent = topic.title;
    document.querySelector('#reader-intro').textContent = topic.intro;
    document.querySelector('#reader-core-text').textContent = topic.core;
    document.querySelector('#reader-revision-text').textContent = topic.revision;

    const readerDiagram = document.querySelector('#reader-diagram');
    const sampleDiagram = key ? document.querySelector(`[data-topic-diagram="${key}"]`) : null;
    if (sampleDiagram) {
      const diagramClone = sampleDiagram.cloneNode(true);
      diagramClone.hidden = false;
      diagramClone.classList.add('reader-topic-diagram');
      readerDiagram.replaceChildren(diagramClone);
    } else {
      const generic = document.createElement('div');
      generic.className = 'reader-generic-diagram';
      const label = document.createElement('span');
      label.textContent = 'SAMPLE NOTE';
      const title = document.createElement('strong');
      title.textContent = topic.title;
      generic.append(label, title);
      readerDiagram.replaceChildren(generic);
    }
    openModal(notePreviewModal);
  }

  document.querySelectorAll('.download-button').forEach((button) => button.addEventListener('click', () => {
    const row = button.closest('.note-row');
    const key = row.dataset.topicKey || '';
    const topic = topicSamples[key] || {
      subject: row.dataset.category.toUpperCase(),
      chapter: row.querySelector('.note-dept').textContent.split('·').pop().trim(),
      title: button.dataset.note,
      summary: row.querySelector('.note-info p').textContent,
      intro: row.querySelector('.note-info p').textContent,
      core: 'This sample shows where a concise explanation and the key idea for this topic will appear.',
      revision: 'The complete department notes and examples can be added when the college materials are shared.',
    };
    showNoteReader(topic, key);
  }));

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[character]);
  }

  const aiForm = document.querySelector('#ai-form');
  const aiQuestion = document.querySelector('#ai-question');
  const aiMaterial = document.querySelector('#ai-material');
  const aiMessages = document.querySelector('#ai-messages');
  const aiStatus = document.querySelector('#ai-status');
  const aiCounter = document.querySelector('#ai-character-count');
  const materialCounter = document.querySelector('#ai-material-count');
  const aiSend = aiForm.querySelector('[type="submit"]');
  const aiClear = document.querySelector('#ai-clear');
  aiQuestion.addEventListener('input', () => { aiCounter.textContent = `${aiQuestion.value.length} / 1600`; });
  aiMaterial.addEventListener('input', () => { materialCounter.textContent = `${aiMaterial.value.length} / 6000`; });

  function addAiMessage(role, text, note = '') {
    const message = document.createElement('div');
    message.className = `ai-message ai-message-${role}`;
    const label = document.createElement('span');
    label.className = 'ai-message-label';
    label.textContent = role === 'assistant' ? 'NU AI' : 'YOU';
    const content = document.createElement('div');
    content.className = 'ai-message-content';
    const response = String(text).trim();
    const fencePattern = /```([\w-]*)[^\S\n]*\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let fence;
    while ((fence = fencePattern.exec(response))) {
      appendTextBlocks(content, response.slice(lastIndex, fence.index));
      if (fence[1].toLowerCase() === 'molecule' && appendMoleculeDiagram(content, fence[2])) {
        message.classList.add('ai-message-has-visual');
      } else {
        const code = document.createElement('pre');
        code.className = 'ai-answer-code';
        code.textContent = fence[2].replace(/\n$/, '');
        content.append(code);
      }
      lastIndex = fencePattern.lastIndex;
    }
    appendTextBlocks(content, response.slice(lastIndex));
    message.append(label, content);
    if (note) {
      const noteLabel = document.createElement('small');
      noteLabel.className = 'ai-message-note';
      noteLabel.textContent = note;
      message.append(noteLabel);
    }
    aiMessages.append(message);
    aiMessages.scrollTop = aiMessages.scrollHeight;
    return message;
  }

  function appendTextBlocks(content, text) {
    const blocks = text.trim().split(/\n{2,}/).filter(Boolean);
    blocks.forEach((block) => {
      const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
      if (lines.length && lines.every((line) => /^[-*]\s+/.test(line))) {
        const list = document.createElement('ul');
        lines.forEach((line) => {
          const item = document.createElement('li');
          item.innerHTML = formatInline(line.replace(/^[-*]\s+/, ''));
          list.append(item);
        });
        content.append(list);
      } else if (lines.length === 1 && /^#{1,3}\s+/.test(lines[0])) {
        const heading = document.createElement('strong');
        heading.className = 'ai-answer-heading';
        heading.innerHTML = formatInline(lines[0].replace(/^#{1,3}\s+/, ''));
        content.append(heading);
      } else {
        const paragraph = document.createElement('p');
        paragraph.innerHTML = lines.map(formatInline).join('<br>');
        content.append(paragraph);
      }
    });
  }

  function appendMoleculeDiagram(content, source) {
    let structure;
    try { structure = JSON.parse(source); } catch { return false; }
    if (!structure || !Array.isArray(structure.atoms) || !Array.isArray(structure.bonds)
      || structure.atoms.length < 1 || structure.atoms.length > 60 || structure.bonds.length > 100) return false;

    const allowedElements = new Set(['H', 'C', 'N', 'O', 'S', 'P', 'F', 'Cl', 'Br', 'I', 'B', 'Si', 'Na', 'K', 'Ca', 'Mg', 'Fe', 'Cu', 'Zn']);
    const atoms = [];
    const atomById = new Map();
    for (const item of structure.atoms) {
      if (!item || typeof item.id !== 'string' || !item.id || atomById.has(item.id)
        || !allowedElements.has(item.element) || !Number.isFinite(Number(item.x)) || !Number.isFinite(Number(item.y))) return false;
      const atom = {
        id: item.id,
        element: item.element,
        x: Math.max(12, Math.min(388, Number(item.x))),
        y: Math.max(18, Math.min(242, Number(item.y))),
      };
      atoms.push(atom);
      atomById.set(atom.id, atom);
    }

    const bonds = [];
    for (const item of structure.bonds) {
      const from = atomById.get(item?.from);
      const to = atomById.get(item?.to);
      const order = Number(item?.order || 1);
      if (!from || !to || from === to || ![1, 2, 3].includes(order)) return false;
      bonds.push({ from, to, order });
    }

    const ns = 'http://www.w3.org/2000/svg';
    const figure = document.createElement('figure');
    figure.className = 'ai-molecule-card';
    const title = document.createElement('figcaption');
    title.textContent = String(structure.title || 'Molecular structure').slice(0, 120);
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 400 260');
    svg.setAttribute('width', '400');
    svg.setAttribute('height', '260');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', title.textContent);

    bonds.forEach(({ from, to, order }) => {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const length = Math.hypot(dx, dy) || 1;
      const ux = dx / length;
      const uy = dy / length;
      const offsetX = -uy;
      const offsetY = ux;
      const parallelOffsets = order === 1 ? [0] : order === 2 ? [-3.5, 3.5] : [-6, 0, 6];
      parallelOffsets.forEach((offset) => {
        const atomGap = Math.min(14, length * 0.22);
        const line = document.createElementNS(ns, 'line');
        line.setAttribute('x1', String(from.x + ux * atomGap + offsetX * offset));
        line.setAttribute('y1', String(from.y + uy * atomGap + offsetY * offset));
        line.setAttribute('x2', String(to.x - ux * atomGap + offsetX * offset));
        line.setAttribute('y2', String(to.y - uy * atomGap + offsetY * offset));
        line.setAttribute('class', 'ai-molecule-bond');
        svg.append(line);
      });
    });

    atoms.forEach((atom) => {
      const background = document.createElementNS(ns, 'circle');
      background.setAttribute('cx', String(atom.x));
      background.setAttribute('cy', String(atom.y));
      background.setAttribute('r', '13');
      background.setAttribute('class', 'ai-molecule-atom-bg');
      const label = document.createElementNS(ns, 'text');
      label.setAttribute('x', String(atom.x));
      label.setAttribute('y', String(atom.y + 4));
      label.setAttribute('class', `ai-molecule-atom ai-molecule-atom-${atom.element.toLowerCase()}`);
      label.textContent = atom.element;
      svg.append(background, label);
    });

    figure.append(title, svg);
    content.append(figure);
    return true;
  }

  function saveAiConversation() {
    aiConversation = aiConversation.slice(-12);
    try { localStorage.setItem(aiConversationStorageKey, JSON.stringify(aiConversation)); } catch { /* Keep chat usable when storage is unavailable. */ }
    aiClear.hidden = aiConversation.length === 0;
  }

  function restoreAiConversation() {
    if (!aiConversation.length) {
      aiClear.hidden = true;
      return;
    }
    aiMessages.replaceChildren();
    aiConversation.forEach((message) => addAiMessage(
      message.role,
      message.content,
      message.role === 'assistant' ? 'Saved in this browser' : 'Recent question',
    ));
    aiClear.hidden = false;
  }

  restoreAiConversation();
  aiClear.addEventListener('click', () => {
    aiConversation = [];
    try { localStorage.removeItem(aiConversationStorageKey); } catch { /* Clearing the visible conversation still works. */ }
    aiMessages.replaceChildren();
    const intro = document.createElement('div');
    intro.className = 'ai-message ai-message-assistant';
    intro.dataset.aiIntro = 'true';
    intro.innerHTML = '<span class="ai-message-label">NU AI</span><p>Hi! Ask for a chemistry reaction, a maths or physics solution, or a clear concept explanation. Follow-up questions stay in this chat. Until college notes are added, my answers are general study help.</p>';
    aiMessages.append(intro);
    aiClear.hidden = true;
    aiStatus.textContent = 'Saved conversation cleared';
  });

  function formatInline(value) {
    return escapeHtml(value)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  aiForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const question = aiQuestion.value.trim();
    const material = aiMaterial.value.trim();
    if (!question) return;
    const history = aiConversation.slice(-8);
    const pendingMessage = addAiMessage('user', question, material ? 'Course material attached to this question' : 'General question');
    aiSend.disabled = true;
    aiClear.disabled = true;
    aiStatus.textContent = 'NU AI is preparing an explanation…';
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 45000);
    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, material, messages: history }),
        signal: controller.signal,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'NU AI could not reply. Please try again.');
      aiConversation.push({ role: 'user', content: question });
      aiConversation.push({ role: 'assistant', content: result.answer });
      saveAiConversation();
      addAiMessage('assistant', result.answer, material ? 'Based on the material you supplied and general knowledge' : 'General explanation · no college syllabus has been added yet');
      aiQuestion.value = '';
      aiCounter.textContent = '0 / 1600';
      aiMaterial.value = '';
      materialCounter.textContent = '0 / 6000';
      aiStatus.textContent = 'AI tutor ready';
    } catch (error) {
      pendingMessage.remove();
      const message = error.name === 'AbortError'
        ? 'The tutor took too long to reply. Your question is still here; please try again.'
        : error.message || 'The free AI tutor is temporarily unavailable. Please try again shortly.';
      addAiMessage('assistant', message);
      aiStatus.textContent = 'Tutor busy · try again';
    } finally {
      window.clearTimeout(timeout);
      aiSend.disabled = false;
      aiClear.disabled = false;
      aiQuestion.focus();
    }
  });

  fetch('/api/status').then((response) => response.ok ? response.json() : null).then((status) => {
    if (!status) {
      aiStatus.textContent = 'Backend not connected yet';
      return;
    }
    aiStatus.textContent = status.aiReady ? 'AI tutor ready · ask anything for study help' : 'AI tutor is not connected';
  }).catch(() => { aiStatus.textContent = 'Backend not connected yet'; });

  if (!reducedMotion && 'IntersectionObserver' in window) {
    const revealTargets = document.querySelectorAll('.study-card, .department-card, .note-row, .section-heading, .ai-copy, .ai-panel');
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -24px 0px' });
    revealTargets.forEach((element) => {
      element.classList.add('scroll-reveal');
      revealObserver.observe(element);
    });
  }
})();
