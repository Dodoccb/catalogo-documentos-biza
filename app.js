// ================== Config ==================
const DATA_URL = '/api/documentos';
const FAVORITES_KEY = 'biza_docs_favorites';
const EXPIRY_WINDOW_DAYS = 25; // "A vencer" quando faltarem <= 25 dias

// ================== DOM ==================
const $ = (id) => document.getElementById(id);
const grid = $('grid');
const selArea = $('filterArea');
const selTipo = $('filterTipo');
const search = $('search');
const onlyValid = $('onlyValid');
const onlyExpired = $('onlyExpired');
const total = $('total');
const btnFavoritos = $('btnFavoritos');
const viewer = $('viewer');
const viewerFrame = $('viewerFrame');
const viewerTitle = $('viewerTitle');
const closeViewer = $('closeViewer');

let ALL = [];
let showOnlyFavs = false;

const getFavs = () => new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'));
const saveFavs = (set) => localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(set)));

// ================== Helpers ==================
function pick(obj, keys, def = null) {
  for (const k of keys) {
    if (obj && obj[k] != null && obj[k] !== '') return obj[k];
    const kk = Object.keys(obj || {}).find(x => x.toLowerCase() === String(k).toLowerCase());
    if (kk) return obj[kk];
  }
  return def;
}

function firstArrayLike(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.data)) return raw.data;
  if (raw && Array.isArray(raw.documentos)) return raw.documentos;
  if (raw && Array.isArray(raw.results)) return raw.results;
  if (raw && Array.isArray(raw.items)) return raw.items;
  if (raw && raw.data && Array.isArray(raw.data.items)) return raw.data.items;
  return [];
}

function guessExtFromUrl(u) {
  if (!u) return '';
  try {
    const p = new URL(u).pathname.split('?')[0].split('#')[0];
    const ext = p.includes('.') ? p.split('.').pop().toLowerCase() : '';
    return (ext && ext.length <= 5) ? ext : '';
  } catch {
    const p = u.split('?')[0].split('#')[0];
    const ext = p.includes('.') ? p.split('.').pop().toLowerCase() : '';
    return (ext && ext.length <= 5) ? ext : '';
  }
}

function deriveCodeFromName(name) {
  if (!name) return null;
  const m = String(name).trim().match(/^([A-Z0-9._-]+)(\s|$)/i);
  return m ? m[1] : null;
}

// ====== Derivar Tipo ======
function deriveTipo(rawTipo, nome, codigo) {
  let t = (rawTipo || '').trim();
  const c = (codigo || '').toUpperCase();
  const n = (nome || '').toLowerCase();

  if (!t || t.toLowerCase() === 'documento') {
    if (c.startsWith('FOR.')) t = 'Formulário';
    else if (c.startsWith('IT.')) t = 'Instrução de Trabalho';
    else if (c.startsWith('PRO.')) t = 'Procedimento';
    else if (c.startsWith('MP.')) t = 'Mapa de Processo';
    else if (c.startsWith('DOC.')) t = 'Documento';
    else if (c.startsWith('REG.')) t = 'Registro';
  }

  if (!t || t.toLowerCase() === 'documento') {
    if (n.includes('formul')) t = 'Formulário';
    else if (n.includes('instru')) t = 'Instrução de Trabalho';
    else if (n.includes('proced')) t = 'Procedimento';
    else if (n.includes('mapa de processo')) t = 'Mapa de Processo';
  }

  return t || 'Documento';
}

function normalizeAreaTipo(rawArea, rawTipo, nome, codigo) {
  let area = rawArea || null;
  if (!area || String(area).trim() === '') area = 'Geral';
  const tipo = deriveTipo(rawTipo, nome, codigo);
  return { area, tipo };
}

// ================== Datas / Status ==================
function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const s = String(value).trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/;
  const br  = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  let y, m, d;
  if (iso.test(s)) { const m1 = s.match(iso); y = +m1[1]; m = +m1[2]-1; d = +m1[3]; }
  else if (br.test(s)) { const m2 = s.match(br); d = +m2[1]; m = +m2[2]-1; y = +m2[3]; }
  else { const n = new Date(s); if (!isNaN(n)) return n; return null; }
  const dt = new Date(y, m, d, 23, 59, 59);
  return isNaN(dt) ? null : dt;
}

function daysBetween(a, b) {
  const MS = 24 * 60 * 60 * 1000;
  return Math.floor((a - b) / MS);
}

