// Utilities Module - Common helper functions
class Utils {
  escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  formatJsonOutput(data, options = {}) {
    const { minify = false, unquoteKeys = false } = options;
    let json = minify ? JSON.stringify(data) : JSON.stringify(data, null, 2);
    if (unquoteKeys) {
      json = json.replace(/"([a-zA-Z_$][\w$]*)"\s*:/g, '$1:');
    }
    return json;
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

  renderFormattedCell(val, header, rIdx, depth) {
    if (val === null || val === undefined) {
      return `<span class="val-null">null</span>`;
    }

    if (typeof val === 'boolean') {
      return `<span class="val-bool">${val}</span>`;
    }

    if (typeof val === 'number') {
      return `<span class="val-number">${val}</span>`;
    }

    if (typeof val === 'string') {
      return `<span class="val-string">${this.escapeHtml(val)}</span>`;
    }

    if (Array.isArray(val)) {
      return `<button class="drill-btn" data-key="${header}" data-rowindex="${rIdx}" data-type="array">[${val.length} items]</button>`;
    }

    if (typeof val === 'object' && val !== null) {
      const keys = Object.keys(val);
      return `<button class="drill-btn" data-key="${header}" data-rowindex="${rIdx}" data-type="object">{${keys.length} keys}</button>`;
    }

    return this.escapeHtml(String(val));
  }

  renderFormattedCellTree(val) {
    if (val === null || val === undefined) {
      return `<span class="val-string">${this.escapeHtml(String(val))}</span>`;
    }
    if (typeof val === 'string') return `<span class="val-string">${this.escapeHtml(val)}</span>`;
    if (typeof val === 'boolean') return `<span class="val-bool">${val}</span>`;
    if (typeof val === 'number') return `<span class="val-number">${val}</span>`;
    return `<span class="val-object">${this.escapeHtml(JSON.stringify(val))}</span>`;
  }
}
