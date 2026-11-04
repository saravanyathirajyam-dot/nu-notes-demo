(() => {
  const checkinModal = document.querySelector('#checkin-modal');
  const adminModal = document.querySelector('#admin-modal');
  const notePreviewModal = document.querySelector('#note-preview-modal');
  const checkinForm = document.querySelector('#checkin-form');
  const noteSearch = document.querySelector('#note-search');
  const noteRows = [...document.querySelectorAll('.note-row')];
  const filterChips = [...document.querySelectorAll('.filter-chip')];
  const toast = document.querySelector('#toast');
  const adminTable = document.querySelector('#admin-table-body');
  const topicPreview = document.querySelector('#topic-preview');
  const topicTitle = document.querySelector('#topic-title');
  const topicSummary = document.querySelector('#topic-summary');
  const topicKicker = document.querySelector('#topic-kicker');
  const topicConcept = document.querySelector('#topic-concept');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let activeCategory = 'All';
  let activeSubject = 'chemistry';
  let toastTimer;
  let lastFocusedElement;
  let aiConversation = [];
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
    if (checkinModal.hidden && adminModal.hidden && notePreviewModal.hidden) document.body.classList.remove('no-scroll');
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') lastFocusedElement.focus();
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 3200);
  }

  document.querySelectorAll('#checkin-open, #checkin-open-secondary, #checkin-open-bottom').forEach((button) => {
    button.addEventListener('click', () => openModal(checkinModal));
  });
  document.querySelector('#admin-open').addEventListener('click', () => openModal(adminModal));

  document.querySelectorAll('[data-close]').forEach((button) => {
    button.addEventListener('click', () => closeModal(button.closest('.modal-backdrop')));
  });
  [checkinModal, adminModal, notePreviewModal].forEach((modal) => {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeModal(modal);
    });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (!checkinModal.hidden) closeModal(checkinModal);
      if (!adminModal.hidden) closeModal(adminModal);
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

  function showTopic(topic, key = '') {
    topicKicker.innerHTML = `${escapeHtml(topic.subject)} <i>·</i> ${escapeHtml(topic.chapter)}`;
    topicTitle.textContent = topic.title;
    topicSummary.textContent = topic.summary;
    topicConcept.textContent = topic.concept;
    document.querySelectorAll('.subject-tab').forEach((tab) => {
      const isActive = tab.dataset.subject === key;
      tab.classList.toggle('is-active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
    });
    document.querySelectorAll('.topic-diagram').forEach((diagram) => {
      diagram.hidden = diagram.dataset.topicDiagram !== key;
    });
    topicPreview.classList.remove('is-animating');
    if (!reducedMotion) requestAnimationFrame(() => topicPreview.classList.add('is-animating'));
    activeSubject = key;
  }

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

  document.querySelectorAll('.subject-tab').forEach((tab) => tab.addEventListener('click', () => {
    showTopic(topicSamples[tab.dataset.subject], tab.dataset.subject);
  }));
  document.querySelector('#topic-open').addEventListener('click', () => {
    showNoteReader(topicSamples[activeSubject], activeSubject);
  });

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

  checkinForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = document.querySelector('#student-name').value.trim().replace(/\s+/g, ' ');
    const usn = document.querySelector('#student-usn').value.trim().toUpperCase().replace(/\s+/g, '');
    if (!name || !usn) return;
    const submitButton = checkinForm.querySelector('[type="submit"]');
    submitButton.disabled = true;
    try {
      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, usn }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Check-in could not be saved.');
      closeModal(checkinModal);
      checkinForm.reset();
      showToast('Check-in saved. You can continue to the notes.');
    } catch (error) {
      showToast(error.message || 'The check-in service is unavailable. Please try again later.');
    } finally {
      submitButton.disabled = false;
    }
  });

  const adminForm = document.querySelector('#admin-form');
  const adminResults = document.querySelector('#admin-results');
  const adminStatus = document.querySelector('#admin-status');
  adminForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const codeInput = document.querySelector('#admin-access-code');
    const code = codeInput.value;
    const submitButton = adminForm.querySelector('[type="submit"]');
    adminResults.hidden = true;
    adminStatus.textContent = 'Checking staff access…';
    submitButton.disabled = true;
    try {
      const response = await fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${code}` } });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not load the saved counts.');
      renderAdminStats(result);
      adminResults.hidden = false;
      adminStatus.textContent = 'Saved check-ins loaded.';
    } catch (error) {
      adminStatus.textContent = error.message || 'Could not load the saved counts.';
    } finally {
      codeInput.value = '';
      submitButton.disabled = false;
    }
  });

  function renderAdminStats(stats) {
    document.querySelector('#total-logins').textContent = String(stats.total_checkins ?? 0);
    document.querySelector('#unique-students').textContent = String(stats.unique_students ?? 0);
    adminTable.replaceChildren();
    (Array.isArray(stats.students) ? stats.students : []).forEach((student) => {
      const row = document.createElement('tr');
      const nameCell = document.createElement('td');
      const avatar = document.createElement('span');
      const initials = String(student.name || 'Student').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('');
      avatar.className = 'student-avatar';
      avatar.textContent = initials || 'ST';
      nameCell.append(avatar, document.createTextNode(` ${student.name || ''}`));
      const usnCell = document.createElement('td');
      usnCell.textContent = String(student.usn || '');
      const countCell = document.createElement('td');
      const count = document.createElement('span');
      count.className = 'login-count';
      count.textContent = String(student.login_count ?? 0);
      countCell.append(count);
      const seenCell = document.createElement('td');
      const lastSeen = new Date(student.last_seen);
      seenCell.textContent = Number.isNaN(lastSeen.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(lastSeen);
      row.append(nameCell, usnCell, countCell, seenCell);
      adminTable.append(row);
    });
  }

  const aiForm = document.querySelector('#ai-form');
  const aiQuestion = document.querySelector('#ai-question');
  const aiMaterial = document.querySelector('#ai-material');
  const aiMessages = document.querySelector('#ai-messages');
  const aiStatus = document.querySelector('#ai-status');
  const aiCounter = document.querySelector('#ai-character-count');
  const materialCounter = document.querySelector('#ai-material-count');
  const aiSend = aiForm.querySelector('[type="submit"]');
  aiQuestion.addEventListener('input', () => { aiCounter.textContent = `${aiQuestion.value.length} / 1600`; });
  aiMaterial.addEventListener('input', () => { materialCounter.textContent = `${aiMaterial.value.length} / 6000`; });

  function addAiMessage(role, text, note = '') {
    const message = document.createElement('div');
    message.className = `ai-message ai-message-${role}`;
    const label = document.createElement('span');
    label.className = 'ai-message-label';
    label.textContent = role === 'assistant' ? 'NU AI' : 'YOU';
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    message.append(label, paragraph);
    if (note) {
      const noteLabel = document.createElement('small');
      noteLabel.className = 'ai-message-note';
      noteLabel.textContent = note;
      message.append(noteLabel);
    }
    aiMessages.append(message);
    aiMessages.scrollTop = aiMessages.scrollHeight;
  }

  aiForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const question = aiQuestion.value.trim();
    const material = aiMaterial.value.trim();
    if (!question) return;
    const history = aiConversation.slice(-8);
    aiConversation.push({ role: 'user', content: question });
    addAiMessage('user', question, material ? 'Course material attached to this question' : 'General question');
    aiQuestion.value = '';
    aiCounter.textContent = '0 / 1600';
    aiSend.disabled = true;
    aiStatus.textContent = 'NU AI is preparing an explanation…';
    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, material, messages: history }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'NU AI could not reply. Please try again.');
      aiConversation.push({ role: 'assistant', content: result.answer });
      addAiMessage('assistant', result.answer, material ? 'Based on the material you supplied and general knowledge' : 'General explanation · no college syllabus has been added yet');
      aiMaterial.value = '';
      materialCounter.textContent = '0 / 6000';
      aiStatus.textContent = 'AI tutor ready';
    } catch (error) {
      addAiMessage('assistant', error.message || 'NU AI is temporarily unavailable. Please try again shortly.');
      aiStatus.textContent = 'AI tutor unavailable';
    } finally {
      aiSend.disabled = false;
      aiQuestion.focus();
    }
  });

  fetch('/api/status').then((response) => response.ok ? response.json() : null).then((status) => {
    if (!status) {
      aiStatus.textContent = 'Backend not connected yet';
      return;
    }
    aiStatus.textContent = status.aiReady ? 'AI tutor ready · general explanations' : 'AI setup in progress';
  }).catch(() => { aiStatus.textContent = 'Backend not connected yet'; });
})();