function computeStatusLabel(doc) {
  const dt = toDate(doc.validade);
  if (dt) {
    const hoje = new Date();
    if (dt < hoje) return 'Vencido';
    const dias = daysBetween(dt, hoje);
    if (dias <= EXPIRY_WINDOW_DAYS) return 'A vencer';
    return 'Válido';
  }
  const sraw = String(doc.status || '').toLowerCase();
  if (sraw.includes('publicad')) return 'Válido';
  if (sraw.includes('vencid') || sraw.includes('expir') || sraw.includes('obsole')) return 'Vencido';
  if (sraw.includes('válid')) return 'Válido';
  if (sraw.includes('rascun')) return 'Rascunho';
  return doc.status || '—';
}

function statusCssClass(label) {
  const k = (label || '').toLowerCase();
  if (k.includes('vencid')) return 'vencido';
  if (k.includes('a vencer')) return 'avencer';
  if (k.includes('válid')) return 'valido';
  if (k.includes('rascun')) return 'rascunho';
  if (k.includes('obsole')) return 'obsoleto';
  return '';
}

function isExpired(doc) {
  return /vencid/i.test(computeStatusLabel(doc));
}

function fmtBR(s) {
  const d = toDate(s);
  if (!d) return s || '—';
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
}

// ================== UI ==================
function humanExt(ext) {
  if (!ext) return '—';
  const map = { pdf:'PDF', doc:'Word', docx:'Word', xls:'Excel', xlsx:'Excel', ppt:'PowerPoint', pptx:'PowerPoint' };
  return map[ext.toLowerCase()] || ext.toUpperCase();
}

function buildFilters(data) {
  const areas = Array.from(new Set(data.map(d => d.area))).sort();
  const tipos = Array.from(new Set(data.map(d => d.tipo))).sort();
  selArea.innerHTML = '<option value="">Todas as áreas</option>' + areas.map(a => `<option>${a}</option>`).join('');
  selTipo.innerHTML = '<option value="">Todos os tipos</option>' + tipos.map(t => `<option>${t}</option>`).join('');
}

function cardHTML(d, isFav) {
  const label = computeStatusLabel(d);
  const stClass = statusCssClass(label);
  const favIcon = isFav ? '★' : '☆';
  const ext = humanExt(d.extensao);
  const openURL = encodeURIComponent(d.urlViewer || d.url || '#');

  return `
    <article class="card" data-open="${openURL}" data-title="${encodeURIComponent(d.nome)}" data-ext="${(d.extensao || '').toLowerCase()}" tabindex="0">
      <h3 title="${d.nome}">${d.nome}</h3>
      <div class="meta">
        <span class="tag area">${d.area || '—'}</span>
        <span class="tag tipo">${d.tipo || '—'}</span>
        <span class="tag">Versão ${d.versao || '—'}</span>
        <span class="tag">${ext}</span>
      </div>
      <div class="row" style="font-size:14px; color:var(--muted)">
        <span><b>Código:</b> ${d.codigo || '—'}</span>
        ${d.publicacao ? `<span style="margin-left:12px;"><b>Publicação:</b> ${fmtBR(d.publicacao)}</span>` : ''}
        ${d.validade   ? `<span style="margin-left:12px;"><b>Validade:</b> ${fmtBR(d.validade)}</span>` : ''}
        <span class="spacer"></span>
        <span class="status ${stClass}">${label}</span>
      </div>
      <div class="row actions">
        <button class="btn-ghost" data-fav="${d.id}" aria-label="Favoritar">${favIcon} Favoritar</button>
      </div>
    </article>`;
}

