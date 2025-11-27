// Storage
const STORAGE_KEY = 'crunchlist_animes_v1';
let animes = [];
let currentDetailId = null;
let selectedTags = new Set();

// Elements
const grid = document.getElementById('grid');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const sortSelect = document.getElementById('sortSelect');
const addAnimeBtn = document.getElementById('addAnimeBtn');

const formModal = document.getElementById('formModal');
const formTitle = document.getElementById('formTitle');
const closeFormModal = document.getElementById('closeFormModal');

const animeForm = document.getElementById('animeForm');
const animeId = document.getElementById('animeId');
const titleInput = document.getElementById('title');
const statusInput = document.getElementById('status');
const episodesInput = document.getElementById('episodes');
const scoreInput = document.getElementById('score');
const genresInput = document.getElementById('genres');
const tagsInput = document.getElementById('tags');
const synopsisInput = document.getElementById('synopsis');
const favoriteInput = document.getElementById('favoriteInput');
const coverInput = document.getElementById('cover');
const coverPreview = document.getElementById('coverPreview');
const resetFormBtn = document.getElementById('resetForm');
const coverDropzone = document.getElementById('coverDropzone');

const detailModal = document.getElementById('detailModal');
const closeDetailModal = document.getElementById('closeDetailModal');
const detailTitle = document.getElementById('detailTitle');
const detailCover = document.getElementById('detailCover');
const detailTitleText = document.getElementById('detailTitleText');
const detailStatus = document.getElementById('detailStatus');
const detailEpisodes = document.getElementById('detailEpisodes');
const detailScore = document.getElementById('detailScore');
const detailGenres = document.getElementById('detailGenres');
const detailTags = document.getElementById('detailTags');
const detailSynopsis = document.getElementById('detailSynopsis');
const toggleFavoriteBtn = document.getElementById('toggleFavorite');
const editAnimeBtn = document.getElementById('editAnime');
const deleteAnimeBtn = document.getElementById('deleteAnime');

const statTotal = document.getElementById('statTotal');
const statWatching = document.getElementById('statWatching');
const statCompleted = document.getElementById('statCompleted');
const statFav = document.getElementById('statFav');

const tagsPanel = document.getElementById('tagsPanel');
const clearTagsFilter = document.getElementById('clearTagsFilter');

const exportBtn = document.getElementById('exportBtn');
const importInput = document.getElementById('importInput');
const themeToggle = document.getElementById('themeToggle');

// Init
init();

function init() {
  applySavedTheme();
  load();
  render();
  bindEvents();
}

// Theme
function applySavedTheme() {
  const saved = localStorage.getItem('crunchlist_theme') || 'light';
  document.documentElement.classList.toggle('dark', saved === 'dark');
}
function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('crunchlist_theme', isDark ? 'dark' : 'light');
}

// Storage helpers
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    animes = raw ? JSON.parse(raw) : [];
  } catch {
    animes = [];
  }
}
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(animes));
}

// Render pipeline
function render() {
  const term = (searchInput.value || '').trim().toLowerCase();
  const status = statusFilter.value;

  let filtered = animes.filter(a => {
    const text = `${a.title} ${(a.genres||[]).join(' ')} ${(a.tags||[]).join(' ')}`.toLowerCase();
    const matchTerm = term ? text.includes(term) : true;
    const matchStatus = status ? a.status === status : true;
    const matchTags = selectedTags.size
      ? (a.tags || []).some(t => selectedTags.has(t))
      : true;
    return matchTerm && matchStatus && matchTags;
  });

  filtered = sortRecords(filtered, sortSelect.value);

  grid.innerHTML = '';
  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.style.color = 'var(--muted)';
    empty.style.textAlign = 'center';
    empty.style.padding = '28px';
    empty.textContent = 'Nenhum anime encontrado. Adicione um novo ou ajuste os filtros.';
    grid.appendChild(empty);
  } else {
    for (const a of filtered) {
      const card = document.createElement('article');
      card.className = 'card';
      card.innerHTML = `
        <img src="${a.cover || ''}" alt="Capa de ${escapeHtml(a.title)}" />
        <div class="content">
          <h3 class="title">${escapeHtml(a.title)}</h3>
          <div class="meta">
            <span>${a.status}</span>
            <span>Ep: ${a.episodes ?? '-'}</span>
            <span>Nota: ${a.score ?? '-'}</span>
          </div>
          <div class="chips">
            ${(a.genres||[]).slice(0,3).map(g => `<span class="chip">${escapeHtml(g)}</span>`).join('')}
          </div>
        </div>
      `;
      card.addEventListener('click', () => openDetail(a.id));
      grid.appendChild(card);
    }
  }

  renderStats();
  renderTagsPanel();
}

