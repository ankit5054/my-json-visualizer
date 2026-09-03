class JsonVisualizer {
  constructor() {
    this.jsonInput = document.getElementById('jsonInput');
    this.inputToggleBtn = document.getElementById('inputToggleBtn');
    this.workspace = document.querySelector('.workspace');
    this.previewPane = document.querySelector('.preview-pane');
    this.errorBanner = document.getElementById('errorBanner');
    this.breadcrumbBar = document.getElementById('breadcrumbBar');
    this.thead = document.getElementById('tableHead');
    this.tbody = document.getElementById('tableBody');
    this.filterKey = document.getElementById('filterKey');
    this.filterChildKey = document.getElementById('filterChildKey');
    this.filterOp = document.getElementById('filterOp');
    this.filterVal = document.getElementById('filterVal');
    this.filterValInput = document.getElementById('filterValInput');
    this.filterBar = document.getElementById('filterBar');
    this.tableContainer = document.getElementById('tableContainer');
    this.tableFormattedContainer = document.getElementById('tableFormattedContainer');
    this.tableFormattedToggle = document.getElementById('tableFormattedToggle');
    this.formattedContainer = document.getElementById('formattedContainer');
    this.view = 'formatted'; // 'table' | 'tree'
    this.unquoteKeys = false;
    this.minify = false;
    this.tablePreviewOpen = false;
    this.tablePreviewData = null;
    this.tablePreviewPath = '$';

    this.rootData = null;
    this.pathStack = [];
    this.inputUpdateTimer = null;
    this.dataVersion = 0;

    this.jsonInput.value = JSON.stringify(this.createSampleData(), null, 2);

    this.jsonInput.addEventListener('input', () => {
      clearTimeout(this.inputUpdateTimer);
      this.inputUpdateTimer = setTimeout(() => this.processJSON(), 150);
    });
    this.inputToggleBtn.onclick = () => {
      this.setInputPanelCollapsed(!this.workspace.classList.contains('input-collapsed'));
    };
    if (this.tableFormattedToggle) this.tableFormattedToggle.onclick = () => {
      this.tablePreviewOpen = !this.tablePreviewOpen;
      this.syncTableFormattedPanel();
    };

    this.setInputPanelCollapsed = (isCollapsed) => {
      this.inputToggleBtn.textContent = isCollapsed ? '\u203a' : '\u2039';
      this.inputToggleBtn.title = isCollapsed ? 'Show raw JSON input' : 'Hide raw JSON input';
      this.inputToggleBtn.setAttribute('aria-label', this.inputToggleBtn.title);
      this.inputToggleBtn.setAttribute('aria-expanded', String(!isCollapsed));
      this.workspace.classList.toggle('input-collapsed', isCollapsed);
    };
    document.getElementById('clearInputBtn').onclick = () => {
      this.jsonInput.value = '';
      this.rootData = null;
      this.pathStack = [];
      this.view = 'formatted';
      this.errorBanner.style.display = 'none';

      this.formattedContainer.style.display = 'block';
      this.tableContainer.style.display = 'none';
      this.tableFormattedContainer.style.display = 'none';
      this.tableFormattedToggle.style.display = 'none';
      this.setInputPanelCollapsed(false);
      this.inputToggleBtn.style.display = 'block';
      this.filterBar.style.display = 'none';
      this.thead.innerHTML = '';
      this.tbody.innerHTML = '';
      this.breadcrumbBar.innerHTML = 'Path:';
      this.breadcrumbBar.style.visibility = 'hidden';

      const pre = this.formattedContainer.querySelector('#formattedPre');
      if (pre) pre.innerHTML = '';

      ['btnFormatted', 'btnTable'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.classList.toggle('active', id === 'btnFormatted');
      });
    };
    this.filterKey.addEventListener('change', () => {
      this.refreshFilterChildOptions();
      this.refreshFilterValueOptions();
      this.refreshFilterOperator();
      this.toggleFilterValMode();
      this.applyFilter();
    });
    this.filterChildKey.addEventListener('change', () => {
      this.refreshFilterValueOptions();
      this.refreshFilterOperator();
      this.toggleFilterValMode();
      this.applyFilter();
    });
    this.filterOp.addEventListener('change', () => { this.toggleFilterValMode(); this.applyFilter(); });
    this.filterVal.addEventListener('change', () => this.applyFilter());
    this.filterValInput.addEventListener('input', () => this.applyFilter());
    document.getElementById('filterClear').onclick = () => {
      this.filterKey.value = '';
      this.filterChildKey.value = '';
      this.filterChildKey.style.display = 'none';
      this.filterVal.innerHTML = '<option value="">— value —</option>';
      this.filterVal.value = '';
      this.filterValInput.value = '';
      this.filterValInput.style.display = 'none';
      this.filterVal.style.display = '';
      this.filterOp.style.display = 'none';
      this.filterOp.value = 'equals';
      this.filterOp.querySelectorAll('option').forEach(o => o.disabled = false);
      this.applyFilter();
    };

    const overlay = document.getElementById('modalOverlay');
    document.getElementById('aboutBtn').onclick = () => overlay.classList.add('open');
    document.getElementById('modalClose').onclick = () => overlay.classList.remove('open');
    overlay.onclick = (e) => { if (e.target === overlay) overlay.classList.remove('open'); };
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('open')) {
        overlay.classList.remove('open');
      }
    });

    document.getElementById('fmtExpandAll').onclick = () => {
      document.querySelectorAll('#formattedPre .fmt-node').forEach(node => node.classList.remove('fmt-collapsed'));
      document.querySelectorAll('#formattedPre .fmt-toggle').forEach(t => { t.textContent = '▾'; });
    };
    document.getElementById('fmtCollapseAll').onclick = () => {
      document.querySelectorAll('#formattedPre .fmt-node').forEach(node => node.classList.add('fmt-collapsed'));
      document.querySelectorAll('#formattedPre .fmt-toggle').forEach(t => { t.textContent = '▸'; });
    };
    document.getElementById('tableFmtExpandAll').onclick = () => {
      document.querySelectorAll('#tableFormattedPre .fmt-node').forEach(node => node.classList.remove('fmt-collapsed'));
      document.querySelectorAll('#tableFormattedPre .fmt-toggle').forEach(t => { t.textContent = '▾'; });
    };
    document.getElementById('tableFmtCollapseAll').onclick = () => {
      document.querySelectorAll('#tableFormattedPre .fmt-node').forEach(node => node.classList.add('fmt-collapsed'));
      document.querySelectorAll('#tableFormattedPre .fmt-toggle').forEach(t => { t.textContent = '▸'; });
    };
    document.getElementById('copyBtn').onclick = () => {
      if (!this.rootData) return;
      const formatted = this.formatJsonOutput();
      navigator.clipboard.writeText(formatted).then(() => {
        const btn = document.getElementById('copyBtn');
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1500);
      });
    };

    document.getElementById('btnFormatted').onclick = () => this.setView('formatted');
    document.getElementById('btnTable').onclick = () => this.setView('table');

    document.getElementById('unquoteKeysChk').onchange = (e) => {
      this.unquoteKeys = e.target.checked;
      if (this.view === 'formatted') this.renderFormattedView();
    };

    document.getElementById('minifyChk').onchange = (e) => {
      this.minify = e.target.checked;
      if (this.view === 'formatted') this.renderFormattedView();
    };

    this.formattedContainer.style.display = 'block';
    this.tableContainer.style.display = 'none';
    this.setInputPanelCollapsed(false);
    this.inputToggleBtn.style.display = 'block';
    document.getElementById('breadcrumbBar').style.visibility = 'hidden';

    this.processJSON();
  }

  createSampleData() {
    const categories = ['Engineering', 'Operations', 'Research', 'Support', 'Security', 'Analytics'];
    const regions = ['North America', 'Europe', 'Asia Pacific'];
    const records = [];

    categories.forEach((category, categoryIndex) => {
      const items = [];
      for (let itemIndex = 0; itemIndex < 5; itemIndex++) {
        items.push({
          id: `${categoryIndex + 1}-${itemIndex + 1}`,
          name: `${category} Service ${itemIndex + 1}`,
          status: itemIndex % 3 === 0 ? 'active' : itemIndex % 3 === 1 ? 'review' : 'paused',
          ownership: {
            team: `${category} Platform Team`,
            lead: {
              name: `Owner ${categoryIndex + 1}${itemIndex + 1}`,
              contact: {
                email: `owner${categoryIndex + 1}${itemIndex + 1}@example.com`,
                channels: ['email', 'chat', 'phone']
              }
            },
            regions: regions.map((region, regionIndex) => ({
              name: region,
              enabled: regionIndex !== itemIndex % regions.length,
              offices: [`${region} Hub`, `${region} Satellite`]
            }))
          },
          configuration: {
            version: `v${categoryIndex + 1}.${itemIndex + 2}.0`,
            limits: {
              requests: 1000 + itemIndex * 250,
              storage: { value: 25 + itemIndex * 10, unit: 'GB' },
              burst: { enabled: true, multiplier: 2 + itemIndex }
            },
            features: {
              auditLog: true,
              notifications: itemIndex % 2 === 0,
              integrations: [
                { name: 'slack', enabled: true, scopes: ['read', 'write'] },
                { name: 'webhook', enabled: itemIndex !== 2, scopes: ['publish', 'retry'] }
              ]
            }
          },
          history: Array.from({ length: 4 }, (_, historyIndex) => ({
            changedAt: `2026-0${historyIndex + 1}-1${itemIndex + 1}`,
            action: historyIndex % 2 === 0 ? 'updated' : 'reviewed',
            actor: {
              id: `actor-${categoryIndex + 1}-${historyIndex + 1}`,
              permissions: ['read', 'write', historyIndex % 2 === 0 ? 'approve' : 'comment']
            },
            changes: {
              field: historyIndex % 2 === 0 ? 'configuration' : 'ownership',
              from: historyIndex,
              to: historyIndex + 1,
              notes: ['validated', 'documented', 'escalated']
            }
          }))
        });
      }

      records.push({
        category,
        summary: {
          priority: categoryIndex % 2 === 0 ? 'high' : 'normal',
          itemCount: items.length,
          contacts: items.map(item => item.ownership.lead.contact.email)
        },
        services: items
      });
    });

    return {
      status: 'success',
      generatedAt: '2026-09-02T00:00:00Z',
      metadata: {
        source: 'sample catalog',
        pagination: { page: 1, size: records.length, total: records.length },
        filters: { statuses: ['active', 'review', 'paused'], regions }
      },
      catalog: records
    };
  }

  setView(view) {
    this.view = view;
    this.previewPane.classList.toggle('table-mode', view === 'table');
    const isTableView = view === 'table';
    this.setInputPanelCollapsed(isTableView);
    this.inputToggleBtn.style.display = 'block';
    ['btnFormatted','btnTable'].forEach(id =>
      document.getElementById(id).classList.toggle('active', id === `btn${view.charAt(0).toUpperCase()+view.slice(1)}`)
    );
    this.formattedContainer.style.display = view === 'formatted' ? 'block' : 'none';
    this.tableContainer.style.display = view === 'table' ? '' : 'none';
    this.tableFormattedToggle.style.display = view === 'table' ? 'block' : 'none';
    this.tablePreviewOpen = view === 'table';
    this.tablePreviewData = view === 'table' ? (this.pathStack[this.pathStack.length - 1]?.data ?? this.rootData) : null;
    this.tablePreviewPath = view === 'table' ? this.pathStack.map(entry => entry.label).join('') || '$' : '$';
    this.syncTableFormattedPanel();
    document.getElementById('breadcrumbBar').style.visibility = view === 'table' ? 'visible' : 'hidden';
    const currentData = this.pathStack[this.pathStack.length - 1]?.data;
    this.filterBar.style.display = view === 'table' && Array.isArray(currentData) && currentData.length > 1 ? 'flex' : 'none';
    if (view === 'formatted') this.renderFormattedView();
    if (view === 'table') {
      this.renderCurrentLevel();
    }
  }

  syncTableFormattedPanel() {
    if (!this.tableFormattedToggle || !this.tableFormattedContainer) return;
    const isCollapsed = !this.tablePreviewOpen;
    this.workspace.classList.toggle('table-formatted-collapsed', isCollapsed);
    this.tableFormattedContainer.style.display = this.tablePreviewOpen ? 'flex' : 'none';
    this.tableFormattedToggle.textContent = this.tablePreviewOpen ? '\u203a' : '\u2039';
    this.tableFormattedToggle.title = this.tablePreviewOpen ? 'Hide formatted preview' : 'Show formatted preview';
    this.tableFormattedToggle.setAttribute('aria-label', this.tableFormattedToggle.title);
    this.tableFormattedToggle.setAttribute('aria-expanded', String(this.tablePreviewOpen));
  }

  renderTableFormattedPreview() {
    const pre = document.getElementById('tableFormattedPre');
    if (!pre) return;
    if (!this.tablePreviewOpen) {
      pre.innerHTML = '';
      return;
    }

    const current = this.pathStack[this.pathStack.length - 1];
    const previewData = this.tablePreviewData ?? (current ? current.data : this.rootData);
    if (previewData === undefined || previewData === null) {
      pre.innerHTML = '';
      return;
    }

    const collapsedPaths = new Set(
      [...pre.querySelectorAll('.fmt-node.fmt-collapsed[data-fmt-path]')]
        .map(node => node.dataset.fmtPath)
    );

    const renderKey = `${this.dataVersion}:${this.view}:${this.tablePreviewPath}:${JSON.stringify([...collapsedPaths].sort())}:${this.unquoteKeys}:${this.minify}`;
    if (pre.dataset.renderKey === renderKey && pre.childNodes.length > 0) return;

    pre.innerHTML = '';
    pre.appendChild(this.buildFoldableNode(previewData, null, true, [], collapsedPaths));
    pre.dataset.renderKey = renderKey;
  }

  decodeEntities(str) {
    return str
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  }

  tokenize(str) {
    const tokens = [];
    let i = 0;
    while (i < str.length) {
      // skip whitespace
      if (/\s/.test(str[i])) { i++; continue; }
      // skip # comments
      if (str[i] === '#') { while (i < str.length && str[i] !== '\n') i++; continue; }
      // string — read until closing unescaped quote
      if (str[i] === '"') {
        let j = i + 1, val = '"';
        while (j < str.length) {
          if (str[j] === '\\') { val += str[j] + str[j+1]; j += 2; continue; }
          if (str[j] === '"') { val += '"'; j++; break; }
          val += str[j++];
        }
        tokens.push({ type: 'string', val }); i = j; continue;
      }
      // punctuation
      if ('{}[]:,'.includes(str[i])) { tokens.push({ type: str[i], val: str[i] }); i++; continue; }
      // number — only when not preceded by a word char (avoids catching - in identifiers)
      if (/[\d]/.test(str[i]) || (str[i] === '-' && /[\d]/.test(str[i+1] || ''))) {
        let j = i;
        if (str[j] === '-') j++;
        while (j < str.length && /[\d.eE+\-]/.test(str[j])) j++;
        const num = str.slice(i, j);
        if (!isNaN(num) && num !== '') { tokens.push({ type: 'number', val: num }); i = j; continue; }
      }
      // keywords and identifiers (keys)
      if (/[a-zA-Z_$]/.test(str[i])) {
        let j = i;
        while (j < str.length && /[\w$]/.test(str[j])) j++;
        const word = str.slice(i, j);
        if (word === 'true' || word === 'false' || word === 'null') {
          tokens.push({ type: 'keyword', val: word });
        } else if (word === 'None') {
          tokens.push({ type: 'keyword', val: 'null' });
        } else if (word === 'True') {
          tokens.push({ type: 'keyword', val: 'true' });
        } else if (word === 'False') {
          tokens.push({ type: 'keyword', val: 'false' });
        } else {
          tokens.push({ type: 'key', val: word });
        }
        i = j; continue;
      }
      i++; // skip unknown chars
    }
    return tokens;
  }

  parseTokens(tokens) {
    let pos = 0;
    const peek = () => tokens[pos];
    const consume = () => tokens[pos++];

    const parseValue = () => {
      const t = peek();
      if (!t) throw new Error('Unexpected end of input');
      if (t.type === '{') return parseObject();
      if (t.type === '[') return parseArray();
      if (t.type === 'string' || t.type === 'number' || t.type === 'keyword') {
        consume();
        return t.val;
      }
      throw new Error(`Unexpected token: ${t.val}`);
    };

    const parseObject = () => {
      consume(); // {
      let out = '{';
      let first = true;
      while (pos < tokens.length && peek().type !== '}') {
        // skip stray commas
        if (peek().type === ',') { consume(); continue; }
        if (!first) out += ',';
        first = false;
        const keyTok = consume();
        const key = keyTok.type === 'string' ? keyTok.val : `"${keyTok.val}"`;
        // consume optional colon
        if (peek() && peek().type === ':') consume();
        out += `${key}:${parseValue()}`;
      }
      if (peek() && peek().type === '}') consume();
      return out + '}';
    };

    const parseArray = () => {
      consume(); // [
      let out = '[';
      let first = true;
      while (pos < tokens.length && peek().type !== ']') {
        if (peek().type === ',') { consume(); continue; }
        if (!first) out += ',';
        first = false;
        out += parseValue();
      }
      if (peek() && peek().type === ']') consume();
      return out + ']';
    };

    return parseValue();
  }

  fixJSON(str) {
    str = this.decodeEntities(str);
    try {
      const tokens = this.tokenize(str);
      const raw = this.parseTokens(tokens);
      return raw;
    } catch(e) {
      // fallback: basic regex fixes
      str = str.replace(/^\s*#.*$/gm, '');
      str = str.replace(/'([^']*)'/g, '"$1"');
      str = str.replace(/([{,\[]?\s*)([a-zA-Z_$][\w$]*)\s*:/g, (m, pre, key) => `${pre}"${key}":`);
      str = str.replace(/("[^"]*"|\d+|true|false|null|\]|\})\s*\n(\s*)("[^"]*"|[a-zA-Z_$])/g, '$1,\n$2$3');
      str = str.replace(/,\s*([}\]])/g, '$1');
      return str;
    }
  }

  processJSON() {
    const rawVal = this.jsonInput.value.trim();
    if (!rawVal) {
      this.view = 'formatted';
      this.previewPane.classList.remove('table-mode');
      this.setInputPanelCollapsed(false);
      this.inputToggleBtn.style.display = 'block';
      return;
    }

    let parsed = null;
    let fixed = false;

    try {
      parsed = JSON.parse(rawVal);
    } catch {
      try {
        const corrected = this.fixJSON(rawVal);
        parsed = JSON.parse(corrected);
        fixed = true;
      } catch (err) {
        this.errorBanner.textContent = `JSON Error: ${err.message}`;
        this.errorBanner.style.display = 'block';
        return;
      }
    }

    this.errorBanner.style.display = fixed ? 'block' : 'none';
    if (fixed) {
      this.errorBanner.style.background = '#1a3a1a';
      this.errorBanner.style.color = '#7ec87e';
      this.errorBanner.textContent = '⚠ Auto-corrected JSON — trailing commas, quotes, or casing fixed';
    } else {
      this.errorBanner.style.background = '';
      this.errorBanner.style.color = '';
    }

    this.rootData = parsed;
    this.dataVersion += 1;
    this.pathStack = [{ label: '$', data: this.rootData }];
    this.renderCurrentLevel();
  }

  formatJsonOutput() {
    let json = this.minify ? JSON.stringify(this.rootData) : JSON.stringify(this.rootData, null, 2);
    if (this.unquoteKeys) {
      json = json.replace(/"([a-zA-Z_$][\w$]*)"\s*:/g, '$1:');
    }
    return json;
  }

  renderFormattedView(elementId = 'formattedPre') {
    if (!this.rootData) return;
    const pre = document.getElementById(elementId);
    if (!pre) return;
    const renderKey = `${this.dataVersion}:${this.unquoteKeys}:${this.minify}`;
    if (pre.dataset.renderKey === renderKey && pre.childNodes.length > 0) return;
    const collapsedPaths = new Set(
      [...pre.querySelectorAll('.fmt-node.fmt-collapsed[data-fmt-path]')]
        .map(node => node.dataset.fmtPath)
    );
    if (this.minify) {
      pre.innerHTML = this.syntaxHighlight(this.formatJsonOutput());
      pre.dataset.renderKey = renderKey;
      return;
    }
    pre.innerHTML = '';
    pre.appendChild(this.buildFoldableNode(this.rootData, null, true, [], collapsedPaths));
    pre.dataset.renderKey = renderKey;
  }

  buildFoldableNode(val, key, isLast, path = [], collapsedPaths = new Set()) {
    const wrap = document.createElement('span');
    wrap.className = 'fmt-node';
    wrap.dataset.fmtPath = JSON.stringify(path);
    if (collapsedPaths.has(wrap.dataset.fmtPath)) wrap.classList.add('fmt-collapsed');
    const suffix = isLast ? '' : ',';

    if (key !== null) {
      const keySpan = document.createElement('span');
      keySpan.className = 'fmt-key';
      keySpan.textContent = (this.unquoteKeys && /^[a-zA-Z_$][\w$]*$/.test(key)) ? key : '"' + key + '"';
      const colon = document.createElement('span');
      colon.className = 'fmt-punct';
      colon.textContent = ': ';
      wrap.appendChild(keySpan);
      wrap.appendChild(colon);
    }

    if (val === null) {
      const s = document.createElement('span');
      s.className = 'fmt-null';
      s.textContent = 'null' + suffix;
      wrap.appendChild(s);
      return wrap;
    }
    if (typeof val === 'boolean') {
      const s = document.createElement('span');
      s.className = 'fmt-bool';
      s.textContent = String(val) + suffix;
      wrap.appendChild(s);
      return wrap;
    }
    if (typeof val === 'number') {
      const s = document.createElement('span');
      s.className = 'fmt-number';
      s.textContent = String(val) + suffix;
      wrap.appendChild(s);
      return wrap;
    }
    if (typeof val === 'string') {
      const s = document.createElement('span');
      s.className = 'fmt-string';
      s.textContent = '"' + val.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"' + suffix;
      wrap.appendChild(s);
      return wrap;
    }

    const isArr = Array.isArray(val);
    const entries = isArr ? val : Object.entries(val);
    const count = entries.length;

    const toggleBtn = document.createElement('span');
    toggleBtn.className = 'fmt-toggle';
    const isCollapsed = collapsedPaths.has(JSON.stringify(path));
    toggleBtn.textContent = isCollapsed ? '▸' : '▾';

    const openPunct = document.createElement('span');
    openPunct.className = 'fmt-punct';
    openPunct.textContent = isArr ? '[' : '{';

    const summary = document.createElement('span');
    summary.className = 'fmt-summary';
    summary.textContent = count > 0 ? (isArr ? ` (${count} items)` : ` (${count} keys)`) : '';

    const collapsedContent = document.createElement('span');
    collapsedContent.className = 'fmt-collapsed-content';
    collapsedContent.textContent = count > 0 ? '...' : '';

    const block = document.createElement('span');
    block.className = 'fmt-block';

    if (isArr) {
      val.forEach((item, i) => {
        const line = document.createElement('div');
        line.className = 'fmt-line';
        line.appendChild(this.buildFoldableNode(item, null, i === val.length - 1, [...path, i], collapsedPaths));
        block.appendChild(line);
      });
    } else {
      entries.forEach(([k, v], i) => {
        const line = document.createElement('div');
        line.className = 'fmt-line';
        line.appendChild(this.buildFoldableNode(v, k, i === entries.length - 1, [...path, k], collapsedPaths));
        block.appendChild(line);
      });
    }

    const closePunct = document.createElement('span');
    closePunct.className = 'fmt-punct fmt-close-line';
    closePunct.textContent = isArr ? ']' : '}';

    const expandedSuffix = document.createElement('span');
    expandedSuffix.className = 'fmt-expanded-suffix';
    expandedSuffix.textContent = suffix;
    closePunct.appendChild(expandedSuffix);

    const suffixPunct = document.createElement('span');
    suffixPunct.className = 'fmt-punct fmt-suffix';
    suffixPunct.textContent = suffix;

    toggleBtn.onclick = (e) => {
      e.stopPropagation();
      const collapsed = wrap.classList.toggle('fmt-collapsed');
      toggleBtn.textContent = collapsed ? '▸' : '▾';
    };

    wrap.insertBefore(toggleBtn, wrap.firstChild);
    wrap.appendChild(openPunct);
    wrap.appendChild(collapsedContent);
    wrap.appendChild(block);
    wrap.appendChild(closePunct);
    wrap.appendChild(summary);
    wrap.appendChild(suffixPunct);
    return wrap;
  }

  syntaxHighlight(json) {
    return json
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(
        /("(\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
        match => {
          if (/^"/.test(match)) {
            return /:$/.test(match)
              ? `<span class="fmt-key">${match}</span>`
              : `<span class="fmt-string">${match}</span>`;
          }
          if (/true|false/.test(match)) return `<span class="fmt-bool">${match}</span>`;
          if (/null/.test(match)) return `<span class="fmt-null">${match}</span>`;
          return `<span class="fmt-number">${match}</span>`;
        }
      );
  }

  renderCurrentLevel() {
    this.renderBreadcrumbs();
    if (this.view === 'formatted') { this.renderFormattedView(); return; }
    this.formattedContainer.style.display = 'none';
    this.tableContainer.style.display = '';

    this.tablePreviewOpen = true;
    this.tablePreviewData = this.pathStack[this.pathStack.length - 1]?.data ?? this.rootData;
    this.tablePreviewPath = this.pathStack.map(entry => entry.label).join('') || '$';

    const current = this.pathStack[this.pathStack.length - 1];
    const targetData = current.data;

    let rows = [];
    if (Array.isArray(targetData)) {
      rows = targetData;
    } else if (typeof targetData === 'object' && targetData !== null) {
      rows = [targetData];
    } else {
      rows = [{ value: targetData }];
    }

    const headers = Array.from(new Set(rows.flatMap(r => (typeof r === 'object' && r !== null) ? Object.keys(r) : ['value'])));
    const filterableHeaders = headers.filter(header => {
      return rows.some(row => {
        const value = (typeof row === 'object' && row !== null) ? row[header] : row;
        return value !== undefined;
      });
    });

    // Populate filter key dropdown from current headers
    const prevKey = this.filterKey.value;
    const selectedKey = filterableHeaders.includes(prevKey) ? prevKey : '';
    this.filterKey.innerHTML = '<option value="">— key —</option>' +
      filterableHeaders.map(h => `<option value="${h}" ${h === selectedKey ? 'selected' : ''}>${h}</option>`).join('');
    this.filterKey.value = selectedKey;
    this.refreshFilterChildOptions();
    this.refreshFilterValueOptions();
    this.filterBar.style.display = this.view === 'table' && Array.isArray(targetData) && rows.length > 1 ? 'flex' : 'none';

    this.thead.innerHTML = `<tr><th>#</th>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;

    this.tbody.innerHTML = '';
    rows.forEach((row, rIdx) => {
      const tr = document.createElement('tr');
      let rowHtml = `<td>${rIdx}</td>`;

      headers.forEach(header => {
        const val = (typeof row === 'object' && row !== null) ? row[header] : row;
        rowHtml += `<td>${this.renderFormattedCell(val, header, rIdx, 0)}</td>`;
      });

      tr.innerHTML = rowHtml;
      tr.dataset.rowIndex = rIdx;
      this.tbody.appendChild(tr);
    });

    this.applyFilter();
    this.tablePreviewOpen = true;
    this.tablePreviewData = this.pathStack[this.pathStack.length - 1]?.data ?? this.rootData;
    this.tablePreviewPath = this.pathStack.map(entry => entry.label).join('') || '$';
    this.renderTableFormattedPreview();

    this.tbody.onclick = (e) => {
      const btn = e.target.closest('[data-key]');
      const td = e.target.closest('td');
      const tr = e.target.closest('tr');

      if (tr && !btn) {
        const rowIndex = parseInt(tr.dataset.rowIndex, 10);
        const selectedNode = Array.isArray(targetData) ? targetData[rowIndex] : targetData;
        this.tablePreviewData = selectedNode;
        this.tablePreviewPath = Array.isArray(targetData) ? `[${rowIndex}]` : '$';
        this.tablePreviewOpen = true;
        this.syncTableFormattedPanel();
        this.renderTableFormattedPreview();
        if (td) {
          const cellIndex = Array.from(tr.cells).indexOf(td);
          if (cellIndex > 0) {
            const header = headers[cellIndex - 1];
            const isParentArray = Array.isArray(targetData);
            const suffix = isParentArray ? `.[${rowIndex}].${header}` : `.${header}`;
            this.renderBreadcrumbs(suffix);
          }
        }
        return;
      }

      if (td && tr) {
        const cellIndex = Array.from(tr.cells).indexOf(td);
        if (cellIndex > 0) {
          const header = headers[cellIndex - 1];
          const rowIndex = parseInt(tr.dataset.rowIndex, 10);
          const isParentArray = Array.isArray(targetData);
          const suffix = isParentArray ? `.[${rowIndex}].${header}` : `.${header}`;
          this.renderBreadcrumbs(suffix);
        }
      }

      if (!btn) return;

      const key = btn.getAttribute('data-key');
      const rowIndex = parseInt(btn.getAttribute('data-rowindex'), 10);
      const subKey = btn.getAttribute('data-subkey');

      const isParentArray = Array.isArray(targetData);
      const rowObj = isParentArray ? targetData[rowIndex] : targetData;
      let selectedNode = rowObj[key];

      if (subKey && selectedNode && typeof selectedNode === 'object') {
        selectedNode = selectedNode[subKey];
      }

      const baseLabel = isParentArray ? `[${rowIndex}].${key}` : key;
      const pathLabel = subKey ? `${baseLabel}.${subKey}` : baseLabel;

      this.tablePreviewData = selectedNode;
      this.tablePreviewPath = pathLabel;
      this.pathStack.push({ label: pathLabel, data: selectedNode });
      this.tablePreviewOpen = true;
      this.syncTableFormattedPanel();
      this.renderCurrentLevel();
    };
  }

  refreshFilterChildOptions() {
    const key = this.filterKey.value;
    const current = this.pathStack[this.pathStack.length - 1];
    const targetData = current.data;
    const rows = Array.isArray(targetData) ? targetData : [targetData];
    const childKeys = new Set();

    rows.forEach(row => {
      const value = (typeof row === 'object' && row !== null) ? row[key] : row;
      if (value && typeof value === 'object') {
        const nestedEntries = Array.isArray(value)
          ? value.filter(item => item && typeof item === 'object' && !Array.isArray(item))
          : [value];

        nestedEntries.forEach(entry => {
          Object.keys(entry).forEach(childKey => {
            const childValue = entry[childKey];
            if (childValue === null || childValue === undefined || ['string', 'number', 'boolean'].includes(typeof childValue)) {
              childKeys.add(childKey);
            }
          });
        });
      }
    });

    if (!key || childKeys.size === 0) {
      this.filterChildKey.innerHTML = '<option value="">— child field —</option>';
      this.filterChildKey.style.display = 'none';
      this.filterChildKey.value = '';
      return;
    }

    const options = ['<option value="">— child field —</option>']
      .concat(Array.from(childKeys).map(childKey => `<option value="${childKey}">${childKey}</option>`))
      .join('');
    this.filterChildKey.innerHTML = options;
    this.filterChildKey.style.display = 'inline-block';
  }

  refreshFilterOperator() {
    const key = this.filterKey.value;
    const childKey = this.filterChildKey.style.display !== 'none' ? this.filterChildKey.value : '';
    const current = this.pathStack[this.pathStack.length - 1];
    const targetData = current.data;
    const rows = Array.isArray(targetData) ? targetData : [targetData];

    if (!key) {
      this.filterOp.style.display = 'none';
      this.filterOp.value = 'equals';
      return;
    }

    let hasNumeric = false;
    rows.forEach(row => {
      const raw = (typeof row === 'object' && row !== null) ? row[key] : row;
      const actual = childKey
        ? (raw && typeof raw === 'object' ? raw[childKey] : null)
        : ((typeof row === 'object' && row !== null) ? row[key] : row);
      if (typeof actual === 'number') hasNumeric = true;
    });

    this.filterOp.style.display = 'inline-block';
    this.filterOp.querySelectorAll('option').forEach(o => o.disabled = false);
    if (!hasNumeric) {
      ['gt', 'lt'].forEach(v => {
        const opt = this.filterOp.querySelector(`option[value="${v}"]`);
        if (opt) opt.disabled = true;
      });
      if (['gt', 'lt'].includes(this.filterOp.value)) this.filterOp.value = 'equals';
    }
    this.toggleFilterValMode();
  }

  toggleFilterValMode() {
    const op = this.filterOp.value;
    const useInput = op !== 'equals';
    this.filterVal.style.display = useInput ? 'none' : '';
    this.filterValInput.style.display = useInput ? '' : 'none';
    if (!useInput) this.filterValInput.value = '';
    else this.filterVal.value = '';
  }

  refreshFilterValueOptions() {
    const key = this.filterKey.value;
    const childKey = this.filterChildKey.style.display !== 'none' ? this.filterChildKey.value : '';
    const current = this.pathStack[this.pathStack.length - 1];
    const targetData = current.data;
    const rows = Array.isArray(targetData) ? targetData : [targetData];

    if (!key) {
      this.filterVal.innerHTML = '<option value="">— value —</option>';
      return;
    }

    const firstRowValue = rows.find(row => {
      const value = (typeof row === 'object' && row !== null) ? row[key] : row;
      return value !== undefined;
    });
    const parentValue = firstRowValue && typeof firstRowValue === 'object' ? firstRowValue[key] : undefined;
    const hasNullInParent = rows.some(row => {
      const value = (typeof row === 'object' && row !== null) ? row[key] : row;
      return value === null || value === undefined;
    });

    if (!childKey && parentValue !== null && parentValue !== undefined && typeof parentValue === 'object') {
      if (hasNullInParent) {
        this.filterVal.innerHTML = '<option value="">— value —</option><option value="null">null</option>';
        this.filterVal.value = '';
        return;
      }
      this.filterVal.innerHTML = '<option value="">— value —</option>';
      this.filterVal.value = '';
      return;
    }

    const values = new Set();
    let hasNull = false;
    rows.forEach(row => {
      const value = this.resolveFilterValue(row, key, childKey);
      if (value === null || value === undefined) {
        hasNull = true;
        return;
      }
      if (typeof value !== 'object') {
        const text = String(value);
        if (text !== '') values.add(text);
      }
    });

    const sortedValues = Array.from(values).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    const options = ['<option value="">— value —</option>'];
    if (hasNull) {
      options.push('<option value="null">null</option>');
    }
    options.push(...sortedValues.map(value => `<option value="${this.escapeHtml(value)}">${this.escapeHtml(value)}</option>`));

    this.filterVal.innerHTML = options.join('');
    this.filterVal.value = '';
  }

  resolveFilterValue(row, key, childKey) {
    const rawValue = (typeof row === 'object' && row !== null) ? row[key] : row;
    if (!childKey || rawValue === null || rawValue === undefined) {
      if (rawValue === null || rawValue === undefined) return rawValue;
      return typeof rawValue === 'object' ? JSON.stringify(rawValue) : String(rawValue);
    }

    if (Array.isArray(rawValue)) {
      const values = rawValue
        .filter(item => item && typeof item === 'object')
        .map(item => item[childKey]);
      return values.length ? values.map(v => v === null || v === undefined ? null : String(v)).join(', ') : '';
    }

    if (rawValue && typeof rawValue === 'object') {
      const nestedValue = rawValue[childKey];
      return nestedValue === undefined ? '' : (nestedValue === null ? null : String(nestedValue));
    }

    return '';
  }

  applyFilter() {
    const key = this.filterKey.value;
    const childKey = this.filterChildKey.style.display !== 'none' ? this.filterChildKey.value : '';
    const op = this.filterOp.value;
    const useInput = op !== 'equals';
    const selectedValue = useInput ? this.filterValInput.value : this.filterVal.value;
    const search = selectedValue.trim();

    const current = this.pathStack[this.pathStack.length - 1];
    const targetData = current.data;
    const rows = Array.isArray(targetData) ? targetData : [targetData];

    this.tbody.querySelectorAll('tr').forEach(tr => {
      const rIdx = parseInt(tr.dataset.rowIndex, 10);
      const row = rows[rIdx];

      if (!key || search === '') {
        tr.classList.remove('row-hidden');
        return;
      }

      const rawVal = this.resolveFilterValue(row, key, childKey);
      const normalizedVal = rawVal === null || rawVal === undefined ? '' : String(rawVal);
      const cellStr = normalizedVal.toLowerCase();
      const numVal = typeof rawVal === 'number' ? rawVal : parseFloat(rawVal);
      const numSearch = parseFloat(selectedValue);

      let match = false;
      if (selectedValue === 'null') {
        match = rawVal === null || rawVal === undefined || normalizedVal === '';
      } else if (op === 'equals') {
        match = cellStr === selectedValue.toLowerCase();
      } else if (op === 'contains') {
        match = cellStr.includes(selectedValue.toLowerCase());
      } else if (op === 'starts') {
        match = cellStr.startsWith(selectedValue.toLowerCase());
      } else if (op === 'ends') {
        match = cellStr.endsWith(selectedValue.toLowerCase());
      } else if (op === 'gt') {
        match = !isNaN(numVal) && !isNaN(numSearch) && numVal > numSearch;
      } else if (op === 'lt') {
        match = !isNaN(numVal) && !isNaN(numSearch) && numVal < numSearch;
      }

      tr.classList.toggle('row-hidden', !match);
    });
  }

  renderFormattedCell(val, key, rowIndex, currentDepth, parentKey = null) {
    if (val === null || val === undefined) return `<span class="val-null">null</span>`;
    if (typeof val === 'boolean') return `<span class="val-boolean">${val}</span>`;
    if (typeof val === 'number') return `<span class="val-number">${val}</span>`;
    if (typeof val === 'string') return `<span class="val-string">${this.escapeHtml(val)}</span>`;

    if (typeof val === 'object') {
      if (!Array.isArray(val) && currentDepth === 0) {
        const childKeys = Object.keys(val);

        let inlineHtml = `<div class="inline-object-preview">`;
        childKeys.slice(0, 4).forEach(cKey => {
          const childVal = val[cKey];
          const isComplex = typeof childVal === 'object' && childVal !== null;

          inlineHtml += `
            <div class="inline-row">
              <span class="inline-key">${cKey}:</span>
              <span>
                ${isComplex
                  ? `<button class="val-drilldown-btn" data-key="${key}" data-rowindex="${rowIndex}" data-subkey="${cKey}">${Array.isArray(childVal) ? `Array[${childVal.length}]` : 'Object'} &rarr;</button>`
                  : this.renderFormattedCell(childVal, key, rowIndex, currentDepth + 1, cKey)
                }
              </span>
            </div>`;
        });

        inlineHtml += `</div>`;
        return inlineHtml;
      }

      const label = Array.isArray(val) ? `array[${val.length}]` : 'object';
      const attrSub = parentKey ? `data-subkey="${parentKey}"` : '';
      return `<button class="val-drilldown-btn" data-key="${key}" data-rowindex="${rowIndex}" ${attrSub}>${label} &rarr;</button>`;
    }

    return String(val);
  }

  _makeCrumbCopyBtn(text) {
    const copyBtn = document.createElement('button');
    copyBtn.className = 'crumb-copy-btn';
    copyBtn.title = 'Copy path';
    const icon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
    const check = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7ec87e" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`;
    copyBtn.innerHTML = icon;
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.innerHTML = check;
        setTimeout(() => { copyBtn.innerHTML = icon; }, 1500);
      });
    };
    return copyBtn;
  }

  renderBreadcrumbs(suffix = '') {
    const bar = document.getElementById('breadcrumbBar');
    const fullPath = this.pathStack.map(p => p.label).join('.') + suffix;

    bar.innerHTML = '';

    this.pathStack.forEach((item, index) => {
      if (index > 0) {
        const dot = document.createElement('span');
        dot.className = 'crumb-separator';
        dot.textContent = '.';
        bar.appendChild(dot);
      }
      const link = document.createElement('span');
      link.className = index === this.pathStack.length - 1 && !suffix ? 'crumb-current' : 'crumb-link';
      link.textContent = item.label;
      if (index < this.pathStack.length - 1) {
        link.onclick = () => {
          this.pathStack = this.pathStack.slice(0, index + 1);
          this.renderCurrentLevel();
        };
      }
      bar.appendChild(link);
    });

    if (suffix) {
      const suffixSpan = document.createElement('span');
      suffixSpan.className = 'crumb-current';
      suffixSpan.textContent = suffix;
      bar.appendChild(suffixSpan);
    }

    bar.appendChild(this._makeCrumbCopyBtn(fullPath));
  }

  escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}

new JsonVisualizer();
