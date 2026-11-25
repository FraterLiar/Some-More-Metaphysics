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
