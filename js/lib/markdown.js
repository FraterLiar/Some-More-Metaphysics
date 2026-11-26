// Small safe renderer for the plain Markdown used in bio.md and essay files.
function appendTextWithImages(parent, text, baseUrl) {
  const pattern = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+["']([^"']*)["'])?\)/g;
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    parent.appendChild(document.createTextNode(text.slice(cursor, match.index)));
    let url;
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
    cursor = match.index + match[0].length;
  }
  parent.appendChild(document.createTextNode(text.slice(cursor)));
}

export function renderMarkdown(container, markdown, baseUrl = document.baseURI) {
  container.replaceChildren();
  for (const block of String(markdown || '').trim().split(/\n\s*\n/)) {
    const lines = block.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (!lines.length) continue;
    const heading = lines[0].match(/^(#{1,3})\s+(.+)$/);
    if (heading && lines.length === 1) {
      const node = document.createElement(`h${heading[1].length}`);
      node.textContent = heading[2];
      container.appendChild(node);
      continue;
    }
    const image = lines.length === 1 && lines[0].match(/^!\[([^\]]*)\]\((\S+?)(?:\s+["']([^"']*)["'])?\)$/);
    if (image) {
      appendTextWithImages(container, lines[0], baseUrl);
      continue;
    }
    const listItems = lines.map(line => line.match(/^(?:[-*+]\s+|\d+[.)]\s+)(.+)$/));
    if (listItems.every(Boolean)) {
      const ordered = /^\d+[.)]/.test(lines[0]);
      const list = document.createElement(ordered ? 'ol' : 'ul');
      listItems.forEach(match => {
        const item = document.createElement('li');
        item.textContent = match[1];
        list.appendChild(item);
      });
      container.appendChild(list);
      continue;
    }
    const node = document.createElement('p');
    appendTextWithImages(node, lines.map(line => line.replace(/^#{1,3}\s+/, '')).join(' '), baseUrl);
    container.appendChild(node);
  }
}