function render() {
  const favs = getFavs();
  const q = (search.value || '').trim().toLowerCase();
  const fArea = selArea.value || '';
  const fTipo = selTipo.value || '';

  let list = ALL.filter(d => {
    if (showOnlyFavs && !favs.has(d.id)) return false;
    if (onlyValid.checked && computeStatusLabel(d) !== 'Válido') return false;
    if (onlyExpired.checked && !isExpired(d)) return false;
    if (fArea && d.area !== fArea) return false;
    if (fTipo && d.tipo !== fTipo) return false;
    if (q) {
      const hay = `${d.nome} ${d.codigo || ''} ${d.area || ''} ${d.tipo || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  total.textContent = `Total: ${list.length}`;
  grid.innerHTML = list.map(d => cardHTML(d, favs.has(d.id))).join('');

  grid.querySelectorAll('[data-fav]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = el.getAttribute('data-fav');
      const set = getFavs();
      set.has(id) ? set.delete(id) : set.add(id);
      saveFavs(set);
      render();
    });
  });

  grid.querySelectorAll('[data-open]').forEach(card => {
    card.addEventListener('click', () => {
      const url = decodeURIComponent(card.getAttribute('data-open'));
      const title = decodeURIComponent(card.getAttribute('data-title'));
      const ext = (card.getAttribute('data-ext') || '').toLowerCase();
      openInViewer(url, title, ext);
    });
  });
}

function openInViewer(url, title, ext) {
  let viewURL = url;
  const isSigoViewer = url.includes('/viewer') || url.includes('/visualizar');
  if (!isSigoViewer) {
    if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) {
      viewURL = 'https://view.officeapps.live.com/op/view.aspx?src=' + encodeURIComponent(url);
    }
  }
  viewerTitle.textContent = title || 'Visualizador';
  viewerFrame.src = viewURL;
  viewer.classList.add('open');
}

closeViewer.addEventListener('click', () => {
  viewer.classList.remove('open');
  viewerFrame.src = '';
});

[search, selArea, selTipo, onlyValid, onlyExpired].forEach(el => el.addEventListener('input', render));
btnFavoritos.addEventListener('click', () => {
  showOnlyFavs = !showOnlyFavs;
  btnFavoritos.textContent = showOnlyFavs ? 'Todos' : 'Favoritos';
  render();
});

// ================== Boot ==================
async function boot() {
  if (search) search.value = ''; // começa em branco
  try {
    const res = await fetch(DATA_URL, { method: 'GET', headers: { 'X-Requested-With': 'XMLHttpRequest' } });
    if (!res.ok) {
      console.error('Falha ao buscar documentos. HTTP', res.status, res.statusText);
      total.textContent = 'Total: 0';
      grid.innerHTML = `<div style="opacity:.7;padding:12px">Erro ${res.status} ao consultar a API.</div>`;
      return;
    }
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    const raw = ct.includes('application/json') ? await res.json() : JSON.parse(await res.text());
    const arr = firstArrayLike(raw);

    console.log('[API] tamanho:', arr.length);
    if (arr[0]) console.log('[API] chaves do primeiro item:', Object.keys(arr[0]));

    ALL = arr.map(adaptSigoRecord).filter(x => x && x.nome);
    buildFilters(ALL);
    render();

    if (!ALL.length) {
      grid.innerHTML = `<div style="opacity:.7;padding:12px">Nenhum documento retornado (verifique mapeamento de campos).</div>`;
    }
  } catch (e) {
    console.error('Erro carregando documentos:', e);
    grid.innerHTML = `<div style="opacity:.7;padding:12px">Erro inesperado ao consultar a API.</div>`;
  }
}

// ================== Adaptador SIGO ==================
function adaptSigoRecord(raw) {
  const nome   = pick(raw, ['nome','Nome','titulo','Titulo','descricao','Descricao']);
  let codigo   = pick(raw, ['codigo','Codigo','cod','Cod','code','Code','identificacao','Identificacao','numero','Numero','nro','Nro']);

  const brutoStatus = pick(raw, ['status','Status','situacao','Situacao','situacaoAtual','SituacaoAtual','publicacao','Publicacao']);
  const versao = pick(raw, ['versao','Versao','revisao','Revisao','rev','Rev','versaoAtual','VersaoAtual']) || '-';

  const validade = pick(raw, [
    'validade','Validade','vencimento','Vencimento',
    'expiraEm','ExpiraEm','dataVencimento','DataVencimento',
    'dataValidade','DataValidade','data_validade'
  ]);

  const publicacao = pick(raw, ['publicacao','Publicacao','ultima_publicacao','ultimaPublicacao','UltimaPublicacao']);
  const criacao    = pick(raw, ['criacao','Criacao','dataCriacao','DataCriacao']);

  const rawArea = pick(raw, ['area','Area','setor','Setor','departamento','Departamento','unidade','Unidade','macroprocesso','Macroprocesso','processo','Processo']);
  const rawTipo = pick(raw, ['tipo','Tipo','tipoDocumento','TipoDocumento','classificacao','Classificacao','classe','Classe','categoria','Categoria']);

  if (!codigo) codigo = deriveCodeFromName(nome);
  const { area, tipo } = normalizeAreaTipo(rawArea, rawTipo, nome, codigo);

  const urlViewer = pick(raw, ['urlViewer','UrlViewer','viewer','Viewer','visualizar','Visualizar']);
  const url       = pick(raw, ['url','Url','link','Link','arquivoUrl','ArquivoUrl','caminho','Caminho']) || '#';

  let extensao = String(pick(raw, ['extensao','Extensao','ext','Ext']) || '').toLowerCase();
  if (!extensao) extensao = guessExtFromUrl(urlViewer || url);

  return {
    id: pick(raw, ['id','ID','Id']) || crypto.randomUUID(),
    nome,
    codigo,
    tipo,
    area,
    status: brutoStatus,
    versao,
    validade,
    publicacao,
    criacao,
    favorito: !!pick(raw, ['favorito','Favorito']),
    urlViewer: urlViewer || null,
    url,
    urlHistorico: pick(raw, ['urlHistorico','UrlHistorico','historico','Historico']) || null,
    extensao
  };
}

boot();
