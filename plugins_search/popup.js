const RESULTS_EL = document.getElementById('results');
const SAVED_EL = document.getElementById('savedList');
const QUERY_INPUT = document.getElementById('query');
const SEARCH_BTN = document.getElementById('searchBtn');
const TOGGLE_SETTINGS = document.getElementById('toggleSettings');
const SETTINGS_DIV = document.getElementById('settings');
const GKEY_INPUT = document.getElementById('gKey');
const GCX_INPUT = document.getElementById('gCx');
const SAVE_SETTINGS_BTN = document.getElementById('saveSettings');
const CLEAR_SETTINGS_BTN = document.getElementById('clearSettings');
const CURRENT_TITLE = document.getElementById('currentTitle');
const CURRENT_URL = document.getElementById('currentUrl');
const SAVE_CURRENT_BTN = document.getElementById('saveCurrent');
const PREVIEW_CONTAINER = document.getElementById('previewContainer');
const PREVIEW_FRAME = document.getElementById('previewFrame');
const PREVIEW_URL = document.getElementById('previewUrl');
const CLOSE_PREVIEW = document.getElementById('closePreview');
const OPEN_PREVIEW_TAB = document.getElementById('openPreviewTab');
let PREVIEW_OPEN_TITLE = '';

const STORAGE_KEY = 'saved_items_v1';
const CONFIG_KEY = 'local_config_v1';

function normalizeUrl(raw){
  try{
    const u = new URL(raw);
    u.hash = '';
    const params = new URLSearchParams(u.search);
    const removeKeys = [];
    for(const k of params.keys()){
      if (/^(utm_|fbclid$|gclid$|mc_eid$|mc_cid$|msclkid$)/i.test(k)) removeKeys.push(k);
    }
    removeKeys.forEach(k=>params.delete(k));
    const sorted = new URLSearchParams([...params.entries()].sort((a,b)=> a[0].localeCompare(b[0])));
    u.search = sorted.toString();
    u.hostname = u.hostname.toLowerCase();
    if ((u.protocol === 'http:' && u.port === '80') || (u.protocol === 'https:' && u.port === '443')) u.port = '';
    if (u.pathname.endsWith('/') && u.pathname !== '/') u.pathname = u.pathname.replace(/\/+$/,'');
    return u.toString();
  }catch(e){
    return raw;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadSaved();
  loadConfig();
  showLastOpenedTab();
});

SEARCH_BTN.addEventListener('click', () => doSearch());
QUERY_INPUT.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });

let _searchDebounceTimer = null;
const DEBOUNCE_MS = 400;

QUERY_INPUT.addEventListener('input', (e) => {
  const q = QUERY_INPUT.value.trim();
  if (!q) {
    RESULTS_EL.innerHTML = '';
    if (_searchDebounceTimer) { clearTimeout(_searchDebounceTimer); _searchDebounceTimer = null; }
    return;
  }

  RESULTS_EL.innerHTML = '<div class="small">Searching...</div>';

  if (_searchDebounceTimer) clearTimeout(_searchDebounceTimer);
  _searchDebounceTimer = setTimeout(() => {
    doSearch();
    _searchDebounceTimer = null;
  }, DEBOUNCE_MS);
});

TOGGLE_SETTINGS.addEventListener('click', ()=>{
  SETTINGS_DIV.style.display = SETTINGS_DIV.style.display === 'none' ? 'block' : 'none';
});

SAVE_SETTINGS_BTN.addEventListener('click', async ()=>{
  const key = GKEY_INPUT.value.trim();
  const cx = GCX_INPUT.value.trim();
  await chrome.storage.local.set({ [CONFIG_KEY]: { googleKey: key || null, googleCx: cx || null }});
  alert('Settings saved locally!');
});

CLEAR_SETTINGS_BTN.addEventListener('click', async ()=>{
  await chrome.storage.local.remove(CONFIG_KEY);
  GKEY_INPUT.value = '';
  GCX_INPUT.value = '';
  alert('Settings cleared.');
});

