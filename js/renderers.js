// Renderers Module - View rendering (formatted, tree, table)
class Renderers {
  constructor(utils, filters) {
    this.utils = utils;
    this.filters = filters;
  }

  renderFormattedView(data, options = {}, elementId = 'formattedPre') {
    if (!data) return;
    
    let pre = document.getElementById(elementId);
    
    // Create pre element if it doesn't exist
    if (!pre) {
      const container = document.getElementById('formattedContainer');
      if (!container) return;
      pre = document.createElement('pre');
      pre.id = elementId;
      container.innerHTML = '';
      container.appendChild(pre);
    }
    
    const formatted = this.utils.formatJsonOutput(data, options);
    pre.innerHTML = this.utils.syntaxHighlight(formatted);
  }

  renderTreeView(data, containerId = 'treeContainer') {
    const container = document.getElementById(containerId);
    if (!container || !data) return;
    container.innerHTML = '';
    container.appendChild(this.buildTreeNode(data, null));
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
      label.innerHTML = this.utils.renderFormattedCellTree(val);
      row.appendChild(label);
      node.appendChild(row);
    }

    return node;
  }

  renderTableView(data, pathStack, options = {}) {
    const current = pathStack[pathStack.length - 1];
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
    const thead = document.getElementById('tableHead');
    const tbody = document.getElementById('tableBody');

    if (!thead || !tbody) return { rows, headers };

    thead.innerHTML = `<tr><th>#</th>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
    tbody.innerHTML = '';

    rows.forEach((row, rIdx) => {
      const tr = document.createElement('tr');
      let rowHtml = `<td>${rIdx}</td>`;

      headers.forEach(header => {
        const val = (typeof row === 'object' && row !== null) ? row[header] : row;
        rowHtml += `<td>${this.utils.renderFormattedCell(val, header, rIdx, 0)}</td>`;
      });

      tr.innerHTML = rowHtml;
      tr.dataset.rowIndex = rIdx;
      tbody.appendChild(tr);
    });

    return { rows, headers };
  }

  applyTableFilter(rows, headers, key, childKey, op, selectedValue, filters) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;

    tbody.querySelectorAll('tr').forEach(tr => {
      const rIdx = parseInt(tr.dataset.rowIndex, 10);
      const row = rows[rIdx];

      if (!key || selectedValue === '') {
        tr.classList.remove('row-hidden');
        return;
      }

      const rawVal = filters.resolveFilterValue(row, key, childKey);
      const match = filters.matchesFilter(rawVal, selectedValue, op);
      tr.classList.toggle('row-hidden', !match);
    });
  }
}
