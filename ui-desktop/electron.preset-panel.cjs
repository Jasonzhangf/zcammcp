function buildPresetPanelHtml() {
  return `<!doctype html><html><head><meta charset="UTF-8"><style>
    html,body{margin:0;padding:0;height:100%;overflow:hidden;background:rgba(18,18,18,.98);color:#f5f5f5;font:12px Arial}
    .wrap{height:100vh;box-sizing:border-box;display:flex;flex-direction:column;border:1px solid #2f2f2f;border-radius:8px;overflow:hidden}
    .head{display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid #2a2a2a}
    .title{font-weight:600}
    .dot{width:8px;height:8px;border-radius:50%;background:#666}
    .dot.on{background:#52c41a;box-shadow:0 0 4px rgba(82,196,26,.5)}
    .close{margin-left:auto;width:18px;height:18px;border:1px solid #3a3a3a;border-radius:4px;background:#1f1f1f;color:#cfcfcf;cursor:pointer}
    .list{padding:8px 6px 6px;overflow-y:auto;overflow-x:hidden;display:flex;flex-direction:column;gap:6px;flex:1}
    .list::-webkit-scrollbar{width:6px}
    .list::-webkit-scrollbar-thumb{background:#3a3a3a;border-radius:999px}
    .list::-webkit-scrollbar-track{background:transparent}
    .item{position:relative;display:flex;flex-direction:column;gap:2px;padding:5px 4px 2px;border-radius:6px;background:#1a1a1a;border:1px solid #2a2a2a;cursor:pointer;height:auto;min-height:68px}
    .item.active{background:#262626;border-color:#ff7a45;box-shadow:0 0 0 1px rgba(255,122,69,.3)}
    .thumb{width:calc(100% + 2px);margin-left:-1px;aspect-ratio:16/9;border-radius:4px;border:1px solid #333;background:#202020 center/cover no-repeat;overflow:hidden}
    .thumb img{width:100%;height:100%;object-fit:cover;display:block}
    .thumb.fallback{display:flex;align-items:center;justify-content:center;color:#8a8a8a;font-size:10px}
    .name{font-size:9px;font-weight:600;line-height:1;color:#9eb2bf;letter-spacing:.15px;padding:0 1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .ctrls{position:absolute;top:8px;right:8px;display:flex;align-items:center;gap:4px}
    .ctrl{width:18px;height:18px;border-radius:4px;border:1px solid #3a3a3a;background:#1f1f1f;color:#d9d9d9;display:flex;align-items:center;justify-content:center;font-size:10px;cursor:pointer}
    .ctrl:hover{border-color:#ff7a45;color:#fff}
    .menu-btn{width:100%;height:22px;border:0;border-bottom:1px solid #2b2b2b;background:transparent;color:#d3d3d3;font-size:10px;text-align:left;padding:0 8px;cursor:pointer}
    .menu-btn:last-child{border-bottom:0}
    .menu-btn:hover{background:#242424;color:#fff}
    .menu-btn:disabled{color:#6d6d6d;cursor:default;background:transparent}
    .menu-btn-arrow{display:flex;align-items:center;justify-content:space-between}
    .overlay-menu{position:fixed;display:none;min-width:84px;border:1px solid #3a3a3a;border-radius:4px;background:#171717;box-shadow:0 6px 14px rgba(0,0,0,.45);z-index:9999}
    .overlay-menu.show{display:block}
    .bottom{border-top:1px solid #2a2a2a;background:rgba(20,20,20,.98);padding:6px 6px 7px;display:flex;flex-direction:column;gap:6px}
    .pages{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));grid-auto-rows:18px;gap:4px;align-items:center}
    .page{width:100%;height:18px;border-radius:3px;border:1px solid #333;background:#1d1d1d;color:#a0a0a0;font-size:9px;display:flex;align-items:center;justify-content:center;cursor:pointer}
    .page.active{border-color:#ff7a45;color:#fff;background:#2a2a2a}
    .ops{display:flex;gap:4px;align-items:stretch;justify-content:space-between}
    .op{height:28px;min-width:0;flex:1;border-radius:4px;border:1px solid #3a3a3a;background:#1f1f1f;color:#d9d9d9;font-size:14px;display:flex;align-items:center;justify-content:center;padding:0 6px;cursor:pointer}
    .op-stop-square{height:33%;aspect-ratio:1/1;background:#ffffff;border-radius:999px;display:block}
    .op:hover{border-color:#ff7a45;color:#fff}
    .op:disabled{color:#6d6d6d;border-color:#2f2f2f;cursor:default}
  </style></head><body><div class="wrap"><div class="head"><span class="title">Presets</span><span id="statusDot" class="dot"></span><button id="closeBtn" class="close">×</button></div><div id="list" class="list"></div><div class="bottom"><div id="pages" class="pages"></div><div class="ops"><button id="opAdd" class="op" title="Add">+</button><button id="opLoad" class="op" title="Load">▶</button><button id="opStop" class="op" title="Stop"><span class="op-stop-square"></span></button><button id="opDelete" class="op" title="Delete">🗑</button></div></div></div>
  <script>
    const { ipcRenderer } = require('electron');
    let state = { presets: [], activePresetId: null };
    let currentPage = 1;
    const pageSize = 10;
    const listEl = document.getElementById('list');
    const pagesEl = document.getElementById('pages');
    const dot = document.getElementById('statusDot');
    const opAddBtn = document.getElementById('opAdd');
    const opLoadBtn = document.getElementById('opLoad');
    const opDeleteBtn = document.getElementById('opDelete');
    document.getElementById('closeBtn').addEventListener('click', () => ipcRenderer.invoke('presetPanel:hide'));
    function getPresetById(id){
      const presets = Array.isArray(state.presets) ? state.presets : [];
      return presets.find((item) => item && item.id === id) || null;
    }
    function getCurrentPresetId(){
      if (typeof state.activePresetId === 'string' && state.activePresetId.length > 0) return state.activePresetId;
      const presets = Array.isArray(state.presets) ? state.presets : [];
      return presets[0]?.id || '';
    }
    function getCurrentPreset(){
      const id = getCurrentPresetId();
      if (!id) return null;
      return getPresetById(id);
    }
    function updateActionButtons(){
      const preset = getCurrentPreset();
      const exists = Boolean(preset && preset.exists === true);
      opLoadBtn.disabled = !exists;
      opDeleteBtn.disabled = !exists;
      opAddBtn.title = exists ? 'Replace' : 'Add';
      opLoadBtn.title = exists ? 'Load' : 'Load (empty preset)';
      opDeleteBtn.title = exists ? 'Delete' : 'Delete (empty preset)';
    }
    async function invokePresetAction(action){
      const id = getCurrentPresetId();
      if (!id) return;
      await ipcRenderer.invoke('presetPanel:selectPreset', id, action);
    }
    opAddBtn.addEventListener('click', async () => {
      const preset = getCurrentPreset();
      const id = getCurrentPresetId();
      if (!id) return;
      const exists = Boolean(preset && preset.exists === true);
      if (exists) {
        const ok = await ipcRenderer.invoke('presetPanel:confirmReplace');
        if (!ok) return;
        await ipcRenderer.invoke('presetPanel:selectPreset', id, 'replace');
        return;
      }
      await ipcRenderer.invoke('presetPanel:selectPreset', id, 'add');
    });
    opLoadBtn.addEventListener('click', () => invokePresetAction('load'));
    document.getElementById('opStop').addEventListener('click', () => invokePresetAction('stop'));
    opDeleteBtn.addEventListener('click', () => invokePresetAction('delete'));
    function render(){
      listEl.innerHTML = '';
      pagesEl.innerHTML = '';
      const sourcePresets = Array.isArray(state.presets) ? state.presets : [];
      const totalCount = Number.isFinite(Number(state.totalCount)) && Number(state.totalCount) > 0 ? Number(state.totalCount) : 100;
      const presets = (() => {
        const byIndex = new Map();
        sourcePresets.forEach((item, idx) => {
          if (!item) return;
          const parsed = Number.parseInt(String(item.id || '').replace(/[^\d]/g, ''), 10);
          const normalized = Number.isFinite(parsed) && parsed > 0 ? parsed : idx + 1;
          byIndex.set(normalized, item);
        });
        const expanded = [];
        for (let i = 1; i <= totalCount; i += 1) {
          const fallback = byIndex.get(i);
          const no = String(i).padStart(3, '0');
          expanded.push({
            ...(fallback || {}),
            id: 'preset-' + no,
            name: typeof fallback?.name === 'string' && fallback.name.length > 0
              ? fallback.name
              : 'Preset ' + no,
          });
        }
        return expanded;
      })();
      const active = state.activePresetId;
      dot.className = presets.length > 0 ? 'dot on' : 'dot';
      const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
      if (currentPage > pageCount) {
        currentPage = pageCount;
      }
      for (let i = 1; i <= pageCount; i += 1) {
        const page = document.createElement('div');
        page.className = 'page' + (i === currentPage ? ' active' : '');
        page.textContent = String(i);
        page.addEventListener('click', async () => {
          currentPage = i;
          await ipcRenderer.invoke('presetPanel:ensurePage', { page: currentPage });
          render();
        });
        pagesEl.appendChild(page);
      }
      const start = (currentPage - 1) * pageSize;
      const pagePresets = presets.slice(start, start + pageSize);
      if (pagePresets.length === 0) {
        const empty = document.createElement('div');
        empty.textContent = 'No presets found';
        empty.style.padding='20px'; empty.style.color='#666'; empty.style.textAlign='center';
        listEl.appendChild(empty);
        return;
      }
      pagePresets.forEach((preset, idx) => {
        if (!preset || !preset.id) return;
        const item = document.createElement('div');
        item.className = 'item' + (preset.id === active ? ' active' : '');
        const thumb = document.createElement('div');
        thumb.className = 'thumb';
        const previewUrls = Array.isArray(preset.previewUrls)
          ? preset.previewUrls.filter((u) => typeof u === 'string' && u.length > 0)
          : (typeof preset.previewUrl === 'string' && preset.previewUrl.length > 0 ? [preset.previewUrl] : []);
        if (previewUrls.length > 0) {
          const img = document.createElement('img');
          let currentSrcIndex = 0;
          let retryRound = 0;
          const maxRetryRound = 3;
          const loadCurrent = () => {
            const base = previewUrls[currentSrcIndex];
            const sep = base.includes('?') ? '&' : '?';
            img.src = retryRound > 0 ? (base + sep + '_retry=' + retryRound + '_' + Date.now()) : base;
          };
          img.alt = preset.name || preset.id;
          img.addEventListener('load', () => {
            thumb.classList.remove('fallback');
          });
          img.addEventListener('error', () => {
            currentSrcIndex += 1;
            if (currentSrcIndex >= previewUrls.length) {
              currentSrcIndex = 0;
              retryRound += 1;
            }
            if (retryRound < maxRetryRound) {
              setTimeout(loadCurrent, 120);
              return;
            }
            thumb.classList.add('fallback');
          });
          loadCurrent();
          thumb.appendChild(img);
        } else {
          thumb.classList.add('fallback');
        }
        const name = document.createElement('div');
        name.className = 'name';
        name.textContent = preset.name || preset.id;
        const ctrls = document.createElement('div');
        ctrls.className = 'ctrls';
        const btnMenu = document.createElement('button');
        btnMenu.className = 'ctrl';
        btnMenu.textContent = '⋯';
        btnMenu.title = 'More';
        btnMenu.addEventListener('click', async (ev) => {
          ev.stopPropagation();
          const rect = btnMenu.getBoundingClientRect();
          const x = Math.round(window.screenX + rect.right + 2);
          const y = Math.round(window.screenY + rect.top - 2);
          await ipcRenderer.invoke('presetPanel:openMenu', { presetId: preset.id, x, y });
        });
        ctrls.appendChild(btnMenu);
        item.appendChild(thumb); item.appendChild(name); item.appendChild(ctrls);
        item.addEventListener('click', async () => {
          await ipcRenderer.invoke('presetPanel:selectPreset', preset.id, 'select');
        });
        listEl.appendChild(item);
      });
      updateActionButtons();
    }
    ipcRenderer.on('presetPanel:data', (_e, payload) => { state = payload || { presets: [], activePresetId: null, totalCount: 100 }; render(); });
    ipcRenderer.invoke('presetPanel:getData').then(async (payload) => {
      state = payload || state;
      const activeId = typeof state.activePresetId === 'string' ? state.activePresetId : '';
      const parsed = Number.parseInt(String(activeId || '').replace(/[^\d]/g, ''), 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        currentPage = Math.floor((parsed - 1) / pageSize) + 1;
      }
      await ipcRenderer.invoke('presetPanel:ensurePage', { page: currentPage });
      render();
    });
  </script></body></html>`;
}

module.exports = {
  buildPresetPanelHtml,
};
