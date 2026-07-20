/*
 * app.js — WOL Study Assistant
 *
 * A fully client-side study helper. It parses scripture references and opens
 * the exact passage in the NWT Study Bible on jw.org, runs topic searches on
 * the Watchtower ONLINE Library (wol.jw.org), lets you browse all 66 books,
 * and remembers your history and bookmarks in localStorage.
 *
 * No backend, no API keys — every result is an official deep-link into the
 * real library, so the wording and content always come straight from jw.org.
 */

'use strict';

/* ------------------------------------------------------------------ *
 *  Official link builders
 * ------------------------------------------------------------------ */

const WOL_LOCALE = 'lp-e'; // English WOL library path segment
const JW_LOCALE = 'E';     // jw.org finder locale

// Numeric verse ID used by the jw.org finder: BBcccvvv (book, chapter, verse).
function verseId(bookNum, chapter, verse) {
  return bookNum * 1_000_000 + chapter * 1_000 + (verse || 0);
}

// Deep-link that opens a passage in the NWT Study Bible on jw.org.
function studyBibleUrl(ref) {
  const start = verseId(ref.book.n, ref.chapter, ref.verse || 1);
  let bible = String(start);
  if (ref.endVerse && ref.endVerse > (ref.verse || 1)) {
    bible += '-' + verseId(ref.book.n, ref.chapter, ref.endVerse);
  }
  const params = new URLSearchParams({
    wtlocale: JW_LOCALE,
    pub: 'nwtsty',
    bible: bible,
    srcid: 'wol-study-assistant',
  });
  return 'https://www.jw.org/finder?' + params.toString();
}

// Search the whole Watchtower ONLINE Library for a word or phrase.
function wolSearchUrl(query) {
  const params = new URLSearchParams({ q: query });
  return `https://wol.jw.org/en/wol/s/r1/${WOL_LOCALE}?` + params.toString();
}

// Open a scripture reference directly in WOL (Bible reader).
function wolScriptureUrl(ref) {
  const label = ref.verse
    ? `${ref.book.name} ${ref.chapter}:${ref.verse}`
    : `${ref.book.name} ${ref.chapter}`;
  return wolSearchUrl(label);
}

/* ------------------------------------------------------------------ *
 *  Reference parsing
 * ------------------------------------------------------------------ */

// Build a fast lookup from every accepted name/abbreviation → book object.
const BOOK_INDEX = (() => {
  const idx = new Map();
  const norm = (s) => s.toLowerCase().replace(/[.\s]+/g, '');
  for (const b of BIBLE_BOOKS) {
    idx.set(norm(b.name), b);
    for (const a of b.abbr) idx.set(norm(a), b);
  }
  return { map: idx, norm };
})();

function findBook(namePart) {
  return BOOK_INDEX.map.get(BOOK_INDEX.norm(namePart)) || null;
}

/*
 * Parse strings like:
 *   "John 3:16"  "1 John 3:16-18"  "Ps 23"  "Genesis 1:1"  "rev 21"
 * Returns { book, chapter, verse, endVerse } or null.
 */
function parseReference(input) {
  if (!input) return null;
  const text = input.trim();
  // Book part (may contain a leading number + spaces), then chapter[:verse[-verse]]
  const m = text.match(/^([1-3]?\s*[A-Za-z][A-Za-z.\s]*?)\s*(\d+)(?::(\d+)(?:\s*[-–]\s*(\d+))?)?\s*$/);
  if (!m) return null;

  const book = findBook(m[1]);
  if (!book) return null;

  const chapter = parseInt(m[2], 10);
  if (chapter < 1 || chapter > book.chapters) return null;

  const verse = m[3] ? parseInt(m[3], 10) : null;
  const endVerse = m[4] ? parseInt(m[4], 10) : null;
  if (verse !== null && verse < 1) return null;
  if (endVerse !== null && endVerse < verse) return null;

  return { book, chapter, verse, endVerse };
}

function formatRef(ref) {
  let s = `${ref.book.name} ${ref.chapter}`;
  if (ref.verse) {
    s += ':' + ref.verse;
    if (ref.endVerse && ref.endVerse !== ref.verse) s += '-' + ref.endVerse;
  }
  return s;
}

/* ------------------------------------------------------------------ *
 *  Persistent state (history + bookmarks)
 * ------------------------------------------------------------------ */

const Store = {
  read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  },
  write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  },
};