async function showLastOpenedTab(){
  const res = await chrome.storage.local.get('last_opened_tab');
  const last = res.last_opened_tab;
  if(last && last.url){
    CURRENT_TITLE.textContent = last.title || 'Untitled';
    CURRENT_URL.textContent = last.url;
    SAVE_CURRENT_BTN.onclick = ()=> addSaved({ title: last.title || last.url, url: last.url });
  } else {
    CURRENT_TITLE.textContent = 'No active tab';
    CURRENT_URL.textContent = '';
  }
}


async function doSearch(){
  const q = QUERY_INPUT.value.trim();
  if(!q) return;
  RESULTS_EL.innerHTML = '<div class="small">Searching...</div>';

  const cfg = (await chrome.storage.local.get(CONFIG_KEY))[CONFIG_KEY] || {};
  // const googleKey = cfg.googleKey;
  // const googleCx = cfg.googleCx;


   const googleKey = "AIzaSyDJwNa1dfN_xbLVySIuhVces8JqBBl3dXU";
  const googleCx = "a10d71a25954a4347";

  try {
    let data;
    if(googleKey && googleCx){
      data = await doGoogleSearch(q, googleKey, googleCx);
      renderGoogleResults(data, q);
    } else {
      data = await doDuckSearch(q);
      renderDuckResults(data, q);
    }
  } catch(err){
    console.error(err);
    RESULTS_EL.innerHTML = `<div class="small">Search failed: ${err.message}</div>`;
  }
}

// DuckDuckGo fallback
async function doDuckSearch(query){
  const url = 'https://api.duckduckgo.com/?q='+encodeURIComponent(query)+'&format=json&no_redirect=1&skip_disambig=1';
  const r = await fetch(url);
  if(!r.ok) throw new Error('DuckDuckGo error');
  return await r.json();
}

