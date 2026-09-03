// UI Handlers Module - DOM interactions and event listeners
class UIHandlers {
  constructor(state, parser, utils, filters, renderers) {
    this.state = state;
    this.parser = parser;
    this.utils = utils;
    this.filters = filters;
    this.renderers = renderers;
  }

  init() {
    this.setupViewContainers();
    this.setupInputHandlers();
    this.setupFilterHandlers();
    this.setupViewToggleHandlers();
    this.setupCopyHandler();
    this.setupModalHandlers();
    this.setupFormattingHandlers();
  }

  setupViewContainers() {
    const formattedContainer = document.getElementById('formattedContainer');
    const tableContainer = document.getElementById('tableContainer');
    const breadcrumbBar = document.getElementById('breadcrumbBar');
    const filterBar = document.getElementById('filterBar');
    const errorBanner = document.getElementById('errorBanner');

    // Ensure formatted container has pre element
    if (formattedContainer && !formattedContainer.querySelector('pre')) {
      const pre = document.createElement('pre');
      pre.id = 'formattedPre';
      formattedContainer.appendChild(pre);
    }

    // Initialize visibility
    if (formattedContainer) formattedContainer.style.display = 'block';
    if (tableContainer) tableContainer.style.display = 'none';
    if (breadcrumbBar) breadcrumbBar.style.visibility = 'hidden';
    if (filterBar) filterBar.style.display = 'none';
    if (errorBanner) errorBanner.style.display = 'none';

    // Set active button
    const btnFormatted = document.getElementById('btnFormatted');
    if (btnFormatted) btnFormatted.classList.add('active');
  }

  setupInputHandlers() {
    const jsonInput = document.getElementById('jsonInput');
    const clearBtn = document.getElementById('clearInputBtn');
    const errorBanner = document.getElementById('errorBanner');
    const errorBannerClose = document.getElementById('errorBannerClose');

    if (jsonInput) {
      jsonInput.addEventListener('input', () => this.onInputChange());
    }

    if (clearBtn) {
      clearBtn.onclick = () => {
        jsonInput.value = '';
        this.state.rootData = null;
        this.state.pathStack = [];
        this.state.view = 'formatted';
        errorBanner.style.display = 'none';

        const formattedContainer = document.getElementById('formattedContainer');
        const tableContainer = document.getElementById('tableContainer');
        const breadcrumbBar = document.getElementById('breadcrumbBar');
        const filterBar = document.getElementById('filterBar');
        const tableHead = document.getElementById('tableHead');
        const tableBody = document.getElementById('tableBody');
        const formattedPre = formattedContainer ? formattedContainer.querySelector('#formattedPre') : null;

        if (formattedContainer) formattedContainer.style.display = 'block';
        if (tableContainer) tableContainer.style.display = 'none';
        if (filterBar) filterBar.style.display = 'none';
        if (tableHead) tableHead.innerHTML = '';
        if (tableBody) tableBody.innerHTML = '';
        if (breadcrumbBar) {
          breadcrumbBar.style.visibility = 'hidden';
          breadcrumbBar.innerHTML = 'Path:';
        }
        if (formattedPre) formattedPre.innerHTML = '';

        ['btnFormatted', 'btnTable'].forEach(id => {
          const btn = document.getElementById(id);
          if (btn) btn.classList.toggle('active', id === 'btnFormatted');
        });
      };
    }

    if (errorBannerClose) {
      errorBannerClose.onclick = () => {
        errorBanner.style.display = 'none';
      };
    }
  }

  setupFilterHandlers() {
    const filterKey = document.getElementById('filterKey');
    const filterChildKey = document.getElementById('filterChildKey');
    const filterOp = document.getElementById('filterOp');
    const filterVal = document.getElementById('filterVal');
    const filterClear = document.getElementById('filterClear');

    if (filterKey) {
      filterKey.addEventListener('change', () => {
        this.refreshFilterChildOptions();
        this.refreshFilterValueOptions();
        this.refreshFilterOperator();
        this.applyFilter();
      });
    }

    if (filterChildKey) {
      filterChildKey.addEventListener('change', () => {
        this.refreshFilterValueOptions();
        this.refreshFilterOperator();
        this.applyFilter();
      });
    }

    if (filterOp) {
      filterOp.addEventListener('change', () => this.applyFilter());
    }

    if (filterVal) {
      filterVal.addEventListener('change', () => this.applyFilter());
    }

    if (filterClear) {
      filterClear.onclick = () => {
        if (filterKey) filterKey.value = '';
        if (filterChildKey) filterChildKey.value = '';
        if (filterChildKey) filterChildKey.style.display = 'none';
        if (filterVal) filterVal.innerHTML = '<option value="">— value —</option>';
        if (filterVal) filterVal.value = '';
        if (filterOp) filterOp.style.display = 'none';
        if (filterOp) filterOp.value = 'contains';
        this.applyFilter();
      };
    }
  }