const HISTORY_KEY = 'wolsa.history';
const BOOKMARK_KEY = 'wolsa.bookmarks';
const THEME_KEY = 'wolsa.theme';

function pushHistory(label) {
  let h = Store.read(HISTORY_KEY, []);
  h = [label, ...h.filter((x) => x !== label)].slice(0, 12);
  Store.write(HISTORY_KEY, h);
  renderHistory();
}

function toggleBookmark(label) {
  let b = Store.read(BOOKMARK_KEY, []);
  if (b.includes(label)) b = b.filter((x) => x !== label);
  else b = [label, ...b];
  Store.write(BOOKMARK_KEY, b);
  renderBookmarks();
  refreshBookmarkButtons();
}

function isBookmarked(label) {
  return Store.read(BOOKMARK_KEY, []).includes(label);
}

/* ------------------------------------------------------------------ *
 *  DOM helpers
 * ------------------------------------------------------------------ */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function el(tag, attrs = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  for (const kid of kids) {
    if (kid == null) continue;
    node.append(kid.nodeType ? kid : document.createTextNode(kid));
  }
  return node;
}

/* ------------------------------------------------------------------ *
 *  Scripture lookup view
 * ------------------------------------------------------------------ */

function runLookup() {
  const raw = $('#ref-input').value;
  const ref = parseReference(raw);
  const result = $('#lookup-result');
  result.innerHTML = '';

  if (!ref) {
    result.append(
      el('div', { class: 'notice error' },
        el('strong', {}, 'Could not read that reference. '),
        'Try a form like ', el('code', {}, 'John 3:16'), ', ',
        el('code', {}, '1 John 4:8-10'), ', or ', el('code', {}, 'Psalm 23'), '.')
    );
    return;
  }

  const label = formatRef(ref);
  pushHistory(label);
  result.append(buildResultCard(ref, label));
}

function buildResultCard(ref, label) {
  const bookmarked = isBookmarked(label);
  return el('div', { class: 'result-card' },
    el('div', { class: 'result-head' },
      el('div', {},
        el('h3', {}, label),
        el('p', { class: 'muted' }, `${ref.book.name} • ${ref.book.chapters} chapters`)
      ),
      el('button', {
        class: 'bookmark-btn' + (bookmarked ? ' active' : ''),
        title: bookmarked ? 'Remove bookmark' : 'Save bookmark',
        'data-label': label,
        onclick: () => toggleBookmark(label),
      }, bookmarked ? '★ Saved' : '☆ Save')
    ),
    el('div', { class: 'link-row' },
      linkButton('Read in NWT Study Bible', studyBibleUrl(ref), 'primary'),
      linkButton('Open in WOL', wolScriptureUrl(ref), 'secondary'),
      linkButton('Search this in WOL', wolSearchUrl(label), 'secondary')
    )
  );
}

function linkButton(text, href, kind) {
  return el('a', {
    class: `btn ${kind}`,
    href,
    target: '_blank',
    rel: 'noopener noreferrer',
  }, text);
}

/* Populate the book <select> and wire the jump controls. */
function initBookPicker() {
  const sel = $('#book-select');
  for (const b of BIBLE_BOOKS) {
    sel.append(el('option', { value: b.n }, b.name));
  }
  const syncChapters = () => {
    const b = BIBLE_BOOKS[sel.value - 1];
    const chap = $('#chapter-input');
    chap.max = b.chapters;
    chap.placeholder = `1–${b.chapters}`;
  };
  sel.addEventListener('change', syncChapters);
  syncChapters();

  $('#picker-go').addEventListener('click', () => {
    const b = BIBLE_BOOKS[sel.value - 1];
    const chapter = parseInt($('#chapter-input').value, 10) || 1;
    const verse = parseInt($('#verse-input').value, 10) || null;
    let ref = `${b.name} ${Math.min(Math.max(chapter, 1), b.chapters)}`;
    if (verse) ref += ':' + verse;
    $('#ref-input').value = ref;
    runLookup();
  });
}

/* ------------------------------------------------------------------ *
 *  Topic search view
 * ------------------------------------------------------------------ */

