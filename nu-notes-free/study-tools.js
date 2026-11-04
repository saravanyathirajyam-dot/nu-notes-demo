(() => {
  const rows = [...document.querySelectorAll('.note-row')];
  const storagePrefix = 'nuNotes:';
  const defaultState = {
    examDate: '',
    lastTopic: null,
    savedTopics: [],
    reviewedTopics: [],
    revisionEnabled: false,
    revisionReminders: [],
  };
  const state = Object.fromEntries(Object.entries(defaultState).map(([key, fallback]) => [key, readStorage(key, fallback)]));
  let activeTopic = null;

  function readStorage(key, fallback) {
    try {
      const saved = localStorage.getItem(`${storagePrefix}${key}`);
      return saved === null ? fallback : JSON.parse(saved);
    } catch {
      return fallback;
    }
  }

  function writeStorage(key) {
    try { localStorage.setItem(`${storagePrefix}${key}`, JSON.stringify(state[key])); } catch { /* Storage can be unavailable in private browsing. */ }
  }

  function topicId(category, title) {
    const subjectSlug = String(category || 'Topic').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const titleSlug = String(title || 'topic').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `${subjectSlug}:${titleSlug}`;
  }

  function topicFromRow(row) {
    const title = row.querySelector('.note-info h3')?.textContent.trim() || 'Study topic';
    const category = row.dataset.category || 'General';
    return {
      id: topicId(category, title),
      title,
      category,
      key: row.dataset.topicKey || '',
      summary: row.querySelector('.note-info p')?.textContent.trim() || '',
    };
  }

  const catalog = rows.map(topicFromRow);
  const firstTopic = catalog[0] || null;
  const byId = (id) => catalog.find((topic) => topic.id === id) || state.savedTopics.find((topic) => topic.id === id) || null;
  const isSaved = (id) => state.savedTopics.some((topic) => topic.id === id);
  const reviewedTopic = (id) => state.reviewedTopics.find((topic) => topic.id === id);
  const dateKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const formatDate = (value) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));

  function notify(message) {
    const toast = document.querySelector('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => toast.classList.remove('is-visible'), 3000);
  }

  function setActiveTopic(topic) {
    if (!topic) return;
    activeTopic = topic;
    state.lastTopic = topic;
    writeStorage('lastTopic');
    renderContinue();
    renderReaderActions();
  }

  function openTopic(topic) {
    if (!topic) return;
    const row = rows.find((item) => topicFromRow(item).id === topic.id);
    if (row) {
      row.querySelector('.download-button')?.click();
      setActiveTopic(topicFromRow(row));
      return;
    }
    if (topic.key) {
      const matchingRow = rows.find((item) => item.dataset.topicKey === topic.key);
      matchingRow?.querySelector('.download-button')?.click();
      if (matchingRow) setActiveTopic(topicFromRow(matchingRow));
    }
  }

  function updateSaveButtons() {
    rows.forEach((row) => {
      const topic = topicFromRow(row);
      const button = row.querySelector('.save-note-button');
      if (!button) return;
      const saved = isSaved(topic.id);
      button.textContent = saved ? '★' : '☆';
      button.setAttribute('aria-pressed', String(saved));
      button.setAttribute('aria-label', `${saved ? 'Remove' : 'Save'} ${topic.title} ${saved ? 'from' : 'to'} saved topics`);
    });
    renderReaderActions();
  }

  function toggleSaved(topic) {
    if (!topic) return;
    if (isSaved(topic.id)) {
      state.savedTopics = state.savedTopics.filter((item) => item.id !== topic.id);
      notify('Removed from saved topics.');
    } else {
      state.savedTopics.unshift({ ...topic, savedAt: new Date().toISOString() });
      notify('Saved for later on this device.');
    }
    writeStorage('savedTopics');
    renderSavedTopics();
    renderPlan();
    updateSaveButtons();
  }

  function renderSavedTopics() {
    const container = document.querySelector('#saved-topics-list');
    if (!container) return;
    container.replaceChildren();
    if (!state.savedTopics.length) {
      const empty = document.createElement('p');
      empty.className = 'study-empty-copy';
      empty.textContent = 'Tap ☆ beside a note to keep it here.';
      container.append(empty);
      return;
    }
    state.savedTopics.slice(0, 6).forEach((topic) => {
      const item = document.createElement('div');
      item.className = 'saved-topic-item';
      const open = document.createElement('button');
      open.className = 'saved-topic-open';
      open.type = 'button';
      open.dataset.openTopic = topic.id;
      open.textContent = topic.title;
      const subject = document.createElement('small');
      subject.textContent = topic.category;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'saved-topic-remove';
      remove.dataset.removeSaved = topic.id;
      remove.setAttribute('aria-label', `Remove ${topic.title} from saved topics`);
      remove.textContent = '×';
      item.append(open, subject, remove);
      container.append(item);
    });
  }

  function dueReminders() {
    const now = Date.now();
    return state.revisionReminders.filter((item) => new Date(item.dueAt).getTime() <= now)
      .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
  }

  function renderRevision() {
    const container = document.querySelector('#revision-list');
    const toggle = document.querySelector('#revision-optin');
    if (!container || !toggle) return;
    toggle.checked = Boolean(state.revisionEnabled);
    container.replaceChildren();
    if (!state.revisionEnabled) {
      const empty = document.createElement('p');
      empty.className = 'study-empty-copy';
      empty.textContent = 'Turn on reminders to build a gentle review schedule.';
      container.append(empty);
      return;
    }
    const list = state.revisionReminders.slice().sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt)).slice(0, 5);
    if (!list.length) {
      const empty = document.createElement('p');
      empty.className = 'study-empty-copy';
      empty.textContent = 'No reminders yet. Mark a topic as reviewed to start.';
      container.append(empty);
      return;
    }
    list.forEach((reminder) => {
      const item = document.createElement('div');
      item.className = 'revision-item';
      const open = document.createElement('button');
      open.className = 'revision-open';
      open.type = 'button';
      open.dataset.openTopic = reminder.id;
      open.textContent = reminder.title;
      const due = document.createElement('small');
      const isDue = new Date(reminder.dueAt).getTime() <= Date.now();
      due.textContent = isDue ? 'Ready to revisit' : `Revisit ${formatDate(reminder.dueAt)}`;
      if (isDue) item.classList.add('is-due');
      item.append(open, due);
      container.append(item);
    });
  }

  function renderProgress() {
    const container = document.querySelector('#subject-progress-list');
    if (!container) return;
    container.replaceChildren();
    const groups = new Map();
    catalog.forEach((topic) => {
      if (!groups.has(topic.category)) groups.set(topic.category, []);
      groups.get(topic.category).push(topic);
    });
    [...groups.entries()].forEach(([category, topics]) => {
      const reviewed = topics.filter((topic) => reviewedTopic(topic.id)).length;
      const item = document.createElement('div');
      item.className = 'subject-progress-item';
      const top = document.createElement('div');
      top.className = 'subject-progress-top';
      const label = document.createElement('span');
      label.textContent = category;
      const count = document.createElement('small');
      count.textContent = `${reviewed} / ${topics.length} reviewed`;
      const track = document.createElement('div');
      track.className = 'subject-progress-track';
      track.setAttribute('role', 'progressbar');
      track.setAttribute('aria-label', `${category} topics reviewed`);
      track.setAttribute('aria-valuemin', '0');
      track.setAttribute('aria-valuemax', String(topics.length));
      track.setAttribute('aria-valuenow', String(reviewed));
      const fill = document.createElement('span');
      fill.style.width = `${topics.length ? Math.round((reviewed / topics.length) * 100) : 0}%`;
      track.append(fill);
      top.append(label, count);
      item.append(top, track);
      container.append(item);
    });
    if (!groups.size) {
      const empty = document.createElement('p');
      empty.className = 'study-empty-copy';
      empty.textContent = 'Progress will appear after topics are added.';
      container.append(empty);
    }
  }

  function renderContinue() {
    const title = document.querySelector('#continue-title');
    const subtitle = document.querySelector('#continue-subtitle');
    const button = document.querySelector('#continue-button');
    if (!title || !subtitle || !button) return;
    if (state.lastTopic) {
      title.textContent = state.lastTopic.title;
      subtitle.textContent = `${state.lastTopic.category} · saved on this device`;
      button.textContent = 'Continue topic ↗';
    } else if (firstTopic) {
      title.textContent = 'Choose a topic to begin';
      subtitle.textContent = 'Your last opened topic will appear here.';
      button.textContent = 'Open a topic ↗';
    }
  }

  function renderExamCountdown() {
    const input = document.querySelector('#exam-date');
    const output = document.querySelector('#exam-countdown');
    if (!input || !output) return;
    input.value = state.examDate || '';
    if (!state.examDate) {
      output.textContent = 'Set a date when you know it.';
      return;
    }
    const exam = new Date(`${state.examDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Math.round((exam.getTime() - today.getTime()) / 86400000);
    if (Number.isNaN(days)) output.textContent = 'Choose a valid exam date.';
    else if (days < 0) output.textContent = 'That date has passed. Set your next exam date.';
    else if (days === 0) output.textContent = 'Your exam is today. Take one topic at a time.';
    else output.textContent = `${days} day${days === 1 ? '' : 's'} until your selected exam`;
  }

  function renderPlan() {
    const container = document.querySelector('#daily-plan-list');
    if (!container || !catalog.length) return;
    const now = new Date();
    const dayNumber = Number(dateKey(now).replace(/-/g, ''));
    const topicOfDay = catalog[dayNumber % catalog.length];
    const due = dueReminders();
    const saved = state.savedTopics[0] || null;
    const planKey = `plan:${dateKey(now)}`;
    const completed = readStorage(planKey, []);
    const plan = [
      { key: 'focus', copy: `Read a short explanation: ${topicOfDay.title}`, action: 'open', target: topicOfDay.id, button: 'Open topic' },
      due.length
        ? { key: 'review', copy: `Revisit a topic due today: ${due[0].title}`, action: 'open', target: due[0].id, button: 'Review' }
        : saved
          ? { key: 'review', copy: `Revisit a saved topic: ${saved.title}`, action: 'open', target: saved.id, button: 'Open saved' }
          : { key: 'review', copy: 'Choose a useful topic to save for later', action: 'library', target: '', button: 'Browse notes' },
      { key: 'ask', copy: `Ask NU AI to explain ${topicOfDay.title} more simply`, action: 'ask', target: topicOfDay.title, button: 'Ask NU AI' },
    ];
    container.replaceChildren();
    plan.forEach((task) => {
      const item = document.createElement('li');
      item.className = 'daily-plan-item';
      const label = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = Array.isArray(completed) && completed.includes(task.key);
      checkbox.dataset.planCheck = task.key;
      const copy = document.createElement('span');
      copy.textContent = task.copy;
      label.append(checkbox, copy);
      const action = document.createElement('button');
      action.type = 'button';
      action.className = 'daily-plan-action';
      action.dataset.planAction = task.action;
      action.dataset.planTarget = task.target;
      action.textContent = task.button;
      item.append(label, action);
      container.append(item);
    });
  }

  function renderReaderActions() {
    const save = document.querySelector('#reader-save');
    const reviewed = document.querySelector('#reader-reviewed');
    if (!save || !reviewed) return;
    const saved = Boolean(activeTopic && isSaved(activeTopic.id));
    save.textContent = saved ? '★ Saved' : '☆ Save topic';
    save.setAttribute('aria-pressed', String(saved));
    const wasReviewed = Boolean(activeTopic && reviewedTopic(activeTopic.id));
    reviewed.textContent = wasReviewed ? 'Reviewed before · mark again' : 'Mark as reviewed';
  }

  function renderAll() {
    renderExamCountdown();
    renderContinue();
    renderProgress();
    renderSavedTopics();
    renderRevision();
    renderPlan();
    updateSaveButtons();
  }

  rows.forEach((row) => {
    const openButton = row.querySelector('.download-button');
    if (!openButton) return;
    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.className = 'save-note-button';
    saveButton.dataset.saveNote = '';
    saveButton.textContent = '☆';
    saveButton.setAttribute('aria-pressed', 'false');
    row.insertBefore(saveButton, openButton);
  });

  document.addEventListener('click', (event) => {
    const target = event.target;
    const saveNote = target.closest('[data-save-note]');
    if (saveNote) {
      event.preventDefault();
      event.stopPropagation();
      const row = saveNote.closest('.note-row');
      if (row) toggleSaved(topicFromRow(row));
      return;
    }

    const removeSaved = target.closest('[data-remove-saved]');
    if (removeSaved) {
      state.savedTopics = state.savedTopics.filter((topic) => topic.id !== removeSaved.dataset.removeSaved);
      writeStorage('savedTopics');
      renderAll();
      return;
    }

    const openSaved = target.closest('[data-open-topic]');
    if (openSaved) {
      openTopic(byId(openSaved.dataset.openTopic));
      return;
    }

    const noteOpen = target.closest('.download-button');
    if (noteOpen) {
      const row = noteOpen.closest('.note-row');
      if (row) setActiveTopic(topicFromRow(row));
      return;
    }

    if (target.closest('#reader-save')) {
      toggleSaved(activeTopic);
      return;
    }

    if (target.closest('#reader-reviewed')) {
      if (!activeTopic) return;
      const now = new Date();
      const previous = reviewedTopic(activeTopic.id);
      const entry = { ...activeTopic, reviewedAt: now.toISOString(), reviewCount: (previous?.reviewCount || 0) + 1 };
      state.reviewedTopics = [...state.reviewedTopics.filter((topic) => topic.id !== activeTopic.id), entry];
      writeStorage('reviewedTopics');
      let nextMessage = 'Topic marked as reviewed. Progress is saved on this device.';
      if (state.revisionEnabled) {
        const current = state.revisionReminders.find((reminder) => reminder.id === activeTopic.id);
        const intervals = [1, 3, 7, 14, 30];
        const stage = current ? Math.min((current.stage || 0) + 1, intervals.length - 1) : 0;
        const dueAt = new Date(now.getTime() + intervals[stage] * 86400000).toISOString();
        state.revisionReminders = [...state.revisionReminders.filter((reminder) => reminder.id !== activeTopic.id), { ...activeTopic, stage, dueAt }];
        writeStorage('revisionReminders');
        nextMessage = `Reviewed. Your next reminder is in ${intervals[stage]} day${intervals[stage] === 1 ? '' : 's'}.`;
      }
      renderAll();
      notify(nextMessage);
      return;
    }

    const planAction = target.closest('[data-plan-action]');
    if (planAction) {
      if (planAction.dataset.planAction === 'open') openTopic(byId(planAction.dataset.planTarget));
      if (planAction.dataset.planAction === 'library') document.querySelector('#library')?.scrollIntoView({ behavior: 'smooth' });
      if (planAction.dataset.planAction === 'ask') {
        const question = document.querySelector('#ai-question');
        document.querySelector('#ai-tutor')?.scrollIntoView({ behavior: 'smooth' });
        if (question) {
          question.value = `Please explain ${planAction.dataset.planTarget} in simple steps.`;
          question.dispatchEvent(new Event('input', { bubbles: true }));
          window.setTimeout(() => question.focus(), 350);
        }
      }
    }
  });

  document.addEventListener('change', (event) => {
    if (event.target.id === 'exam-date') {
      state.examDate = event.target.value;
      writeStorage('examDate');
      renderExamCountdown();
    }
    if (event.target.id === 'revision-optin') {
      state.revisionEnabled = event.target.checked;
      writeStorage('revisionEnabled');
      if (!state.revisionEnabled) {
        state.revisionReminders = [];
        writeStorage('revisionReminders');
      }
      renderRevision();
      renderPlan();
    }
    if (event.target.matches('[data-plan-check]')) {
      const planKey = `plan:${dateKey()}`;
      const completed = readStorage(planKey, []);
      const updated = new Set(Array.isArray(completed) ? completed : []);
      if (event.target.checked) updated.add(event.target.dataset.planCheck);
      else updated.delete(event.target.dataset.planCheck);
      try { localStorage.setItem(`${storagePrefix}${planKey}`, JSON.stringify([...updated])); } catch { /* Keep the checkbox usable when storage is unavailable. */ }
    }
  });

  document.querySelector('#exam-date-clear')?.addEventListener('click', () => {
    state.examDate = '';
    writeStorage('examDate');
    renderExamCountdown();
  });
  document.querySelector('#continue-button')?.addEventListener('click', () => openTopic(state.lastTopic || firstTopic));

  const aiMessages = document.querySelector('#ai-messages');
  const aiStatus = document.querySelector('#ai-status');
  if (aiMessages && aiStatus) {
    const followUps = [
      ['Explain more simply', 'Please explain that more simply, in clear steps.'],
      ['Show a worked example', 'Please show one worked example for this topic and explain each step.'],
      ['Short recap', 'Please summarize the key idea in three short bullet points.'],
    ];
    const addFollowUps = () => {
      if (!aiStatus.textContent.toLowerCase().includes('ready')) return;
      aiMessages.querySelectorAll('.ai-message-assistant:not([data-ai-intro])').forEach((message) => {
        if (message.dataset.followUpsAdded === 'true') return;
        message.dataset.followUpsAdded = 'true';
        const group = document.createElement('div');
        group.className = 'ai-follow-ups';
        followUps.forEach(([label, prompt]) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = label;
          button.addEventListener('click', () => {
            const question = document.querySelector('#ai-question');
            const form = document.querySelector('#ai-form');
            if (!question || !form) return;
            question.value = prompt;
            question.dispatchEvent(new Event('input', { bubbles: true }));
            form.requestSubmit();
          });
          group.append(button);
        });
        message.append(group);
      });
    };
    new MutationObserver(addFollowUps).observe(aiMessages, { childList: true, subtree: true });
  }

  renderAll();
})();