  setupViewToggleHandlers() {
    const btnFormatted = document.getElementById('btnFormatted');
    const btnTable = document.getElementById('btnTable');

    if (btnFormatted) btnFormatted.onclick = () => this.setView('formatted');
    if (btnTable) btnTable.onclick = () => this.setView('table');
  }

  setupCopyHandler() {
    const copyBtn = document.getElementById('copyBtn');
    if (copyBtn) {
      copyBtn.onclick = () => {
        if (!this.state.rootData) return;
        const formatted = this.utils.formatJsonOutput(this.state.rootData, {
          minify: this.state.minify,
          unquoteKeys: this.state.unquoteKeys
        });
        navigator.clipboard.writeText(formatted).then(() => {
          copyBtn.textContent = 'Copied!';
          copyBtn.classList.add('copied');
          setTimeout(() => {
            copyBtn.textContent = 'Copy';
            copyBtn.classList.remove('copied');
          }, 1500);
        });
      };
    }
  }

  setupModalHandlers() {
    const overlay = document.getElementById('modalOverlay');
    const aboutBtn = document.getElementById('aboutBtn');
    const modalClose = document.getElementById('modalClose');

    if (aboutBtn) {
      aboutBtn.onclick = () => overlay.classList.add('open');
    }

    if (modalClose) {
      modalClose.onclick = () => overlay.classList.remove('open');
    }

    if (overlay) {
      overlay.onclick = (e) => {
        if (e.target === overlay) overlay.classList.remove('open');
      };

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.classList.contains('open')) {
          overlay.classList.remove('open');
        }
      });
    }
  }

  setupFormattingHandlers() {
    const unquoteChk = document.getElementById('unquoteKeysChk');
    const minifyChk = document.getElementById('minifyChk');

    if (unquoteChk) {
      unquoteChk.onchange = (e) => {
        this.state.unquoteKeys = e.target.checked;
        if (this.state.view === 'formatted') {
          this.renderers.renderFormattedView(this.state.rootData, {
            minify: this.state.minify,
            unquoteKeys: this.state.unquoteKeys
          });
        }
      };
    }

    if (minifyChk) {
      minifyChk.onchange = (e) => {
        this.state.minify = e.target.checked;
        if (this.state.view === 'formatted') {
          this.renderers.renderFormattedView(this.state.rootData, {
            minify: this.state.minify,
            unquoteKeys: this.state.unquoteKeys
          });
        }
      };
    }
  }

  onInputChange() {
    const jsonInput = document.getElementById('jsonInput');
    const errorBanner = document.getElementById('errorBanner');

    if (!jsonInput || !jsonInput.value.trim()) {
      this.state.rootData = null;
      this.state.pathStack = [];
      this.state.view = 'formatted';

      const formattedContainer = document.getElementById('formattedContainer');
      const tableContainer = document.getElementById('tableContainer');
      const breadcrumbBar = document.getElementById('breadcrumbBar');
      const filterBar = document.getElementById('filterBar');
      const tableHead = document.getElementById('tableHead');
      const tableBody = document.getElementById('tableBody');
      const formattedPre = formattedContainer ? formattedContainer.querySelector('#formattedPre') : null;

      if (formattedContainer) formattedContainer.style.display = 'block';
      if (tableContainer) tableContainer.style.display = 'none';
      if (filterBar) filterBar.style.display = 'none';
      if (tableHead) tableHead.innerHTML = '';
      if (tableBody) tableBody.innerHTML = '';
      if (breadcrumbBar) {
        breadcrumbBar.style.visibility = 'hidden';
        breadcrumbBar.innerHTML = 'Path:';
      }
      if (formattedPre) formattedPre.innerHTML = '';
      if (errorBanner) errorBanner.style.display = 'none';

      ['btnFormatted', 'btnTable'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.classList.toggle('active', id === 'btnFormatted');
      });
      return;
    }

    const result = this.parser.parse(jsonInput.value);

    if (!result || result.error) {
      if (result?.error) {
        document.getElementById('errorText').textContent = `JSON Error: ${result.error}`;
        errorBanner.style.display = 'block';
      } else {
        errorBanner.style.display = 'none';
      }
      return;
    }

    errorBanner.style.display = result.fixed ? 'block' : 'none';
    if (result.fixed) {
      errorBanner.style.background = '#1a3a1a';
      errorBanner.style.color = '#7ec87e';
      document.getElementById('errorText').textContent = '⚠ Auto-corrected JSON — trailing commas, quotes, or casing fixed';
    } else {
      errorBanner.style.background = '';
      errorBanner.style.color = '';
    }

    this.state.rootData = result.data;
    this.state.pathStack = [{ label: '$', data: this.state.rootData }];
    this.renderCurrentLevel();
  }

  setView(view) {
    this.state.view = view;
    ['btnFormatted', 'btnTable'].forEach(id =>
      document.getElementById(id).classList.toggle('active', id === `btn${view.charAt(0).toUpperCase() + view.slice(1)}`)
    );

    document.getElementById('formattedContainer').style.display = view === 'formatted' ? 'block' : 'none';
    document.getElementById('tableContainer').style.display = view === 'table' ? '' : 'none';
    document.getElementById('breadcrumbBar').style.visibility = view === 'table' ? 'visible' : 'hidden';

    const currentData = this.state.pathStack[this.state.pathStack.length - 1]?.data;
    document.getElementById('filterBar').style.display =
      view === 'table' && Array.isArray(currentData) && currentData.length > 1 ? 'flex' : 'none';

    this.renderCurrentLevel();
  }

  renderCurrentLevel() {
    if (!this.state.rootData) return;

    this.renderBreadcrumbs();

    const current = this.state.pathStack[this.state.pathStack.length - 1];
    const targetData = current?.data;
    const filterBar = document.getElementById('filterBar');

    if (this.state.view === 'table' && filterBar) {
      filterBar.style.display = Array.isArray(targetData) && targetData.length > 1 ? 'flex' : 'none';
    }

    // Show/hide containers based on current view
    const formattedContainer = document.getElementById('formattedContainer');
    const tableContainer = document.getElementById('tableContainer');

    if (this.state.view === 'formatted') {
      if (formattedContainer) formattedContainer.style.display = 'block';
      if (tableContainer) tableContainer.style.display = 'none';
      this.renderers.renderFormattedView(this.state.rootData, {
        minify: this.state.minify,
        unquoteKeys: this.state.unquoteKeys
      });
      return;
    }

    // Table view
    if (formattedContainer) formattedContainer.style.display = 'none';
    if (tableContainer) tableContainer.style.display = '';

    const result = this.renderers.renderTableView(targetData, this.state.pathStack);
    const { rows, headers } = result;

    this.populateFilterDropdowns(rows, headers);
    this.setupTableClickHandlers(headers, rows, targetData);
    this.applyFilter();
  }

  populateFilterDropdowns(rows, headers) {
    const filterKey = document.getElementById('filterKey');
    const filterableHeaders = headers.filter(header => {
      return rows.some(row => {
        const value = (typeof row === 'object' && row !== null) ? row[header] : row;
        return value !== undefined;
      });
    });

    const prevKey = filterKey.value;
    const selectedKey = filterableHeaders.includes(prevKey) ? prevKey : '';
    filterKey.innerHTML = '<option value="">— key —</option>' +
      filterableHeaders.map(h => `<option value="${h}" ${h === selectedKey ? 'selected' : ''}>${h}</option>`).join('');
    filterKey.value = selectedKey;

    this.refreshFilterChildOptions();
    this.refreshFilterValueOptions();
  }

  refreshFilterChildOptions() {
    const filterKey = document.getElementById('filterKey');
    const filterChildKey = document.getElementById('filterChildKey');
    const key = filterKey.value;
    const current = this.state.pathStack[this.state.pathStack.length - 1];
    const targetData = current.data;
    const rows = Array.isArray(targetData) ? targetData : [targetData];

    const childKeys = this.filters.getChildKeys(rows, key);

    if (!key || childKeys.size === 0) {
      filterChildKey.innerHTML = '<option value="">— child field —</option>';
      filterChildKey.style.display = 'none';
      filterChildKey.value = '';
      return;
    }

    const options = ['<option value="">— child field —</option>']
      .concat(Array.from(childKeys).map(childKey => `<option value="${childKey}">${childKey}</option>`))
      .join('');
    filterChildKey.innerHTML = options;
    filterChildKey.style.display = 'inline-block';
  }

  refreshFilterOperator() {
    const filterKey = document.getElementById('filterKey');
    const filterChildKey = document.getElementById('filterChildKey');
    const filterOp = document.getElementById('filterOp');
    const key = filterKey.value;
    const childKey = filterChildKey.style.display !== 'none' ? filterChildKey.value : '';
    const current = this.state.pathStack[this.state.pathStack.length - 1];
    const targetData = current.data;
    const rows = Array.isArray(targetData) ? targetData : [targetData];

    if (!key) {
      filterOp.style.display = 'none';
      filterOp.value = 'contains';
      return;
    }

    const isStringLike = this.filters.isStringLikeField(rows, key, childKey);
    if (isStringLike) {
      filterOp.style.display = 'none';
      filterOp.value = 'equals';
      return;
    }

    filterOp.style.display = 'inline-block';
    if (!['gt', 'lt'].includes(filterOp.value)) {
      filterOp.value = 'equals';
    }
  }

  refreshFilterValueOptions() {
    const filterKey = document.getElementById('filterKey');
    const filterChildKey = document.getElementById('filterChildKey');
    const filterVal = document.getElementById('filterVal');
    const key = filterKey.value;
    const childKey = filterChildKey.style.display !== 'none' ? filterChildKey.value : '';
    const current = this.state.pathStack[this.state.pathStack.length - 1];
    const targetData = current.data;
    const rows = Array.isArray(targetData) ? targetData : [targetData];

    if (!key) {
      filterVal.innerHTML = '<option value="">— value —</option>';
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
        filterVal.innerHTML = '<option value="">— value —</option><option value="null">null</option>';
        filterVal.value = '';
        return;
      }
      filterVal.innerHTML = '<option value="">— value —</option>';
      filterVal.value = '';
      return;
    }

    const { values, hasNull } = this.filters.getFilterValues(rows, key, childKey);
    const sortedValues = values.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    const options = ['<option value="">— value —</option>'];
    
    if (hasNull) {
      options.push('<option value="null">null</option>');
    }
    options.push(...sortedValues.map(value => `<option value="${this.utils.escapeHtml(value)}">${this.utils.escapeHtml(value)}</option>`));

    filterVal.innerHTML = options.join('');
    filterVal.value = '';
  }

  applyFilter() {
    const filterKey = document.getElementById('filterKey');
    const filterChildKey = document.getElementById('filterChildKey');
    const filterOp = document.getElementById('filterOp');
    const filterVal = document.getElementById('filterVal');
    
    const key = filterKey.value;
    const childKey = filterChildKey.style.display !== 'none' ? filterChildKey.value : '';
    const op = filterOp.value;
    const selectedValue = filterVal.value;

    const current = this.state.pathStack[this.state.pathStack.length - 1];
    const targetData = current.data;
    const rows = Array.isArray(targetData) ? targetData : [targetData];

    this.renderers.applyTableFilter(rows, [], key, childKey, op, selectedValue, this.filters);
  }

  setupTableClickHandlers(headers, rows, targetData) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;

    tbody.onclick = (e) => {
      const btn = e.target.closest('[data-key]');
      const td = e.target.closest('td');
      const tr = e.target.closest('tr');

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

      this.state.pathStack.push({ label: pathLabel, data: selectedNode });
      this.renderCurrentLevel();
    };
  }

  buildPathText(suffix = '') {
    let path = '$';

    this.state.pathStack.slice(1).forEach(item => {
      const normalized = String(item.label || '').replace(/^\./, '').replace(/^\$/, '').trim();
      if (normalized) {
        path += `.${normalized}`;
      }
    });

    if (suffix) {
      const suffixText = String(suffix).trim();
      path += suffixText.startsWith('.') ? suffixText : `.${suffixText}`;
    }

    return path;
  }

  makeCrumbCopyBtn(text) {
    const copyBtn = document.createElement('button');
    copyBtn.className = 'crumb-copy-btn';
    copyBtn.title = 'Copy path';
    copyBtn.type = 'button';

    const icon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
    const check = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7ec87e" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';

    copyBtn.innerHTML = icon;
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.innerHTML = check;
        setTimeout(() => {
          copyBtn.innerHTML = icon;
        }, 1500);
      });
    };

    return copyBtn;
  }

  renderBreadcrumbs(suffix = '') {
    const breadcrumbBar = document.getElementById('breadcrumbBar');
    if (!breadcrumbBar) return;

    let html = 'Path: ';
    this.state.pathStack.forEach((item, idx) => {
      if (idx > 0) html += ' <span class="crumb-separator">›</span> ';
      html += `<span class="crumb-link" data-index="${idx}">${item.label}</span>`;
    });

    if (suffix) {
      html += ` <span class="crumb-separator">›</span> <span class="crumb-current">${suffix}</span>`;
    }

    breadcrumbBar.innerHTML = html;
    breadcrumbBar.appendChild(this.makeCrumbCopyBtn(this.buildPathText(suffix)));

    breadcrumbBar.querySelectorAll('.crumb-link').forEach(link => {
      link.onclick = (e) => {
        e.preventDefault();
        const idx = parseInt(link.getAttribute('data-index'), 10);
        this.state.pathStack = this.state.pathStack.slice(0, idx + 1);
        this.renderCurrentLevel();
      };
    });
  }
}