function initSearchView() {
  const go = () => {
    const q = $('#search-input').value.trim();
    if (q) window.open(wolSearchUrl(q), '_blank', 'noopener');
  };
  $('#search-go').addEventListener('click', go);
  $('#search-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });

  const chips = $('#topic-chips');
  for (const t of STUDY_TOPICS) {
    chips.append(el('button', {
      class: 'chip',
      onclick: () => window.open(wolSearchUrl(t), '_blank', 'noopener'),
    }, t));
  }
}

/* ------------------------------------------------------------------ *
 *  Browse books view
 * ------------------------------------------------------------------ */

function initBooksView() {
  const container = $('#books-list');
  const filter = $('#books-filter');

  const render = (term = '') => {
    container.innerHTML = '';
    const t = term.trim().toLowerCase();
    for (const section of BIBLE_SECTIONS) {
      const [lo, hi] = section.range;
      const books = BIBLE_BOOKS
        .filter((b) => b.n >= lo && b.n <= hi)
        .filter((b) => !t || b.name.toLowerCase().includes(t) || b.abbr.some((a) => a.includes(t)));
      if (!books.length) continue;
      container.append(el('h3', { class: 'section-title' }, section.title));
      const grid = el('div', { class: 'book-grid' });
      for (const b of books) {
        grid.append(el('button', {
          class: 'book-cell',
          title: `Open ${b.name} in the NWT Study Bible`,
          onclick: () => {
            $('#ref-input').value = `${b.name} 1`;
            switchTab('lookup');
            runLookup();
          },
        },
          el('span', { class: 'book-name' }, b.name),
          el('span', { class: 'book-meta' }, `${b.chapters} ch`)
        ));
      }
      container.append(grid);
    }
    if (!container.children.length) {
      container.append(el('p', { class: 'muted' }, 'No books match that filter.'));
    }
  };

  filter.addEventListener('input', () => render(filter.value));
  render();
}

/* ------------------------------------------------------------------ *
 *  History + bookmarks rendering
 * ------------------------------------------------------------------ */

function chipListFrom(labels, emptyText) {
  if (!labels.length) return el('p', { class: 'muted' }, emptyText);
  const wrap = el('div', { class: 'saved-list' });
  for (const label of labels) {
    wrap.append(el('button', {
      class: 'chip',
      onclick: () => {
        $('#ref-input').value = label;
        switchTab('lookup');
        runLookup();
      },
    }, label));
  }
  return wrap;
}

function renderHistory() {
  const box = $('#history-box');
  box.innerHTML = '';
  box.append(chipListFrom(Store.read(HISTORY_KEY, []), 'Your recent lookups will appear here.'));
}

function renderBookmarks() {
  const box = $('#bookmarks-box');
  box.innerHTML = '';
  const marks = Store.read(BOOKMARK_KEY, []);
  if (!marks.length) {
    box.append(el('p', { class: 'muted' }, 'Save a passage from the Lookup tab to pin it here.'));
    return;
  }
  const wrap = el('div', { class: 'saved-list' });
  for (const label of marks) {
    wrap.append(el('span', { class: 'saved-item' },
      el('button', {
        class: 'chip',
        onclick: () => {
          $('#ref-input').value = label;
          switchTab('lookup');
          runLookup();
        },
      }, label),
      el('button', {
        class: 'remove-x',
        title: 'Remove',
        onclick: () => toggleBookmark(label),
      }, '×')
    ));
  }
  box.append(wrap);
}

// Keep any visible Save button in sync after a bookmark toggle.
function refreshBookmarkButtons() {
  for (const btn of $$('.bookmark-btn')) {
    const on = isBookmarked(btn.dataset.label);
    btn.classList.toggle('active', on);
    btn.textContent = on ? '★ Saved' : '☆ Save';
    btn.title = on ? 'Remove bookmark' : 'Save bookmark';
  }
}

/* ------------------------------------------------------------------ *
 *  Tabs + theme
 * ------------------------------------------------------------------ */

function switchTab(name) {
  for (const tab of $$('.tab')) tab.classList.toggle('active', tab.dataset.tab === name);
  for (const panel of $$('.panel')) panel.classList.toggle('active', panel.dataset.panel === name);
}

function initTabs() {
  for (const tab of $$('.tab')) {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  }
}

function initTheme() {
  const saved = Store.read(THEME_KEY, null);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = saved === null ? prefersDark : saved === 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';

  $('#theme-toggle').addEventListener('click', () => {
    const now = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = now;
    Store.write(THEME_KEY, now);
  });
}

/* ------------------------------------------------------------------ *
 *  Boot
 * ------------------------------------------------------------------ */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initTabs();
  initBookPicker();
  initSearchView();
  initBooksView();
  renderHistory();
  renderBookmarks();

  $('#lookup-go').addEventListener('click', runLookup);
  $('#ref-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') runLookup(); });
  $('#ref-input').focus();
});
