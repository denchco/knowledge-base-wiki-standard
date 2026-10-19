import unittest
import xml.etree.ElementTree as ET
from pathlib import Path
from tempfile import TemporaryDirectory
from markdown import Markdown
from source_citations import SourceCitationsExtension
from check_rendered_source_citations import expected_citations, inspect_page, inspect_register, inspect_site


def render(text):
    extension = SourceCitationsExtension(register_file="", source_ids=["SRC-002", "SRC-023", "SRC-120"])
    return Markdown(extensions=["footnotes", "tables", "meta", extension]).convert(text)


class CitationRendering(unittest.TestCase):
    def test_number_identity_grouping_and_repeat(self):
        html = render("Claim [SRC-120](../sources.md#src-120), [SRC-002](../sources.md#src-002). Again [SRC-120](../sources.md#src-120).")
        root = ET.fromstring(f"<div>{html}</div>")
        groups = root.findall(".//sup")
        self.assertEqual(["".join(group.itertext()) for group in groups], ["120, 002", "120"])
        self.assertEqual(groups[0][1].get("href"), "../sources.md#src-002")
        self.assertEqual(groups[0][1].get("aria-label"), "Source SRC-002")

    def test_source_footnotes_remove_only_redundant_list(self):
        html = render("Claim.[^SRC-120][^SRC-002] Again.[^SRC-120]\n\n[^SRC-120]: [SRC-120](../sources.md#src-120).\n[^SRC-002]: [SRC-002: Source title](../sources.md#src-002).\n[^SRC-023]: [SRC-023](../sources.md#src-023).")
        self.assertIn('>120</a>, <a ', html)
        self.assertEqual(html.count('data-source-id="SRC-120"'), 2)
        self.assertNotIn('class="footnote"', html)
        self.assertNotIn('href="#fn:', html)
        self.assertNotIn("SRC-023", html)

    def test_ordinary_and_explanatory_notes_survive(self):
        html = render("Claim.[^SRC-120][^note][^SRC-002]\n\n[^SRC-120]: [SRC-120](sources.md#src-120).\n[^note]: Explanation.\n[^SRC-002]: [SRC-002](sources.md#src-002).\n\n    Keep this qualification.")
        self.assertIn("Explanation.", html)
        self.assertIn("Keep this qualification.", html)
        self.assertIn('id="fn:SRC-002"', html)
        self.assertNotIn('id="fn:SRC-120"', html)

    def test_source_references_in_nested_explanatory_notes_keep_working_destinations(self):
        html = render("""Claim.[^note][^SRC-002]

[^note]: Explanation cites a source.[^SRC-120] More detail.[^detail]

    A second paragraph repeats the citation.[^SRC-120]

[^detail]: *Nested qualification.[^SRC-120]* Direct [SRC-023](sources.md#src-023).
[^SRC-002]: [SRC-002](sources.md#src-002). Keep this qualification.[^SRC-120]
[^SRC-120]: [SRC-120](sources.md#src-120).
""")
        root = ET.fromstring(f"<div>{html}</div>")
        ids = {element.get("id") for element in root.iter() if element.get("id")}
        self.assertTrue({"fn:note", "fn:detail", "fn:SRC-002"}.issubset(ids))
        self.assertNotIn("fn:SRC-120", ids)
        for link in root.iter("a"):
            href = link.get("href", "")
            if href.startswith("#"):
                self.assertIn(href[1:], ids, f"Dangling explanatory footnote link: {href}")
        citations = root.findall('.//a[@data-source-id="SRC-120"]')
        self.assertEqual(len(citations), 4)
        self.assertTrue(all(link.get("href") == "sources.md#src-120" for link in citations))
        self.assertTrue(all(link.get("aria-label") == "Source SRC-120" for link in citations))
        self.assertIn("Nested qualification.", "".join(root.find('.//li[@id="fn:detail"]//em').itertext()))
        self.assertIn("Keep this qualification.", "".join(root.find('.//li[@id="fn:SRC-002"]').itertext()))
        self.assertEqual(len(root.findall('.//li[@id="fn:note"]/p')), 2)
        self.assertIsNotNone(root.find('.//li[@id="fn:detail"]//a[@data-source-id="SRC-023"]'))

    def test_code_and_escaped_examples_are_not_citations(self):
        html = render("---\ntitle: Example SRC-120\n---\n\n`[SRC-120](sources.md#src-120)`\n\n    [SRC-002](sources.md#src-002)\n\n\\[SRC-023] is literal.")
        self.assertNotIn("source-citations", html)
        self.assertIn("<code>", html)
        labelled = '[`SRC-002`](sources.md#src-002)'
        self.assertNotIn("source-citations", render(labelled))
        self.assertEqual(expected_citations(labelled), [])

    def test_unused_explanatory_definitions_do_not_create_claims_or_dangling_backlinks(self):
        source = "No claim citation.\n\n[^unused]: Unused explanation.[^SRC-120]\n[^SRC-002]: [SRC-002](sources.md#src-002). Keep this qualification.\n[^SRC-120]: [SRC-120](sources.md#src-120)."
        html = render(source)
        self.assertNotIn("source-citations", html)
        self.assertNotIn("fnref", html)
        self.assertEqual(expected_citations(source), [])

    def test_tables_and_punctuation(self):
        html = render("| Case | Evidence |\n|---|---|\n| Example | [SRC-120](sources.md#src-120)[SRC-002](sources.md#src-002); [SRC-023](sources.md#src-023) |")
        root = ET.fromstring(f"<div>{html}</div>")
        self.assertEqual(["".join(s.itertext()) for s in root.findall(".//sup")], ["120, 002", "023"])
        self.assertIn("</sup>; ", html)

    def test_wrong_unknown_or_external_identity_fails_closed(self):
        for text in ["[SRC-999](sources.md#src-999)", "[SRC-120](sources.md#src-002)", "[SRC-120](https://example.test/#src-120)", "Claim.[^SRC-120]\n\n[^SRC-120]: [SRC-002](sources.md#src-002)."]:
            with self.subTest(text=text), self.assertRaisesRegex(ValueError, "DKBWS-LINK-002"):
                render(text)


