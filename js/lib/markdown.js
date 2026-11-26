// Small safe renderer for the Markdown subset used by the bio and ritual room.
function appendInlineMarkdown(parent, text, baseUrl) {
  const pattern = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+["']([^"']*)["'])?\)|\[([^\]]+)\]\(([^)\s]+)(?:\s+["']([^"']*)["'])?\)|\*\*(.+?)\*\*|__(.+?)__|~~(.+?)~~|\*([^*]+)\*|_([^_]+)_|`([^`]+)`/g;
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    parent.appendChild(document.createTextNode(text.slice(cursor, match.index)));
    let url;
    if (match[1] !== undefined) {
      try {
        url = new URL(match[2], baseUrl);
      } catch {
        parent.appendChild(document.createTextNode(match[0]));
        cursor = match.index + match[0].length;
        continue;
      }
      if (!['http:', 'https:'].includes(url.protocol)) {
        parent.appendChild(document.createTextNode(match[0]));
        cursor = match.index + match[0].length;
        continue;
      }
      const image = document.createElement('img');
      image.src = url.href;
      image.alt = match[1];
      if (match[3]) image.title = match[3];
      image.loading = 'lazy';
      image.decoding = 'async';
      parent.appendChild(image);
    } else if (match[4] !== undefined) {
      try {
        url = new URL(match[5], baseUrl);
      } catch {
        parent.appendChild(document.createTextNode(match[0]));
        cursor = match.index + match[0].length;
        continue;
      }
      if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) {
        parent.appendChild(document.createTextNode(match[0]));
        cursor = match.index + match[0].length;
        continue;
      }
      const link = document.createElement('a');
      link.href = url.href;
      appendInlineMarkdown(link, match[4], baseUrl);
      if (match[6]) link.title = match[6];
      parent.appendChild(link);
    } else {
      const tag = match[7] !== undefined || match[8] !== undefined ? 'strong'
        : match[9] !== undefined ? 'del'
          : match[10] !== undefined || match[11] !== undefined ? 'em' : 'code';
      const content = match[7] ?? match[8] ?? match[9] ?? match[10] ?? match[11] ?? match[12];
      const node = document.createElement(tag);
      if (tag === 'code') node.textContent = content;
      else appendInlineMarkdown(node, content, baseUrl);
      parent.appendChild(node);
    }
    cursor = match.index + match[0].length;
  }
  parent.appendChild(document.createTextNode(text.slice(cursor)));
}

export function renderMarkdown(container, markdown, baseUrl = document.baseURI) {
  container.replaceChildren();
  for (const block of String(markdown || '').trim().split(/\n\s*\n/)) {
    const lines = block.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (!lines.length) continue;
    const heading = lines.length === 1 && lines[0].match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const node = document.createElement(`h${heading[1].length}`);
      appendInlineMarkdown(node, heading[2], baseUrl);
      container.appendChild(node);
      continue;
    }
    const listItems = lines.map(line => line.match(/^(?:[-*+]\s+|\d+[.)]\s+)(.+)$/));
    if (listItems.every(Boolean)) {
      const ordered = /^\d+[.)]/.test(lines[0]);
      const list = document.createElement(ordered ? 'ol' : 'ul');
      listItems.forEach(match => {
        const item = document.createElement('li');
        appendInlineMarkdown(item, match[1], baseUrl);
        list.appendChild(item);
      });
      container.appendChild(list);
      continue;
    }
    const node = document.createElement('p');
    appendInlineMarkdown(node, lines.map(line => line.replace(/^#{1,6}\s+/, '')).join(' '), baseUrl);
    container.appendChild(node);
  }
}
