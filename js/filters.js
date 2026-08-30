// Filters Module - All filtering logic
class Filters {
  constructor(utils) {
    this.utils = utils;
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

  getChildKeys(rows, key) {
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
    return childKeys;
  }

  getFilterValues(rows, key, childKey) {
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

    return { values: Array.from(values), hasNull };
  }

  isStringLikeField(rows, key, childKey) {
    let allStringLike = true;
    rows.forEach(row => {
      const value = this.resolveFilterValue(row, key, childKey);
      if (value === null || value === undefined) return;
      if (typeof value !== 'string') {
        allStringLike = false;
      }
    });
    return allStringLike;
  }

  matchesFilter(rawVal, selectedValue, op) {
    const normalizedVal = rawVal === null || rawVal === undefined ? '' : String(rawVal);
    const cellStr = normalizedVal.toLowerCase();
    const numVal = typeof rawVal === 'number' ? rawVal : parseFloat(rawVal);
    const numSearch = parseFloat(selectedValue);

    if (selectedValue === 'null') {
      return rawVal === null || rawVal === undefined || normalizedVal === '';
    } else if (op === 'equals') {
      return cellStr === selectedValue.toLowerCase();
    } else if (op === 'contains') {
      return cellStr.includes(selectedValue.toLowerCase());
    } else if (op === 'starts') {
      return cellStr.startsWith(selectedValue.toLowerCase());
    } else if (op === 'gt') {
      return !isNaN(numVal) && !isNaN(numSearch) && numVal > numSearch;
    } else if (op === 'lt') {
      return !isNaN(numVal) && !isNaN(numSearch) && numVal < numSearch;
    }
    return false;
  }
}
