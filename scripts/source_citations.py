"""Derived numeric source citations for the pinned Python-Markdown renderer.

Canonical Markdown, source IDs and evidence are never rewritten. Work on the
parsed tree so code, escaped examples and ordinary explanatory notes survive.
"""
from copy import deepcopy
from pathlib import Path
import re
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET

from markdown.extensions import Extension
from markdown.extensions.footnotes import NBSP_PLACEHOLDER
from markdown.treeprocessors import Treeprocessor

SOURCE = re.compile(r"SRC-\d{3,}")


class SourceCitations(Treeprocessor):
    def __init__(self, md, registered):
        super().__init__(md)
        self.registered = registered

    def identity(self, link):
        if any(element.tag in {"code", "pre"} for element in link.iter()):
            return None
        label = "".join(link.itertext()).strip()
        match = re.fullmatch(r"(SRC-\d{3,})(?:: .+)?", label)
        if not match:
            return None
        identity = match[1]
        target = urlsplit(link.get("href", ""))
        if identity not in self.registered:
            raise ValueError(f"DKBWS-LINK-002-UNKNOWN: {identity}")
        if target.scheme or target.netloc or not target.path or target.fragment != identity.lower():
            raise ValueError(f"DKBWS-LINK-002-FRAGMENT: {identity} needs its internal source-row link")
        return identity

    def citation(self, link, identity):
        result = ET.Element("sup", {"class": "source-citations"})
        anchor = ET.SubElement(result, "a", {
            "href": link.get("href"), "data-source-id": identity,
            "aria-label": f"Source {identity}", "title": f"Source {identity}",
        })
        anchor.text = identity[4:]
        return result

    def run(self, root):
        # Python-Markdown emits unused definitions too. Keep only notes reachable
        # from a real reference, including references nested in retained notes.
        notes = {item.get("id"): item for div in root.findall('.//div[@class="footnote"]') for item in div.findall("./ol/li")}
        note_elements = {element for item in notes.values() for element in item.iter()}
        pending = [link.get("href", "")[1:] for link in root.iter("a") if link not in note_elements and link.get("class") == "footnote-ref"]
        reached = set()
        while pending:
            target = pending.pop()
            if target in reached or target not in notes:
                continue
            reached.add(target)
            pending.extend(link.get("href", "")[1:] for link in notes[target].iter("a") if link.get("class") == "footnote-ref")
        for div in root.findall('.//div[@class="footnote"]'):
            for ordered in div.findall("ol"):
                for item in list(ordered):
                    if item.get("id") not in reached:
                        ordered.remove(item)
        definitions = {}
        # Only a source link plus punctuation/backlinks is a redundant note.
        for div in root.findall('.//div[@class="footnote"]'):
            ordered = div.find("ol")
            if ordered is None:
                continue
            for item in list(ordered):
                identity = item.get("id", "").split(":")[-1]
                if not SOURCE.fullmatch(identity) or len(item) != 1 or item[0].tag != "p":
                    continue
                paragraph = item[0]
                children = list(paragraph)
                links = [child for child in children if child.tag == "a" and child.get("class") != "footnote-backref"]
                if len(links) != 1 or any(child.tag != "a" for child in children):
                    continue
                remainder = (paragraph.text or "") + "".join(child.tail or "" for child in children)
                if remainder.replace(NBSP_PLACEHOLDER, "").strip(". \n\t\r\u00a0"):
                    continue
                link = links[0]
                if self.identity(link) != identity:
                    raise ValueError(f"DKBWS-LINK-002-FOOTNOTE: {identity} definition names a different source")
                definitions["#" + item.get("id")] = (identity, link)
                ordered.remove(item)
            if not len(ordered):
                for parent in root.iter():
                    if div in list(parent):
                        parent.remove(div)
                        break

        # Surviving explanatory notes can also cite removed source definitions.
        # Transform those references just like body citations, retaining the
        # notes' prose, structure, own references and backlinks.
        for parent in list(root.iter()):
            if parent.tag in ("a", "code", "pre", "sup"):
                continue
            for index, child in enumerate(list(parent)):
                replacement = None
                if child.tag == "a" and re.fullmatch(r"SRC-\d{3,}(?:: .+)?", "".join(child.itertext()).strip()):
                    identity = self.identity(child)
                    if identity:
                        replacement = self.citation(child, identity)
                elif child.tag == "sup" and len(child) == 1:
                    reference = child[0]
                    definition = definitions.get(reference.get("href"))
                    if reference.get("class") == "footnote-ref" and definition:
                        identity, link = definition
                        replacement = self.citation(link, identity)
                if replacement is not None:
                    replacement.tail = child.tail
                    parent.remove(child)
                    parent.insert(index, replacement)
            # Keep every link independently focusable; the separator is text.
            previous = None
            for child in list(parent):
                if child.tag == "sup" and child.get("class") == "source-citations":
                    if previous is not None and re.fullmatch(r"[ \t]*(?:,[ \t]*)?", previous.tail or ""):
                        previous[-1].tail = ", "
                        for anchor in list(child):
                            previous.append(deepcopy(anchor))
                        previous.tail = child.tail
                        parent.remove(child)
                    else:
                        previous = child
                else:
                    previous = None
        return root


class SourceCitationsExtension(Extension):
    def __init__(self, **kwargs):
        self.config = {
            "register_file": ["docs/sources.md", "Mapped canonical source register"],
            "source_ids": [[], "Explicit source IDs for isolated renderer fixtures"],
        }
        super().__init__(**kwargs)

    def extendMarkdown(self, md):
        registered = set(self.getConfig("source_ids"))
        register_file = self.getConfig("register_file")
        if register_file:
            registered.update(re.findall(r"^\|\s*(SRC-\d{3,})\s*\|", Path(register_file).read_text(), re.M))
        md.treeprocessors.register(SourceCitations(md, registered), "source-citations", 4)


def makeExtension(**kwargs):
    return SourceCitationsExtension(**kwargs)
