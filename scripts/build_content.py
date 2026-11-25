#!/usr/bin/env python3
"""Build the browser's content.json from content/ Markdown files."""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]


def read_markdown(path):
    text = path.read_text(encoding="utf-8").strip()
    if not text.startswith("---\n"):
        raise ValueError(f"Missing front matter in {path}")
    _, metadata, body = text.split("---", 2)
    fields = {}
    for line in metadata.strip().splitlines():
        key, sep, value = line.partition(":")
        if not sep:
            raise ValueError(f"Invalid front matter line in {path}: {line}")
        value = value.strip()
        try:
            fields[key.strip()] = json.loads(value)
        except json.JSONDecodeError:
            fields[key.strip()] = value
    fields["body"] = body.strip()
    return fields


def main():
    data_path = ROOT / "content.json"
    data = json.loads(data_path.read_text(encoding="utf-8"))
    essays = []
    for path in sorted((ROOT / "content/essays").glob("*.md")):
        item = read_markdown(path)
        if item.get("published", False) is not True:
            continue
        if not item.get("slug") or not item.get("title"):
            raise ValueError(f"Each published essay needs slug and title: {path}")
        essays.append({
            "slug": item["slug"], "title": item["title"],
            "page": str(item.get("page", "")), "essay": item["body"],
            "order": int(item.get("order", 9999)),
        })
    essays.sort(key=lambda item: (item.pop("order"), item["slug"]))
    data["site"]["title"] = "Some More Metaphysics"
    data["contents"]["entries"] = essays
    practices = []
    for path in sorted((ROOT / "content/rituals").glob("*.md")):
        item = read_markdown(path)
        if item.get("published", False) is not True:
            continue
        if not item.get("slug") or not item.get("title"):
            raise ValueError(f"Each published practice needs slug and title: {path}")
        practices.append({
            "slug": item["slug"], "title": item["title"],
            "instructions": item["body"], "order": int(item.get("order", 9999)),
        })
    practices.sort(key=lambda item: (item.pop("order"), item["slug"]))
    data["ritual"]["practices"] = practices
    data.pop("ui", None)
    data_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