function sortRecords(list, mode) {
  const byStr = (a, b, k) => (a[k] || '').localeCompare(b[k] || '', 'pt', { sensitivity: 'base' });
  const byNumDesc = (a, b, k) => (b[k] ?? -Infinity) - (a[k] ?? -Infinity);
  const byNumAsc = (a, b, k) => (a[k] ?? Infinity) - (b[k] ?? Infinity);
  const byFav = (a, b) => (b.favorite === true) - (a.favorite === true) || byStr(a,b,'title');

  switch (mode) {
    case 'title_asc': return [...list].sort((a,b)=>byStr(a,b,'title'));
    case 'title_desc': return [...list].sort((a,b)=>byStr(b,a,'title'));
    case 'score_desc': return [...list].sort((a,b)=>byNumDesc(a,b,'score'));
    case 'score_asc': return [...list].sort((a,b)=>byNumAsc(a,b,'score'));
    case 'episodes_desc': return [...list].sort((a,b)=>byNumDesc(a,b,'episodes'));
    case 'episodes_asc': return [...list].sort((a,b)=>byNumAsc(a,b,'episodes'));
    case 'created_asc': return [...list].sort((a,b)=>byNumAsc(a,b,'createdAt'));
    case 'fav_first': return [...list].sort(byFav);
    case 'created_desc':
    default: return [...list].sort((a,b)=>byNumDesc(a,b,'createdAt'));
  }
}

function renderStats() {
  const total = animes.length;
  const watching = animes.filter(a => a.status === 'Assistindo').length;
  const completed = animes.filter(a => a.status === 'Completo').length;
  const fav = animes.filter(a => a.favorite).length;
  statTotal.textContent = total;
  statWatching.textContent = watching;
  statCompleted.textContent = completed;
  statFav.textContent = fav;
}

function renderTagsPanel() {
  const allTags = new Set();
  for (const a of animes) (a.tags||[]).forEach(t => allTags.add(t));
  const tags = [...allTags].sort((a,b)=>a.localeCompare(b,'pt',{sensitivity:'base'}));

  tagsPanel.innerHTML = '';
  if (tags.length === 0) {
    const hint = document.createElement('div');
    hint.style.color = 'var(--muted)';
    hint.textContent = 'Sem tags ainda. Adicione tags no cadastro.';
    tagsPanel.appendChild(hint);
    return;
  }
  for (const t of tags) {
    const btn = document.createElement('button');
    btn.className = 'btn tiny ' + (selectedTags.has(t) ? 'primary' : 'ghost');
    btn.textContent = t;
    btn.addEventListener('click', () => {
      if (selectedTags.has(t)) selectedTags.delete(t);
      else selectedTags.add(t);
      render();
    });
    tagsPanel.appendChild(btn);
  }
}

// Events
function bindEvents() {
  addAnimeBtn.addEventListener('click', () => openForm());
  closeFormModal.addEventListener('click', () => hideForm());
  closeDetailModal.addEventListener('click', () => hideDetail());

  searchInput.addEventListener('input', render);
  statusFilter.addEventListener('change', render);
  sortSelect.addEventListener('change', render);
  clearTagsFilter.addEventListener('click', () => { selectedTags.clear(); render(); });

  resetFormBtn.addEventListener('click', () => animeForm.reset());

  // Dropzone interactions
  coverDropzone.addEventListener('click', () => coverInput.click());
  coverDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    coverDropzone.style.borderColor = 'var(--primary)';
  });
  coverDropzone.addEventListener('dragleave', () => {
    coverDropzone.style.borderColor = 'color-mix(in oklab, var(--primary), var(--border) 70%)';
  });
  coverDropzone.addEventListener('drop', async (e) => {
    e.preventDefault();
    coverDropzone.style.borderColor = 'color-mix(in oklab, var(--primary), var(--border) 70%)';
    const file = e.dataTransfer.files?.[0];
    if (file) await setCoverFile(file);
  });

  coverInput.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (file) await setCoverFile(file);
  });

  animeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = animeId.value || cryptoRandomId();
    const existingIndex = animes.findIndex(x => x.id === id);
    const now = Date.now();

    const record = {
      id,
      title: titleInput.value.trim(),
      status: statusInput.value,
      episodes: parseIntSafe(episodesInput.value),
      score: parseFloatSafe(scoreInput.value),
      genres: parseList(genresInput.value),
      tags: parseList(tagsInput.value),
      synopsis: synopsisInput.value.trim(),
      cover: coverPreview.src || '',
      favorite: !!favoriteInput.checked,
      createdAt: existingIndex >= 0 ? animes[existingIndex].createdAt : now,
      updatedAt: now
    };

    if (!record.title) { alert('Título é obrigatório.'); return; }

    if (existingIndex >= 0) animes[existingIndex] = record;
    else animes.push(record);

    save();
    hideForm();
    render();
  });

  editAnimeBtn.addEventListener('click', () => {
    if (!currentDetailId) return;
    const a = animes.find(x => x.id === currentDetailId);
    if (!a) return;
    hideDetail();
    openForm(a);
  });

  deleteAnimeBtn.addEventListener('click', () => {
    if (!currentDetailId) return;
    const ok = confirm('Tem certeza que deseja excluir este anime?');
    if (!ok) return;
    animes = animes.filter(x => x.id !== currentDetailId);
    save();
    hideDetail();
    render();
  });

  toggleFavoriteBtn.addEventListener('click', () => {
    if (!currentDetailId) return;
    const idx = animes.findIndex(x => x.id === currentDetailId);
    if (idx < 0) return;
    animes[idx].favorite = !animes[idx].favorite;
    animes[idx].updatedAt = Date.now();
    save();
    render();
    openDetail(currentDetailId); // refresh detail content
  });

  // Close modals on backdrop click
  formModal.addEventListener('click', (e) => { if (e.target === formModal) hideForm(); });
  detailModal.addEventListener('click', (e) => { if (e.target === detailModal) hideDetail(); });

  // Backup
  exportBtn.addEventListener('click', exportBackup);
  importInput.addEventListener('change', importBackup);

  // Theme
  themeToggle.addEventListener('click', toggleTheme);
}

