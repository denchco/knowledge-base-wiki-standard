"""Read-only, independent source-to-built-page citation accounting."""
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path
import argparse
import json
import re
import sys
import tomllib
from urllib.parse import unquote, urljoin, urlsplit

from markdown import Markdown
import yaml

SOURCE_LABEL = re.compile(r"(SRC-\d{3,})(?:: .+)?")
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}


@dataclass
class Element:
    tag: str
    attrs: dict = field(default_factory=dict)
    children: list = field(default_factory=list)
    parent: object = None

    def text(self):
        return "".join(child.text() if isinstance(child, Element) else child for child in self.children)

    def elements(self):
        yield self
        for child in self.children:
            if isinstance(child, Element):
                yield from child.elements()

    def within(self, tag=None, css_class=None):
        current = self.parent
        while current:
            if (tag and current.tag == tag) or (css_class and css_class in current.attrs.get("class", "").split()):
                return current
            current = current.parent
        return None


class Document(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.root = Element("document")
        self.stack = [self.root]
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        element = Element(tag, dict(attrs), parent=self.stack[-1])
        self.stack[-1].children.append(element)
        if tag not in VOID:
            self.stack.append(element)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                del self.stack[index:]
                break

    def handle_data(self, data):
        self.stack[-1].children.append(data)


def source_id(anchor):
    if any(element.tag in {"code", "pre"} for element in anchor.elements()):
        return None
    match = SOURCE_LABEL.fullmatch(anchor.text().strip())
    return match[1] if match else None


def expected_citations(markdown):
    """Count source identities before the numeric renderer runs, including notes."""
    html = Markdown(extensions=["meta", "footnotes", "tables", "pymdownx.superfences", "pymdownx.details"]).convert(markdown)
    root = Document(html).root
    notes = {item.attrs["id"]: item for item in root.elements() if item.tag == "li" and item.attrs.get("id", "").startswith("fn:")}
    reachable = set()
    def visit_references(container):
        for link in container.elements():
            if link.tag != "a" or "footnote-ref" not in link.attrs.get("class", "").split():
                continue
            target = link.attrs.get("href", "").removeprefix("#")
            if target in notes and target not in reachable:
                reachable.add(target)
                visit_references(notes[target])
    for element in root.children:
        if isinstance(element, Element) and "footnote" not in element.attrs.get("class", "").split():
            visit_references(element)
    redundant = {}
    for item in root.elements():
        identity = item.attrs.get("id", "").removeprefix("fn:")
        if item.tag != "li" or not re.fullmatch(r"SRC-\d{3,}", identity):
            continue
        children = [child for child in item.children if isinstance(child, Element)]
        if len(children) != 1 or children[0].tag != "p":
            continue
        paragraph = children[0]
        links = [child for child in paragraph.children if isinstance(child, Element) and child.tag == "a" and "footnote-backref" not in child.attrs.get("class", "").split()]
        other = [child for child in paragraph.children if isinstance(child, Element) and child.tag != "a"]
        prose = "".join(child for child in paragraph.children if isinstance(child, str)).strip(". \n\t\r\u00a0")
        if len(links) == 1 and not other and not prose and source_id(links[0]) == identity:
            redundant["#" + item.attrs["id"]] = item
    expected = []
    removed = {id(item) for item in redundant.values()} | {id(item) for name, item in notes.items() if name not in reachable}
    for anchor in root.elements():
        if anchor.tag != "a" or anchor.within(tag="code") or anchor.within(tag="pre") or any(element.tag in {"code", "pre"} for element in anchor.elements()):
            continue
        current = anchor.parent
        if any(id(parent) in removed for parent in ancestors(current)):
            continue
        identity = source_id(anchor)
        if identity:
            expected.append(identity)
        elif "footnote-ref" in anchor.attrs.get("class", "").split() and anchor.attrs.get("href") in redundant:
            expected.append(redundant[anchor.attrs["href"]].attrs["id"].removeprefix("fn:"))
    return expected


def ancestors(element):
    while element:
        yield element
        element = element.parent


def route_for_markdown(source, docs_dir):
    relative = source.relative_to(docs_dir).with_suffix("").as_posix()
    return "/" + (relative[:-5] if source.name == "index.md" else relative + "/")


def inspect_page(html, expected, route, register_route, registered):
    root = Document(html).root
    errors = []
    actual = []
    groups = set()
    for anchor in root.elements():
        if anchor.tag != "a" or anchor.within(tag="code") or anchor.within(tag="pre") or any(element.tag in {"code", "pre"} for element in anchor.elements()):
            continue
        label = anchor.text().strip()
        href = anchor.attrs.get("href", "")
        if not (source_id(anchor) or anchor.attrs.get("data-source-id") or (re.fullmatch(r"\d{3,}", label) and re.search(r"#src-\d", href))):
            continue
        identity = anchor.attrs.get("data-source-id", "")
        target = urlsplit(urljoin("https://citation.invalid" + route, href))
        parent = anchor.parent
        if identity not in registered or label != identity.removeprefix("SRC-"):
            errors.append(f"citation needs its registered numeric identity: {label!r}")
        actual.append(identity)
        if parent.tag != "sup" or "source-citations" not in parent.attrs.get("class", "").split():
            errors.append(f"{identity or label} is not a numeric superscript citation")
        else:
            groups.add(id(parent))
        if anchor.attrs.get("aria-label") != f"Source {identity}" or anchor.attrs.get("tabindex", "0") != "0":
            errors.append(f"{identity} needs a full accessible source name and native keyboard focus")
        if target.netloc != "citation.invalid" or unquote(target.path) != register_route or target.fragment != identity.lower():
            errors.append(f"{identity} does not target its exact mapped source-register row: {href}")
    for group in root.elements():
        if id(group) not in groups:
            continue
        links = [child for child in group.children if isinstance(child, Element) and child.tag == "a"]
        if group.text().strip() != ", ".join(link.attrs.get("data-source-id", "").removeprefix("SRC-") for link in links):
            errors.append("adjacent source citations must use comma-and-space separators in authored order")
    if actual != expected:
        errors.append(f"canonical citation sequence differs: expected {expected}, found {actual}")
    return errors


def inspect_register(html, identities):
    """Every referenced fragment must identify exactly one matching table row."""
    root = Document(html).root
    errors = []
    for identity in sorted(set(identities)):
        anchors = [element for element in root.elements() if element.attrs.get("id") == identity.lower()]
        if len(anchors) != 1:
            errors.append(f"{identity} needs exactly one built source-register anchor; found {len(anchors)}")
            continue
        anchor = anchors[0]
        row = anchor if anchor.tag == "tr" else anchor.within(tag="tr")
        cells = [] if row is None else [child for child in row.children if isinstance(child, Element) and child.tag in {"td", "th"}]
        if not any(cell.text().strip() == identity for cell in cells):
            errors.append(f"{identity} anchor does not belong to its exact source-register row")
    return errors


def inspect_site(root, site_dir="site"):
    root = Path(root).resolve()
    manifest = yaml.safe_load((root / ".wiki-standard.yaml").read_text())
    if manifest.get("capabilities", {}).get("source_citation_style") != "numeric-superscript":
        raise ValueError("DKBWS-LINK-002: source_citation_style must explicitly select numeric-superscript")
    configuration = tomllib.loads((root / "zensical.toml").read_text())["project"]
    extensions = configuration.get("markdown_extensions", {})
    if "footnotes" not in extensions or extensions.get("source_citations", {}).get("register_file") != manifest["roles"]["source_register"]:
        raise ValueError("DKBWS-LINK-002: enable footnotes and source_citations with the exact mapped source register")
    docs = root / configuration.get("docs_dir", "docs")
    register = root / manifest["roles"]["source_register"]
    registered = set(re.findall(r"^\|\s*(SRC-\d{3,})\s*\|", register.read_text(), re.M))
    register_route = route_for_markdown(register, docs)
    site = root / site_dir
    rows = []
    errors = []
    expected_by_route = {}
    for source in sorted(docs.rglob("*.md")):
        if "assets" in source.relative_to(docs).parts:
            continue
        route = route_for_markdown(source, docs)
        expected = expected_citations(source.read_text())
        expected_by_route[route] = expected
        target = site / route.lstrip("/") / "index.html"
        if not target.is_file():
            if expected:
                errors.append(f"{source.relative_to(root)}: citation-bearing route is missing: {route}")
            continue
        issues = inspect_page(target.read_text(), expected, route, register_route, registered)
        errors.extend(f"{route}: {issue}" for issue in issues)
        if expected:
            rows.append({"route": route, "count": len(expected), "identities": expected})
    referenced = {identity for expected in expected_by_route.values() for identity in expected}
    register_html = site / register_route.lstrip("/") / "index.html"
    if referenced:
        if not register_html.is_file():
            errors.append(f"built source register is missing: {register_route}")
        else:
            errors.extend(inspect_register(register_html.read_text(), referenced))
    # Extra generated HTML must not introduce unaccounted citations either.
    for target in sorted(site.rglob("*.html")):
        relative = target.relative_to(site).as_posix()
        route = "/" + (relative[:-10] if relative.endswith("index.html") else relative)
        if route not in expected_by_route:
            errors.extend(f"{route}: {issue}" for issue in inspect_page(target.read_text(), [], route, register_route, registered))
    if not site.is_dir():
        errors.append(f"built site is missing: {site_dir}")
    return {"ok": not errors, "pages": len(expected_by_route), "citations": sum(row["count"] for row in rows), "routes": rows, "errors": errors}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    parser.add_argument("--site", default="site")
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--output", help="Optional derived JSON report; failed scans replace stale success")
    args = parser.parse_args()
    try:
        result = inspect_site(args.root, args.site)
    except (ValueError, OSError, KeyError) as error:
        result = {"ok": False, "errors": [str(error)]}
    if args.output:
        output = Path(args.output)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(result, indent=2) + "\n")
    if args.json:
        print(json.dumps(result))
    elif result["ok"]:
        print(f"Built citations passed: {result['citations']} source links across {len(result['routes'])} citation-bearing routes; {result['pages']} canonical pages checked.")
    else:
        print("Built citations failed:\n- " + "\n- ".join(result["errors"]), file=sys.stderr)
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