// Google Custom Search API
async function doGoogleSearch(query, apiKey, cx){
  const url = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(apiKey)}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(query)}`;
  const r = await fetch(url);
  if(!r.ok) throw new Error('Google API error');
  return await r.json();
}

function renderGoogleResults(data){
  RESULTS_EL.innerHTML = '';
  const items = data.items || [];
  if(items.length === 0){
    RESULTS_EL.innerHTML = '<div class="small">No results found</div>';
    return;
  }
  items.forEach(it=>{
    RESULTS_EL.appendChild(createResultEl(it.title, it.snippet, it.link));
  });
}

function renderDuckResults(data, q){
  RESULTS_EL.innerHTML = '';
  if(data.Abstract && data.AbstractURL){
    RESULTS_EL.appendChild(createResultEl(data.Heading || q, data.Abstract, data.AbstractURL));
  }
  if(Array.isArray(data.RelatedTopics)){
    data.RelatedTopics.forEach(t=>{
      if(t.Text && t.FirstURL) RESULTS_EL.appendChild(createResultEl(t.Text,'',t.FirstURL));
    });
  }
}


function createResultEl(title, snippet, url){
  const wrap = document.createElement('div');
  wrap.className = 'result';
  const meta = document.createElement('div');
  meta.className = 'meta';
  const a = document.createElement('a');
  a.href = url; a.textContent = title; a.target = '_blank';

  a.addEventListener('click', (e)=>{
    e.preventDefault();

    openInPreview(url, title, snippet, true);
  });
  const small = document.createElement('div');
  small.className = 'small'; small.textContent = url;
  meta.appendChild(a);
  if(snippet){
    const sn = document.createElement('div');
    sn.className = 'small'; sn.textContent = snippet;
    meta.appendChild(sn);
  }
  meta.appendChild(small);

  const actions = document.createElement('div');
  actions.className = 'actions';
  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn small';
  saveBtn.textContent = 'Save';
  saveBtn.onclick = ()=> addSaved({ title, url, snippet });
  actions.appendChild(saveBtn);
  wrap.appendChild(meta); wrap.appendChild(actions);
  return wrap;
}

function openInPreview(url, title = '', snippet = '', autoSave = false){
  if(!url) return;
  PREVIEW_URL.textContent = url;
  PREVIEW_FRAME.src = url;
  PREVIEW_CONTAINER.style.display = 'block';
  PREVIEW_OPEN_TITLE = title || '';

 
  if(autoSave){
    addSaved({ title: title || url, url, snippet });
  }

  QUERY_INPUT.value = '';
  RESULTS_EL.innerHTML = '';
  if (_searchDebounceTimer) { clearTimeout(_searchDebounceTimer); _searchDebounceTimer = null; }
}

if(CLOSE_PREVIEW) CLOSE_PREVIEW.onclick = ()=>{
  PREVIEW_FRAME.src = 'about:blank';
  PREVIEW_CONTAINER.style.display = 'none';
  PREVIEW_URL.textContent = '';
};
if(OPEN_PREVIEW_TAB) OPEN_PREVIEW_TAB.onclick = ()=>{
  const u = PREVIEW_URL.textContent;
  if(u) chrome.tabs.create({ url: u });
  QUERY_INPUT.value = '';
  RESULTS_EL.innerHTML = '';
  if (_searchDebounceTimer) { clearTimeout(_searchDebounceTimer); _searchDebounceTimer = null; }
};

async function loadSaved(){
  const res = await chrome.storage.local.get(STORAGE_KEY);
  renderSaved(res[STORAGE_KEY] || []);
}

function renderSaved(items){
  SAVED_EL.innerHTML = '';
  if(items.length === 0){ SAVED_EL.innerHTML = '<div class="small">No saved items</div>'; return; }
  items.forEach((it, idx)=>{
    const wrap = document.createElement('div');
    wrap.className = 'saved-item';
    const meta = document.createElement('div'); meta.className='meta';
    const t = document.createElement('input'); t.className='editable'; t.value=it.title;
    const u = document.createElement('input'); u.className='editable'; u.value=it.url;
    meta.appendChild(t); meta.appendChild(u);
    const actions = document.createElement('div'); actions.className='actions';
    const openB=document.createElement('button'); openB.className='btn small'; openB.textContent='Open';
    openB.onclick=()=>openInPreview(it.url, it.title, it.snippet || '', false);
    const delB=document.createElement('button'); delB.className='btn small'; delB.textContent='Delete';
    delB.onclick=()=>deleteSaved(idx);
    actions.appendChild(openB); actions.appendChild(delB);
    wrap.appendChild(meta); wrap.appendChild(actions);
    SAVED_EL.appendChild(wrap);
  });
}

async function addSaved(item){
  const res = await chrome.storage.local.get(STORAGE_KEY);
  const items = res[STORAGE_KEY] || [];
  try {
    if (!item.title || item.title === item.url) {
      const parsed = new URL(item.url);
      const host = parsed.hostname.replace(/^www\./, '');
      const parts = parsed.pathname.split('/').filter(Boolean);
      const last = parts.length ? decodeURIComponent(parts[parts.length - 1]) : '';
      item.title = last ? `${host} — ${last}` : host;
    }
  } catch (e) {
    if (!item.title) item.title = item.url;}

  const normalized = normalizeUrl(item.url || '');
  item.normalizedUrl = normalized;
  const exists = items.find(i => i.normalizedUrl === normalized || i.url === item.url);
  if (exists) return;
  items.unshift(item);
  await chrome.storage.local.set({ [STORAGE_KEY]: items });
  loadSaved();
}

async function updateSaved(idx, title, url){
  const res = await chrome.storage.local.get(STORAGE_KEY);
  const items = res[STORAGE_KEY] || [];
  if(!items[idx]) return;
  items[idx].title=title; items[idx].url=url;
  try{ items[idx].normalizedUrl = normalizeUrl(url); }catch(e){}
  await chrome.storage.local.set({ [STORAGE_KEY]: items });
  loadSaved();
}

async function deleteSaved(idx){
  const res = await chrome.storage.local.get(STORAGE_KEY);
  let items=res[STORAGE_KEY]||[];
  items.splice(idx,1);
  await chrome.storage.local.set({ [STORAGE_KEY]: items });
  loadSaved();
}

async function loadConfig(){
  const c=(await chrome.storage.local.get(CONFIG_KEY))[CONFIG_KEY]||{};
  if(c.googleKey) GKEY_INPUT.value=c.googleKey;
  if(c.googleCx) GCX_INPUT.value=c.googleCx;
}