(function () {
  'use strict';

  const grid = document.getElementById('notesGrid');
  const createNewBtn = document.getElementById('createNewBtn');
  const btnMinimize = document.getElementById('btnMinimize');
  const btnClose = document.getElementById('btnClose');
  const btnRestore = document.getElementById('btnRestore');

  function readStoredNotes() {
    const notes = new Map();

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key) continue;

      if (key.startsWith('note_meta_')) {
        const noteId = key.replace('note_meta_', '');
        try {
          const meta = JSON.parse(localStorage.getItem(key) || '{}');
          notes.set(noteId, {
            id: noteId,
            title: meta.title || 'Untitled note',
            color: meta.color || localStorage.getItem(`note_color_${noteId}`) || '#FFF6B8',
            updatedAt: Number(meta.updatedAt) || 0,
          });
        } catch {
          notes.set(noteId, {
            id: noteId,
            title: 'Untitled note',
            color: localStorage.getItem(`note_color_${noteId}`) || '#FFF6B8',
            updatedAt: 0,
          });
        }
      }
    }

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key || !key.startsWith('note_content_')) continue;

      const noteId = key.replace('note_content_', '');
      if (notes.has(noteId)) continue;

      const content = localStorage.getItem(key) || '';
      const title = content.split(/\r?\n/).find(line => line.trim())?.trim() || 'Untitled note';
      notes.set(noteId, {
        id: noteId,
        title: title.slice(0, 48),
        color: localStorage.getItem(`note_color_${noteId}`) || '#FFF6B8',
        updatedAt: 0,
      });
    }

    return [...notes.values()].sort((left, right) => {
      const byDate = (Number(right.updatedAt) || 0) - (Number(left.updatedAt) || 0);
      if (byDate !== 0) return byDate;
      return String(left.title).localeCompare(String(right.title));
    });
  }

  function formatUpdatedAt(value) {
    if (!value) return 'Not recently edited';
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value));
  }

  function makePreview(content) {
    const lines = content.replace(/\r\n/g, '\n').split('\n');
    const previewLines = [];
    let totalChars = 0;

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();
      if (!line && previewLines.length === 0) continue;

      const displayLine = line.length > 72 ? `${line.slice(0, 72)}…` : line;
      previewLines.push(displayLine);
      totalChars += displayLine.length;

      if (previewLines.length >= 4 || totalChars >= 220) break;
    }

    return previewLines.join('\n');
  }

  function normalizeNoteColor(value) {
    if (typeof value !== 'string') return '#FFF6B8';
    const trimmed = value.trim();
    return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : '#FFF6B8';
  }

  function renderNotes() {
    const notes = readStoredNotes();

    if (!notes.length) {
      grid.innerHTML = `
        <div class="home-empty">
          <div>
            <h2>No notes yet</h2>
            <p>Create your first note to start saving ideas, reminders, and quick lists.</p>
            <button class="home-button primary" id="emptyCreateBtn" type="button">Create new note</button>
          </div>
        </div>
      `;

      syncSelectionUi();

      const emptyCreateBtn = document.getElementById('emptyCreateBtn');
      if (emptyCreateBtn) {
        emptyCreateBtn.addEventListener('click', () => window.electronAPI.newNote());
      }
      return;
    }

    grid.innerHTML = notes.map(note => `
      <article class="note-card" data-note-id="${note.id}" style="--note-card-bg: ${normalizeNoteColor(note.color)};">
        <div class="note-card-header">
          <div class="note-card-content">
            <h3>${escapeHtml(note.title)}</h3>
            <div class="note-meta">
              Last edited: ${formatUpdatedAt(note.updatedAt)}
            </div>
          </div>
          <button class="home-button danger icon-btn delete-note-btn" type="button" data-note-id="${note.id}" title="Delete note" aria-label="Delete note">🗑</button>
        </div>
      </article>
    `).join('');

    grid.querySelectorAll('.delete-note-btn').forEach(button => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        const noteId = button.dataset.noteId;
        if (!noteId) return;

        const confirmed = window.confirm('Delete this note? This cannot be undone.');
        if (!confirmed) return;

        localStorage.removeItem(`note_content_${noteId}`);
        localStorage.removeItem(`note_color_${noteId}`);
        localStorage.removeItem(`note_bounds_${noteId}`);
        localStorage.removeItem(`note_title_${noteId}`);
        localStorage.removeItem(`note_meta_${noteId}`);

        window.electronAPI.deleteNote(noteId);
        renderNotes();
      });
    });

    grid.querySelectorAll('.note-card').forEach(card => {
      card.addEventListener('dblclick', () => {
        window.electronAPI.openNote(card.dataset.noteId);
      });

      card.addEventListener('click', (event) => {
        const target = event.target;
        if (target && target.closest && target.closest('.note-card-actions, .note-select')) return;
        const noteId = card.dataset.noteId;
        if (!noteId) return;
        window.electronAPI.openNote(noteId);
      });
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  createNewBtn.addEventListener('click', () => {
    window.electronAPI.newNote();
  });

  btnMinimize.addEventListener('click', () => {
    window.electronAPI.homeMinimize();
  });

  btnClose.addEventListener('click', () => {
    window.electronAPI.homeClose();
  });

  btnRestore.addEventListener('click', () => {
    window.electronAPI.homeToggleRestore();
  });

  window.addEventListener('storage', renderNotes);
  window.addEventListener('focus', renderNotes);
  document.addEventListener('DOMContentLoaded', renderNotes);
})();
