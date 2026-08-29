class JsonVisualizer {
  constructor() {
    this.jsonInput = document.getElementById('jsonInput');
    this.errorBanner = document.getElementById('errorBanner');
    this.breadcrumbBar = document.getElementById('breadcrumbBar');
    this.thead = document.getElementById('tableHead');
    this.tbody = document.getElementById('tableBody');
    this.filterKey = document.getElementById('filterKey');
    this.filterOp = document.getElementById('filterOp');
    this.filterVal = document.getElementById('filterVal');
    this.filterBar = document.getElementById('filterBar');
    this.tableContainer = document.getElementById('tableContainer');
    this.treeContainer = document.getElementById('treeContainer');
    this.formattedContainer = document.getElementById('formattedContainer');
    this.view = 'formatted'; // 'table' | 'tree'

    this.rootData = null;
    this.pathStack = [];

    this.jsonInput.value = JSON.stringify({
      status: "success",
      code: 200,
      metadata: { page: 1, limit: 10, total: 50 },
      users: [
        {
          id: 101,
          name: "Alice",
          role: "Admin",
          profile: { title: "Lead Architect", department: "Engineering" },
          settings: { theme: "dark", notifications: true }
        },
        {
          id: 102,
          name: "Bob",
          role: "Developer",
          profile: { title: "Backend Engineer", department: "Infrastructure" },
          settings: { theme: "light", notifications: false }
        }
      ]
    }, null, 2);

    this.jsonInput.addEventListener('input', () => this.processJSON());
    this.filterKey.addEventListener('change', () => this.applyFilter());
    this.filterOp.addEventListener('change', () => this.applyFilter());
    this.filterVal.addEventListener('input', () => this.applyFilter());
    document.getElementById('filterClear').onclick = () => {
      this.filterKey.value = '';
      this.filterVal.value = '';
      this.applyFilter();
    };

    const overlay = document.getElementById('modalOverlay');
    document.getElementById('aboutBtn').onclick = () => overlay.classList.add('open');
    document.getElementById('modalClose').onclick = () => overlay.classList.remove('open');
    overlay.onclick = (e) => { if (e.target === overlay) overlay.classList.remove('open'); };

    document.getElementById('copyBtn').onclick = () => {
      if (!this.rootData) return;
      const formatted = JSON.stringify(this.rootData, null, 2);
      navigator.clipboard.writeText(formatted).then(() => {
        const btn = document.getElementById('copyBtn');
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1500);
      });
    };

    document.getElementById('btnFormatted').onclick = () => this.setView('formatted');
    document.getElementById('btnTable').onclick = () => this.setView('table');
    document.getElementById('btnTree').onclick = () => this.setView('tree');

    this.formattedContainer.style.display = 'block';
    this.tableContainer.style.display = 'none';
    this.treeContainer.style.display = 'none';

    this.processJSON();
  }

  setView(view) {
    this.view = view;
    ['btnFormatted','btnTable','btnTree'].forEach(id =>
      document.getElementById(id).classList.toggle('active', id === `btn${view.charAt(0).toUpperCase()+view.slice(1)}`)
    );
    this.formattedContainer.style.display = view === 'formatted' ? 'block' : 'none';
    this.tableContainer.style.display = view === 'table' ? '' : 'none';
    this.treeContainer.style.display = view === 'tree' ? 'block' : 'none';
    const currentData = this.pathStack[this.pathStack.length - 1]?.data;
    this.filterBar.style.display = view === 'table' && Array.isArray(currentData) && currentData.length > 1 ? 'flex' : 'none';
    if (view === 'tree') this.renderTreeView();
    if (view === 'formatted') this.renderFormattedView();
    if (view === 'table') this.renderCurrentLevel();
  }

  renderTreeView() {
    this.treeContainer.innerHTML = '';
    this.treeContainer.appendChild(this.buildTreeNode(this.rootData, null));
  }

  buildTreeNode(val, key) {
    const node = document.createElement('div');
    node.className = 'tree-node';

    const row = document.createElement('div');
    row.className = 'tree-row';

    const toggle = document.createElement('span');
    toggle.className = 'tree-toggle';

    const label = document.createElement('span');

    const isComplex = val !== null && typeof val === 'object';

    if (key !== null) {
      const keySpan = document.createElement('span');
      keySpan.className = 'tree-key';
      keySpan.textContent = key;
      const colon = document.createElement('span');
      colon.className = 'tree-colon';
      colon.textContent = ': ';
      row.appendChild(toggle);
      row.appendChild(keySpan);
      row.appendChild(colon);
    } else {
      row.appendChild(toggle);
    }

    if (isComplex) {
      const isArr = Array.isArray(val);
      const count = isArr ? val.length : Object.keys(val).length;
      const meta = document.createElement('span');
      meta.className = 'tree-meta';
      meta.textContent = isArr ? `[ ${count} items ]` : `{ ${count} keys }`;
      toggle.textContent = '▾';
      row.appendChild(meta);

      const children = document.createElement('div');
      children.className = 'tree-children';

      if (isArr) {
        val.forEach((item, i) => children.appendChild(this.buildTreeNode(item, String(i))));
      } else {
        Object.entries(val).forEach(([k, v]) => children.appendChild(this.buildTreeNode(v, k)));
      }

      toggle.onclick = (e) => {
        e.stopPropagation();
        const collapsed = children.classList.toggle('collapsed');
        toggle.textContent = collapsed ? '▸' : '▾';
      };

      node.appendChild(row);
      node.appendChild(children);
    } else {
      toggle.textContent = ' ';
      label.innerHTML = this.renderFormattedCell(val, '', 0, 1);
      row.appendChild(label);
      node.appendChild(row);
    }

    return node;
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
    if (!rawVal) return;

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
    this.pathStack = [{ label: 'root', data: this.rootData }];
    this.renderCurrentLevel();
  }

  renderFormattedView() {
    if (!this.rootData) return;
    const pre = document.getElementById('formattedPre');
    pre.innerHTML = this.syntaxHighlight(JSON.stringify(this.rootData, null, 2));
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
    if (this.view === 'tree') { this.renderTreeView(); return; }
    this.formattedContainer.style.display = 'none';
    this.treeContainer.style.display = 'none';
    this.tableContainer.style.display = '';

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

    // Populate filter key dropdown from current headers
    const prevKey = this.filterKey.value;
    this.filterKey.innerHTML = '<option value="">— key —</option>' +
      headers.map(h => `<option value="${h}" ${h === prevKey ? 'selected' : ''}>${h}</option>`).join('');
    this.filterBar.style.display = Array.isArray(targetData) && rows.length > 1 ? 'flex' : 'none';

    this.thead.innerHTML = `<tr><th>#</th>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;

    this.tbody.innerHTML = '';
    rows.forEach((row, rIdx) => {
      const tr = document.createElement('tr');
      let rowHtml = `<td>${rIdx + 1}</td>`;

      headers.forEach(header => {
        const val = (typeof row === 'object' && row !== null) ? row[header] : row;
        rowHtml += `<td>${this.renderFormattedCell(val, header, rIdx, 0)}</td>`;
      });

      tr.innerHTML = rowHtml;
      tr.dataset.rowIndex = rIdx;
      this.tbody.appendChild(tr);
    });

    this.applyFilter();

    this.tbody.onclick = (e) => {
      const btn = e.target.closest('[data-key]');
      if (!btn) return;

      const key = btn.getAttribute('data-key');
      const rowIndex = parseInt(btn.getAttribute('data-rowindex'), 10);
      const subKey = btn.getAttribute('data-subkey');

      let selectedNode = Array.isArray(targetData) ? targetData[rowIndex][key] : targetData[key];

      if (subKey && selectedNode && typeof selectedNode === 'object') {
        selectedNode = selectedNode[subKey];
      }

      const pathLabel = subKey ? `${key}.${subKey}` : (Array.isArray(targetData) ? `${key}[${rowIndex}]` : key);

      this.pathStack.push({ label: pathLabel, data: selectedNode });
      this.renderCurrentLevel();
    };
  }

  applyFilter() {
    const key = this.filterKey.value;
    const op = this.filterOp.value;
    const search = this.filterVal.value.trim().toLowerCase();

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

      const rawVal = (typeof row === 'object' && row !== null) ? row[key] : row;
      const cellStr = String(rawVal ?? '').toLowerCase();
      const numVal = parseFloat(rawVal);
      const numSearch = parseFloat(search);

      let match = false;
      if (op === 'contains') match = cellStr.includes(search);
      else if (op === 'equals') match = cellStr === search;
      else if (op === 'starts') match = cellStr.startsWith(search);
      else if (op === 'gt') match = !isNaN(numVal) && !isNaN(numSearch) && numVal > numSearch;
      else if (op === 'lt') match = !isNaN(numVal) && !isNaN(numSearch) && numVal < numSearch;

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
                  ? `<button class="val-drilldown-btn" data-key="${key}" data-rowindex="${rowIndex}" data-subkey="${cKey}">View ${Array.isArray(childVal) ? 'Array' : 'Object'} &rarr;</button>`
                  : this.renderFormattedCell(childVal, key, rowIndex, currentDepth + 1, cKey)
                }
              </span>
            </div>`;
        });

        if (childKeys.length > 4) {
          inlineHtml += `<div style="margin-top:4px;"><button class="val-drilldown-btn" data-key="${key}" data-rowindex="${rowIndex}">+ ${childKeys.length - 4} more keys &rarr;</button></div>`;
        } else {
          inlineHtml += `<div style="margin-top:4px;"><button class="val-drilldown-btn" data-key="${key}" data-rowindex="${rowIndex}">Focus View &rarr;</button></div>`;
        }

        inlineHtml += `</div>`;
        return inlineHtml;
      }

      const label = Array.isArray(val) ? `Array[${val.length}]` : 'Object';
      const attrSub = parentKey ? `data-subkey="${parentKey}"` : '';
      return `<button class="val-drilldown-btn" data-key="${key}" data-rowindex="${rowIndex}" ${attrSub}>${label} &rarr;</button>`;
    }

    return String(val);
  }

  renderBreadcrumbs() {
    const bar = document.getElementById('breadcrumbBar');
    bar.innerHTML = 'Path: ';

    this.pathStack.forEach((item, index) => {
      const link = document.createElement('span');
      link.className = 'crumb-link';
      link.textContent = item.label;

      link.onclick = () => {
        this.pathStack = this.pathStack.slice(0, index + 1);
        this.renderCurrentLevel();
      };

      bar.appendChild(link);

      if (index < this.pathStack.length - 1) {
        const sep = document.createElement('span');
        sep.className = 'crumb-separator';
        sep.textContent = ' / ';
        bar.appendChild(sep);
      }
    });
  }

  escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}

new JsonVisualizer();