class BuiltCitationAccounting(unittest.TestCase):
    def test_every_built_fragment_belongs_to_exactly_one_matching_register_row(self):
        html = '<table><tr><td>SRC-002</td><td><span id="src-002"></span>Source two</td></tr><tr><td>SRC-120</td><td><span id="src-120"></span>Source 120</td></tr></table>'
        self.assertEqual(inspect_register(html, {"SRC-002", "SRC-120"}), [])
        mutations = [html.replace('id="src-002"', ''), html.replace('id="src-002"', 'id="src-120"'), html.replace('<td>SRC-002</td>', '<td>SRC-023</td>'), html + '<span id="src-002"></span>', '<span id="src-002"></span>']
        for changed in mutations:
            with self.subTest(changed=changed):
                self.assertTrue(inspect_register(changed, {"SRC-002", "SRC-120"}))

    def test_missing_renderer_configuration_fails_even_without_visible_citations(self):
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / ".wiki-standard.yaml").write_text('capabilities: {source_citation_style: numeric-superscript}\nroles: {source_register: docs/sources.md}\n')
            (root / "zensical.toml").write_text('[project]\ndocs_dir = "docs"\n')
            with self.assertRaisesRegex(ValueError, "enable footnotes and source_citations"):
                inspect_site(root)

    def test_all_citations_match_canonical_order_and_keep_range_endpoints(self):
        source = "Claim [SRC-120](sources.md#src-120), [SRC-002](sources.md#src-002); range [SRC-002](sources.md#src-002)–[SRC-023](sources.md#src-023). Again [SRC-120](sources.md#src-120)."
        expected = expected_citations(source)
        self.assertEqual(expected, ["SRC-120", "SRC-002", "SRC-002", "SRC-023", "SRC-120"])
        html = render(source).replace("sources.md#", "/sources/#")
        self.assertEqual(inspect_page(html, expected, "/", "/sources/", set(expected)), [])

    def test_missing_adapter_bracketed_links_deleted_links_and_wrong_targets_fail(self):
        source = "Claim [SRC-120](sources.md#src-120). Then [SRC-002](sources.md#src-002)."
        expected = expected_citations(source)
        html = render(source).replace("sources.md#", "/sources/#")
        ordinary = Markdown().convert(source).replace("sources.md#", "/sources/#")
        mutations = [ordinary, "<p>All citation links deleted.</p>", html.replace('class="source-citations"', ''), html.replace('data-source-id="SRC-002"', ''), html.replace('/sources/#src-002', '/wrong/#src-002'), html.replace('Source SRC-002', 'Source SRC-120')]
        for changed in mutations:
            with self.subTest(changed=changed):
                self.assertTrue(inspect_page(changed, expected, "/", "/sources/", set(expected)))

    def test_repeated_source_notes_and_explanatory_notes_are_accounted_independently(self):
        source = "Claim.[^SRC-120][^note] Again.[^SRC-120]\n\n[^SRC-120]: [SRC-120](sources.md#src-120).\n[^note]: Keep this explanation and [SRC-002](sources.md#src-002).\n[^SRC-023]: [SRC-023](sources.md#src-023)."
        expected = expected_citations(source)
        self.assertEqual(expected, ["SRC-120", "SRC-120", "SRC-002"])
        html = render(source).replace("sources.md#", "/sources/#")
        self.assertEqual(inspect_page(html, expected, "/", "/sources/", set(expected)), [])
        self.assertIn("Keep this explanation", html)

    def test_source_register_row_identities_and_code_are_not_invented_citations(self):
        source = '| ID | Source |\n|---|---|\n| SRC-002 | <span id="src-002"></span>Registered source |\n\n`[SRC-120](sources.md#src-120)`'
        self.assertEqual(expected_citations(source), [])
        html = render(source)
        self.assertIn('id="src-002"', html)
        self.assertIn("SRC-002", html)
        self.assertNotIn("source-citations", html)
        self.assertEqual(inspect_page(html, [], "/sources/", "/sources/", {"SRC-002"}), [])
        navigation = '<p>Read <a href="/sources/#src-002">the source register</a>.</p>'
        self.assertEqual(inspect_page(navigation, [], "/", "/sources/", {"SRC-002"}), [])


if __name__ == "__main__":
    unittest.main()
