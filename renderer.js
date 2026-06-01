/**
 * renderer.js — Sticky Notes renderer process
 *
 * Responsibilities:
 *  - Read noteId from the URL query-string
 *  - Restore content, colour, and bounds from localStorage
 *  - Persist content and colour on every change
 *  - Wire up colour swatches and window control buttons
 *  - Receive 'save-bounds' events from main and persist them
 */

(function () {
  'use strict';

  // ─── 1. Identify this window ────────────────────────────────────────────
  const params   = new URLSearchParams(window.location.search);
  const noteId   = params.get('noteId') ?? params.get('windowId') ?? '0';

  /** Namespaced localStorage keys for this specific note */
  const KEYS = {
    content: `note_content_${noteId}`,
    color:   `note_color_${noteId}`,
    bounds:  `note_bounds_${noteId}`,
    title:   `note_title_${noteId}`,
    meta:    `note_meta_${noteId}`,
  };

  // ─── 2. DOM refs ─────────────────────────────────────────────────────────
  const noteEl      = document.getElementById('note');
  const noteTitle   = document.getElementById('noteTitle');
  const btnSettings = document.getElementById('btnSettings');
  const settingsMenu = document.getElementById('settingsMenu');
  const btnMainMenu = document.getElementById('btnMainMenu');
  const btnDeleteList = document.getElementById('btnDeleteList');
  const btnBulletList = document.getElementById('btnBulletList');
  const btnNumberList = document.getElementById('btnNumberList');
  const editor      = document.getElementById('editor');
  const charCount   = document.getElementById('charCount');
  const swatches    = document.querySelectorAll('.swatch');
  const btnMinimize = document.getElementById('btnMinimize');
  const btnClose    = document.getElementById('btnClose');

  // ─── 3. Helpers ──────────────────────────────────────────────────────────

  // Ensure swatch buttons display their data-color (fix white center)
  swatches.forEach(s => {
    const c = s.dataset.color;
    if (c) s.style.backgroundColor = c;
  });

  /**
   * Apply a background colour to the note and persist it.
   * Also updates CSS custom properties so the titlebar tint follows.
   * @param {string} hex
   */
  function applyColor(hex) {
    noteEl.style.setProperty('--note-bg', hex);

    // Compute a slightly darker variant for the titlebar/footer
    // Mix with black by 18% to approximate the CSS color-mix used in :root
    const darken = (h, pct) => {
      const r = parseInt(h.slice(1,3), 16);
      const g = parseInt(h.slice(3,5), 16);
      const b = parseInt(h.slice(5,7), 16);
      const mix = v => Math.max(0, Math.min(255, Math.round(v * (1 - pct))));
      const toHex = v => v.toString(16).padStart(2, '0');
      return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
    };

    noteEl.style.setProperty('--note-bg-dark', darken(hex, 0.18));

    // Mark the active swatch
    swatches.forEach(s => s.classList.toggle('active', s.dataset.color === hex));

    localStorage.setItem(KEYS.color, hex);
    saveNoteMeta();
  }

  /** Update the character-count display in the footer */
  function updateCharCount() {
    const len = editor.value.replace(/\n$/, '').length; // trim trailing newline
    charCount.textContent = `${len.toLocaleString()} char${len !== 1 ? 's' : ''}`;
  }

  function getNoteTitle() {
    const explicitTitle = noteTitle.value.trim();
    if (explicitTitle) return explicitTitle.slice(0, 64);

    const lines = editor.value.split(/\r?\n/);
    const firstLine = lines.find(line => line.trim().length > 0)?.trim() ?? '';
    return firstLine.slice(0, 48) || 'Untitled note';
  }

  function saveNoteMeta() {
    const content = editor.value;
    const preview = content
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map(line => line.trimEnd())
      .filter((line, index, array) => line.length > 0 || index < array.length - 1)
      .slice(0, 4)
      .join('\n');

    const payload = {
      id: noteId,
      title: getNoteTitle(),
      preview,
      color: localStorage.getItem(KEYS.color) ?? '#FFF6B8',
      updatedAt: Date.now(),
      titleValue: noteTitle.value.trim(),
      contentLength: content.replace(/\n$/, '').length,
    };

    localStorage.setItem(KEYS.meta, JSON.stringify(payload));
    localStorage.setItem(KEYS.title, noteTitle.value.trim());
  }

  function setSelectionRange(start, end = start) {
    editor.setSelectionRange(start, end);
    editor.focus();
  }

  function getCaretIndex() {
    return editor.selectionStart ?? 0;
  }

  function insertPrefixAtCurrentLine(prefix) {
    const text = editor.value.replace(/\r\n/g, '\n');
    const caretIndex = getCaretIndex();
    const lineStart = text.lastIndexOf('\n', caretIndex - 1) + 1;
    const lineEnd = text.indexOf('\n', lineStart);
    const currentLineEnd = lineEnd === -1 ? text.length : lineEnd;
    const currentLine = text.slice(lineStart, currentLineEnd);

    if (/^\s*(?:•|-|\*|\d+[.)])\s/.test(currentLine)) {
      return;
    }

    const prefixText = `${prefix} `;
    const nextText = `${text.slice(0, lineStart)}${prefixText}${text.slice(lineStart)}`;
    editor.value = nextText;
    const nextCaret = caretIndex + prefixText.length;
    updateCharCount();
    saveNoteMeta();
    setSelectionRange(nextCaret, nextCaret);
  }

  function continueListOnEnter() {
    const text = editor.value.replace(/\r\n/g, '\n');
    const caretIndex = getCaretIndex();
    const lineStart = text.lastIndexOf('\n', caretIndex - 1) + 1;
    const currentLine = text.slice(lineStart, caretIndex);

    const bulletMatch = currentLine.match(/^(\s*)([•\-*])\s+/);
    if (bulletMatch) {
      const prefix = `${bulletMatch[1]}${bulletMatch[2]} `;
      const nextText = `${text.slice(0, caretIndex)}\n${prefix}${text.slice(caretIndex)}`;
      editor.value = nextText;
      const nextCaret = caretIndex + 1 + prefix.length;
      updateCharCount();
      saveNoteMeta();
      setSelectionRange(nextCaret, nextCaret);
      return true;
    }

    const numberMatch = currentLine.match(/^(\s*)(\d+)([.)])\s+/);
    if (numberMatch) {
      const nextNumber = Number(numberMatch[2]) + 1;
      const prefix = `${numberMatch[1]}${nextNumber}${numberMatch[3]} `;
      const nextText = `${text.slice(0, caretIndex)}\n${prefix}${text.slice(caretIndex)}`;
      editor.value = nextText;
      const nextCaret = caretIndex + 1 + prefix.length;
      updateCharCount();
      saveNoteMeta();
      setSelectionRange(nextCaret, nextCaret);
      return true;
    }

    return false;
  }

  function setSettingsMenuOpen(isOpen) {
    if (!settingsMenu) return;
    settingsMenu.classList.toggle('open', isOpen);
    settingsMenu.setAttribute('aria-hidden', String(!isOpen));
    btnSettings.setAttribute('aria-expanded', String(isOpen));
  }

  function closeSettingsMenu() {
    setSettingsMenuOpen(false);
  }

  function saveAndCloseMenu() {
    clearTimeout(saveTimer);
    localStorage.setItem(KEYS.content, editor.value);
    saveNoteMeta();
    closeSettingsMenu();
  }

  // ─── 4. Restore persisted state ──────────────────────────────────────────

  // Content
  const savedContent = localStorage.getItem(KEYS.content);
  if (savedContent) {
    editor.value = savedContent;
  }

  const savedTitle = localStorage.getItem(KEYS.title);
  if (savedTitle) {
    noteTitle.value = savedTitle;
  }

  // Colour
  const savedColor = localStorage.getItem(KEYS.color);
  if (savedColor) {
    applyColor(savedColor);
  } else {
    // Default: apply the first swatch colour and mark it active
    const firstSwatch = swatches[0];
    if (firstSwatch) {
      applyColor(firstSwatch.dataset.color);
    }
  }

  saveNoteMeta();

  updateCharCount();

  // Move cursor to end of content on load
  if (savedContent) {
    const range = document.createRange();
    const sel   = window.getSelection();
    range.selectNodeContents(editor);
    range.collapse(false); // collapse to end
    sel.removeAllRanges();
    sel.addRange(range);
  }

  // ─── 5. Persist content on every keystroke ───────────────────────────────

  let saveTimer = null;

  editor.addEventListener('input', () => {
    updateCharCount();
    saveNoteMeta();

    // Debounce writes to localStorage (300 ms)
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      localStorage.setItem(KEYS.content, editor.value);
      saveNoteMeta();
    }, 300);
  });

  noteTitle.addEventListener('input', () => {
    saveNoteMeta();
  });

  // Also save immediately on paste (covers large content drops)
  editor.addEventListener('paste', (e) => {
    // Normalise to plain text — prevent pasting rich HTML into the note
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    const start = editor.selectionStart ?? 0;
    const end = editor.selectionEnd ?? start;
    editor.setRangeText(text, start, end, 'end');
    updateCharCount();
    saveNoteMeta();
  });

  // ─── 6. Colour swatch clicks ─────────────────────────────────────────────

  swatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      applyColor(swatch.dataset.color);
    });
  });

  btnBulletList.addEventListener('click', () => {
    insertPrefixAtCurrentLine('•');
  });

  btnNumberList.addEventListener('click', () => {
    insertPrefixAtCurrentLine('1.');
  });

  // ─── 7. Window control buttons ───────────────────────────────────────────

  btnSettings.addEventListener('click', () => {
    setSettingsMenuOpen(!settingsMenu.classList.contains('open'));
  });

  document.addEventListener('click', (event) => {
    if (settingsMenu.contains(event.target) || btnSettings.contains(event.target)) return;
    closeSettingsMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeSettingsMenu();
    }
  });

  btnMainMenu.addEventListener('click', () => {
    saveAndCloseMenu();
    window.electronAPI.backHome();
  });

  btnMinimize.addEventListener('click', () => {
    window.electronAPI.minimizeNote();
  });

  btnDeleteList.addEventListener('click', () => {
    const confirmed = window.confirm('Delete this note? This cannot be undone.');
    if (!confirmed) return;

    saveAndCloseMenu();
    localStorage.removeItem(KEYS.content);
    localStorage.removeItem(KEYS.color);
    localStorage.removeItem(KEYS.bounds);
    localStorage.removeItem(KEYS.title);
    localStorage.removeItem(KEYS.meta);
    window.electronAPI.deleteNote(noteId);
    window.electronAPI.backHome();
  });

  btnClose.addEventListener('click', () => {
    // Flush any pending debounced save before closing
    saveAndCloseMenu();
    window.electronAPI.closeNote();
  });

  // ─── 8. Keyboard shortcuts ────────────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    // Ctrl+N → new note
    if (e.ctrlKey && e.key === 'n') {
      e.preventDefault();
      window.electronAPI.newNote();
    }
    // Ctrl+W → close note
    if (e.ctrlKey && e.key === 'w') {
      e.preventDefault();
      clearTimeout(saveTimer);
      localStorage.setItem(KEYS.content, editor.value);
      saveNoteMeta();
      window.electronAPI.closeNote();
    }

    if (e.key === 'Enter' && document.activeElement === editor) {
      const continued = continueListOnEnter();
      if (continued) {
        e.preventDefault();
        clearTimeout(saveTimer);
        localStorage.setItem(KEYS.content, editor.value);
        saveNoteMeta();
      }
    }
  });

  noteTitle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      editor.focus();
    }
  });

  // ─── 9. Receive & persist window bounds from main ────────────────────────
  window.electronAPI.onSaveBounds((bounds) => {
    localStorage.setItem(KEYS.bounds, JSON.stringify(bounds));
  });

  // ─── 10. Auto-focus the editor ───────────────────────────────────────────
  // Slight delay so the window has finished rendering before we focus
  setTimeout(() => editor.focus(), 80);

})();
