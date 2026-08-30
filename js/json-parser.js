// JSON Parser Module - Handles JSON parsing, tokenizing, and fixing malformed JSON
class JsonParser {
  decodeEntities(str) {
    return str
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  }

  tokenize(str) {
    const tokens = [];
    let i = 0;
    while (i < str.length) {
      if (/\s/.test(str[i])) { i++; continue; }
      if (str[i] === '#') { while (i < str.length && str[i] !== '\n') i++; continue; }
      if (str[i] === '"') {
        let j = i + 1, val = '"';
        while (j < str.length) {
          if (str[j] === '\\') { val += str[j] + str[j+1]; j += 2; continue; }
          if (str[j] === '"') { val += '"'; j++; break; }
          val += str[j++];
        }
        tokens.push({ type: 'string', val }); i = j; continue;
      }
      if ('{}[]:,'.includes(str[i])) { tokens.push({ type: str[i], val: str[i] }); i++; continue; }
      if (/[\d]/.test(str[i]) || (str[i] === '-' && /[\d]/.test(str[i+1] || ''))) {
        let j = i;
        if (str[j] === '-') j++;
        while (j < str.length && /[\d.eE+\-]/.test(str[j])) j++;
        const num = str.slice(i, j);
        if (!isNaN(num) && num !== '') { tokens.push({ type: 'number', val: num }); i = j; continue; }
      }
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
      i++;
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
      consume();
      let out = '{';
      let first = true;
      while (pos < tokens.length && peek().type !== '}') {
        if (peek().type === ',') { consume(); continue; }
        if (!first) out += ',';
        first = false;
        const keyTok = consume();
        const key = keyTok.type === 'string' ? keyTok.val : `"${keyTok.val}"`;
        if (peek() && peek().type === ':') consume();
        out += `${key}:${parseValue()}`;
      }
      if (peek() && peek().type === '}') consume();
      return out + '}';
    };

    const parseArray = () => {
      consume();
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
      str = str.replace(/^\s*#.*$/gm, '');
      str = str.replace(/'([^']*)'/g, '"$1"');
      str = str.replace(/([{,\[]?\s*)([a-zA-Z_$][\w$]*)\s*:/g, (m, pre, key) => `${pre}"${key}":`);
      str = str.replace(/("[^"]*"|\d+|true|false|null|\]|\})\s*\n(\s*)("[^"]*"|[a-zA-Z_$])/g, '$1,\n$2$3');
      str = str.replace(/,\s*([}\]])/g, '$1');
      return str;
    }
  }

  parse(jsonString) {
    const rawVal = jsonString.trim();
    if (!rawVal) return null;

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
        return { error: err.message };
      }
    }

    return { data: parsed, fixed };
  }
}
