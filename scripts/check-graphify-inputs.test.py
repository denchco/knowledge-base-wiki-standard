"""Regression checks for the reference Graphify input boundary."""

from contextlib import contextmanager
import importlib.util
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch


SCRIPT = Path(__file__).with_name("graphify-update.py")
SPEC = importlib.util.spec_from_file_location("graphify_update", SCRIPT)
adapter = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(adapter)


@contextmanager
def corpus():
    with tempfile.TemporaryDirectory(prefix="dkbws-graphify-inputs-") as name:
        root = Path(name).resolve()
        previous = Path.cwd()
        os.chdir(root)
        try:
            yield root
        finally:
            os.chdir(previous)


class GraphifyInputTests(unittest.TestCase):
    def test_benign_in_corpus_files_pass_without_reading_contents(self):
        with corpus() as root:
            (root / "module.py").write_text("def qualified_example():\n    return 1\n")
            (root / "notes.md").write_text("# Reference notes\n")
            (root / "plain.f90").write_text("program example\nend program\n")
            with patch.object(Path, "read_bytes", side_effect=AssertionError("unexpected read")):
                self.assertEqual(adapter.preflight(root), 3)

    def test_all_preprocessed_suffixes_fail_before_update(self):
        for suffix in adapter.PREPROCESSED_SUFFIXES:
            with self.subTest(suffix=suffix), corpus() as root:
                (root / f"example{suffix}").write_text("program example\nend program\n")
                with patch("importlib.import_module", wraps=adapter.importlib.import_module) as load:
                    with self.assertRaisesRegex(adapter.UnsupportedGraphifyInput, "preprocessed Fortran"):
                        adapter.run_update(root)
                    self.assertNotIn("graphify.__main__", [call.args[0] for call in load.call_args_list])
                self.assertFalse((root / "graphify-out").exists())

    def test_ignore_rules_hidden_inputs_and_option_like_names_cannot_bypass_preflight(self):
        for relative in (".hidden/example.F", "ignored/example.F90", "-include.F95"):
            with self.subTest(path=relative), corpus() as root:
                candidate = root / relative
                candidate.parent.mkdir(parents=True, exist_ok=True)
                candidate.write_text("program example\nend program\n")
                (root / ".gitignore").write_text("*\n")
                (root / ".graphifyignore").write_text("*\n")
                with self.assertRaisesRegex(adapter.UnsupportedGraphifyInput, "preprocessed Fortran"):
                    adapter.preflight(root)

    def test_file_directory_broken_and_traversing_symlinks_fail(self):
        for target in ("plain.py", "nested", "missing.F90", "../outside.F90"):
            with self.subTest(target=target), corpus() as root:
                (root / "plain.py").write_text("pass\n")
                (root / "nested").mkdir()
                (root / "alias.py").symlink_to(target)
                with self.assertRaisesRegex(adapter.UnsupportedGraphifyInput, "symlinks"):
                    adapter.preflight(root)

    def test_runtime_paths_cannot_escape_the_corpus(self):
        with corpus() as root:
            for candidate in (root / "../outside.py", root.parent / "outside.py"):
                with self.subTest(path=candidate):
                    with self.assertRaisesRegex(adapter.UnsupportedGraphifyInput, "leaves the corpus"):
                        adapter.check_path(root, candidate)

    def test_unconditional_dependency_directories_are_not_corpus_inputs(self):
        with corpus() as root:
            for directory in adapter.EXCLUDED_DIRECTORIES:
                (root / directory).mkdir()
                (root / directory / "unsupported.F90").write_text("program example\nend program\n")
            self.assertEqual(adapter.preflight(root), 0)
            # Linked dependency directories remain outside the corpus.
            (root / ".venv" / "unsupported.F90").unlink()
            (root / ".venv").rmdir()
            (root / ".venv").symlink_to("venv")
            self.assertEqual(adapter.preflight(root), 0)
            # A broken alias cannot establish the directory exclusion.
            (root / ".venv").unlink()
            (root / ".venv").symlink_to("../elsewhere")
            with self.assertRaisesRegex(adapter.UnsupportedGraphifyInput, "symlinks"):
                adapter.preflight(root)

    @unittest.skipUnless(hasattr(os, "mkfifo"), "named pipes are unavailable")
    def test_nonregular_files_fail_without_opening_them(self):
        with corpus() as root:
            os.mkfifo(root / "pipe.py")
            with self.assertRaisesRegex(adapter.UnsupportedGraphifyInput, "non-regular"):
                adapter.preflight(root)

    def test_unknown_version_or_changed_preprocessing_contract_fails(self):
        with patch("importlib.metadata.version", return_value="0.9.55"):
            with self.assertRaisesRegex(adapter.UnsupportedGraphifyInput, "expected graphifyy"):
                adapter.qualified_modules()
        fortran, _ = adapter.qualified_modules()
        with patch.object(fortran, "_FORTRAN_CPP_EXTS", {".F", ".new"}):
            with self.assertRaisesRegex(adapter.UnsupportedGraphifyInput, "qualified contract"):
                adapter.qualified_modules()

    def test_runtime_guard_blocks_late_input_and_never_starts_preprocessing(self):
        # Run separately so runtime patches cannot leak into another test.
        code = """
import importlib.util
from pathlib import Path
import subprocess
from unittest.mock import patch
spec = importlib.util.spec_from_file_location("adapter", SCRIPT)
adapter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(adapter)
root = Path.cwd()
modules = adapter.qualified_modules()
adapter.preflight(root)
adapter.install_runtime_guard(root, modules)
late = root / "late.F90"
late.write_text("program example\\nend program\\n")
with patch.object(subprocess, "run", side_effect=AssertionError("preprocessor started")):
    for attempt in (
        lambda: modules[0]._cpp_preprocess(late),
        lambda: modules[1]._cpp_preprocess(late),
        lambda: modules[1]._DISPATCH[".F90"](late),
        lambda: modules[1]._get_extractor(late),
    ):
        try:
            attempt()
        except adapter.UnsupportedGraphifyInput:
            pass
        else:
            raise AssertionError("unsupported input passed")
assert modules[1]._extract_parallel(None, None, None, None, None) is False
"""
        with corpus() as root:
            result = subprocess.run(
                [sys.executable, "-I", "-B", "-c", f"SCRIPT = {str(SCRIPT)!r}\n{code}"],
                cwd=root, capture_output=True, text=True, check=False,
            )
            self.assertEqual(result.returncode, 0, result.stderr)

    def test_real_benign_update_preserves_graph_extraction(self):
        with corpus() as root:
            (root / "example.py").write_text("def qualified_example():\n    return 1\n")
            # Exceed the upstream parallel threshold while requesting workers.
            for number in range(21):
                (root / f"example_{number}.py").write_text(
                    f"def sample_{number}():\n    return {number}\n"
                )
            for name in adapter.ADAPTER_EXCLUDED_DIRECTORIES:
                directory = root / name
                directory.mkdir()
                (directory / "excluded.F90").write_text("program excluded\nend program\n")
                (directory / ".graphifyignore").write_text("!*\n")
            (root / ".graphifyignore").write_text("!*\n")
            result = subprocess.run(
                [sys.executable, "-I", "-B", str(SCRIPT)],
                cwd=root, capture_output=True, text=True, check=False, timeout=60,
                env={**os.environ, "GRAPHIFY_OUT": "../forbidden-output", "GRAPHIFY_MAX_WORKERS": "8"},
            )
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            graph = root / "graphify-out/graph.json"
            self.assertTrue(graph.is_file(), result.stdout)
            self.assertIn("qualified_example", graph.read_text())
            self.assertNotIn("excluded.F90", graph.read_text())

    def test_unisolated_cli_fails_before_graphify_import_or_update(self):
        with corpus() as root:
            result = subprocess.run(
                [sys.executable, "-B", str(SCRIPT)], cwd=root,
                capture_output=True, text=True, check=False,
            )
            self.assertEqual(result.returncode, 1, result.stderr)
            self.assertIn("Python -I", result.stderr)
            self.assertFalse((root / "graphify-out").exists())

    def test_cli_has_no_extra_root_or_argument_passthrough(self):
        with corpus() as root:
            for args in (["../elsewhere"], ["--include", "../elsewhere"], ["--out", "../elsewhere"]):
                with self.subTest(args=args):
                    result = subprocess.run(
                        [sys.executable, "-I", "-B", str(SCRIPT), *args],
                        cwd=root, capture_output=True, text=True, check=False,
                    )
                    self.assertEqual(result.returncode, 2, result.stderr)
                    self.assertFalse((root / "graphify-out").exists())


if __name__ == "__main__":
    unittest.main()
