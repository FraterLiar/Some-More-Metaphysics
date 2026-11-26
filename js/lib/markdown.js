// Small safe renderer for the plain Markdown used in bio.md and essay files.
export function renderMarkdown(container, markdown) {
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
      let url;
      try {
        url = new URL(image[2], document.baseURI);
      } catch {
        continue;
      }
      if (!['http:', 'https:'].includes(url.protocol)) continue;
      const node = document.createElement('img');
      node.src = url.href;
      node.alt = image[1];
      if (image[3]) node.title = image[3];
      node.loading = 'lazy';
      node.decoding = 'async';
      container.appendChild(node);
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
    node.textContent = lines.map(line => line.replace(/^#{1,3}\s+/, '')).join(' ');
    container.appendChild(node);
  }
}