// Form helpers
function openForm(a = null) {
  formTitle.textContent = a ? 'Editar anime' : 'Novo anime';
  animeId.value = a?.id || '';
  titleInput.value = a?.title || '';
  statusInput.value = a?.status || 'Assistindo';
  episodesInput.value = a?.episodes ?? '';
  scoreInput.value = a?.score ?? '';
  genresInput.value = (a?.genres || []).join(', ');
  tagsInput.value = (a?.tags || []).join(', ');
  synopsisInput.value = a?.synopsis || '';
  coverPreview.src = a?.cover || '';
  favoriteInput.checked = !!a?.favorite;
  coverDropzone.classList.toggle('has-image', !!a?.cover);

  formModal.classList.remove('hidden');
  formModal.setAttribute('aria-hidden', 'false');
}
function hideForm() {
  formModal.classList.add('hidden');
  formModal.setAttribute('aria-hidden', 'true');
  animeForm.reset();
  coverPreview.src = '';
  coverDropzone.classList.remove('has-image');
}

// Details
function openDetail(id) {
  const a = animes.find(x => x.id === id);
  if (!a) return;
  currentDetailId = id;

  detailTitle.textContent = a.title;
  detailTitleText.textContent = a.title;
  detailStatus.textContent = a.status;
  detailEpisodes.textContent = a.episodes ?? '-';
  detailScore.textContent = a.score ?? '-';
  detailGenres.innerHTML = (a.genres || []).map(g => `<span class="chip">${escapeHtml(g)}</span>`).join('') || '<span class="chip">—</span>';
  detailTags.innerHTML = (a.tags || []).map(t => `<span class="chip">${escapeHtml(t)}</span>`).join('') || '<span class="chip">—</span>';
  detailSynopsis.textContent = a.synopsis || '—';
  detailCover.src = a.cover || '';

  toggleFavoriteBtn.textContent = a.favorite ? '⭐ Favorito' : '☆ Favorito';

  detailModal.classList.remove('hidden');
  detailModal.setAttribute('aria-hidden', 'false');
}
function hideDetail() {
  detailModal.classList.add('hidden');
  detailModal.setAttribute('aria-hidden', 'true');
  currentDetailId = null;
}

// Backup
function exportBackup() {
  const data = JSON.stringify(animes, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const date = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
  a.download = `crunchlist-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function importBackup(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error('Formato inválido.');
    animes = data.map(sanitizeRecord);
    save();
    render();
    alert('Backup importado com sucesso!');
  } catch (err) {
    alert('Falha ao importar: ' + err.message);
  } finally {
    importInput.value = '';
  }
}

function sanitizeRecord(a) {
  return {
    id: a.id || cryptoRandomId(),
    title: String(a.title || '').trim(),
    status: a.status || 'Assistindo',
    episodes: Number.isFinite(a.episodes) ? a.episodes : null,
    score: Number.isFinite(a.score) ? a.score : null,
    genres: Array.isArray(a.genres) ? a.genres : parseList(a.genres),
    tags: Array.isArray(a.tags) ? a.tags : parseList(a.tags),
    synopsis: String(a.synopsis || ''),
    cover: typeof a.cover === 'string' ? a.cover : '',
    favorite: !!a.favorite,
    createdAt: a.createdAt || Date.now(),
    updatedAt: Date.now()
  };
}

// Image helpers
async function setCoverFile(file) {
  if (!file.type.startsWith('image/')) return alert('Selecione uma imagem.');
  const dataUrl = await fileToDataUrl(file);
  coverPreview.src = dataUrl;
  coverDropzone.classList.add('has-image');
}

// Utils
function cryptoRandomId() {
  return 'a_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
}
function parseIntSafe(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}
function parseFloatSafe(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}
function parseList(v) {
  if (!v) return [];
  return String(v).split(',').map(s => s.trim()).filter(Boolean);
}
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
