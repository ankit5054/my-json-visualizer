// Renderers Module - View rendering (formatted, table)
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
