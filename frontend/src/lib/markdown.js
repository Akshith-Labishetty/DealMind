function esc(t) {
  return String(t || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function mdToHtml(t) {
  const s = esc(t);
  const out = [];
  const lines = s.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('### ')) { out.push(`<h4>${line.slice(4)}</h4>`); i++; continue; }
    if (line.startsWith('## ')) { out.push(`<h3>${line.slice(3)}</h3>`); i++; continue; }
    if (line.startsWith('# ')) { out.push(`<h2>${line.slice(2)}</h2>`); i++; continue; }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const items = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        items.push(`<li>${lines[i].slice(2)}</li>`);
        i++;
      }
      out.push(`<ul>${items.join('')}</ul>`);
      continue;
    }
    if (line.trim() === '') { i++; continue; }
    const para = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    out.push(`<p>${para}</p>`);
    i++;
  }
  return out.join('\n');
}
