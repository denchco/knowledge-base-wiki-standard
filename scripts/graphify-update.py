"""Run the qualified Graphify update with no Fortran preprocessing.

This reference adapter supports regular files inside the current corpus.
Preprocessed Fortran and corpus symlinks are outside its qualified input set.
The preflight is independent of mutable ignore rules. The runtime guard also
rejects preprocessing if inputs change after preflight. This is not a sandbox
or a security qualification of arbitrary Graphify commands or hostile code.
"""

import argparse
import importlib
import importlib.metadata
import os
from pathlib import Path
import stat
import sys


QUALIFIED_VERSION = "0.9.70"
PREPROCESSED_SUFFIXES = frozenset({".F", ".F90", ".F95", ".F03", ".F08"})
# These exact directory names are unconditional exclusions in the qualified
# upstream detector. Ignore files cannot expand this adapter's input boundary.
UPSTREAM_EXCLUDED_DIRECTORIES = frozenset({
    ".git", ".venv", "venv", "node_modules", "__pycache__", ".cache",
    "graphify-out",
})
ADAPTER_EXCLUDED_DIRECTORIES = frozenset({".jj", "output", "site", "site-local"})
EXCLUDED_DIRECTORIES = UPSTREAM_EXCLUDED_DIRECTORIES | ADAPTER_EXCLUDED_DIRECTORIES


class UnsupportedGraphifyInput(SystemExit):
    """Abort the whole update, including upstream Exception recovery paths."""


def refuse(message):
    raise UnsupportedGraphifyInput(f"Graphify input guard failed: {message}")


def check_path(root, candidate):
    """Reject traversal, symlink aliases and preprocessed Fortran paths."""
    root = Path(root).resolve(strict=True)
    candidate = Path(os.path.abspath(candidate))
    try:
        parts = candidate.relative_to(root).parts
    except ValueError:
        refuse("an input path leaves the corpus")
    current = root
    for part in parts:
        current /= part
        try:
            mode = current.lstat().st_mode
        except OSError as error:
            refuse(f"cannot inspect input {str(candidate.relative_to(root))!r}: {error}")
        if stat.S_ISLNK(mode):
            refuse(f"corpus symlinks are unsupported: {str(current.relative_to(root))!r}")
    if candidate.suffix in PREPROCESSED_SUFFIXES:
        refuse(f"preprocessed Fortran is unsupported: {str(candidate.relative_to(root))!r}")
    return candidate


def preflight(root):
    """Inspect names and file types without opening corpus file contents."""
    root = Path(root).resolve(strict=True)
    checked = 0

    def visit(directory):
        nonlocal checked
        try:
            entries = sorted(directory.iterdir())
        except OSError as error:
            refuse(f"cannot inspect a corpus directory: {error}")
        for entry in entries:
            # The detector prunes these directory names before following their
            # contents. This also permits a linked dependency environment.
            if entry.name in EXCLUDED_DIRECTORIES and entry.is_dir():
                continue
            check_path(root, entry)
            mode = entry.lstat().st_mode
            if stat.S_ISDIR(mode):
                visit(entry)
            elif stat.S_ISREG(mode):
                checked += 1
            else:
                refuse(f"non-regular inputs are unsupported: {str(entry.relative_to(root))!r}")

    visit(root)
    return checked


def qualified_modules():
    """Fail closed when the installed version or guarded upstream API changes."""
    actual = importlib.metadata.version("graphifyy")
    if actual != QUALIFIED_VERSION:
        refuse(f"expected graphifyy {QUALIFIED_VERSION}, found {actual}")
    detector = importlib.import_module("graphify.detect")
    fortran = importlib.import_module("graphify.extractors.fortran")
    extractor = importlib.import_module("graphify.extract")
    if (
        fortran._FORTRAN_CPP_EXTS != PREPROCESSED_SUFFIXES
        or not UPSTREAM_EXCLUDED_DIRECTORIES.issubset(detector._SKIP_DIRS)
        or not callable(fortran._cpp_preprocess)
        or not callable(extractor._get_extractor)
        or not callable(extractor._extract_parallel)
        or any(extractor._DISPATCH.get(suffix) is not fortran.extract_fortran
               for suffix in PREPROCESSED_SUFFIXES)
    ):
        refuse("the installed Graphify input API differs from the qualified contract")
    # Apply the same derived-directory boundary to the actual detector. These
    # unconditional skips cannot be reversed by nested ignore-file negations.
    detector._SKIP_DIRS.update(ADAPTER_EXCLUDED_DIRECTORIES)
    return fortran, extractor


def install_runtime_guard(root, modules):
    """Keep the guard active for the entire fixed, in-process update."""
    fortran, extractor = modules

    def no_preprocessing(*_args, **_kwargs):
        refuse("Fortran preprocessing is disabled by the reference adapter")

    original_get_extractor = extractor._get_extractor

    def guarded_get_extractor(candidate):
        check_path(root, candidate)
        return original_get_extractor(candidate)

    # SystemExit is intentional: upstream converts ordinary extraction errors
    # to partial graph results, which must not make an unsupported input pass.
    fortran._cpp_preprocess = no_preprocessing
    extractor._cpp_preprocess = no_preprocessing
    for suffix in PREPROCESSED_SUFFIXES:
        extractor._DISPATCH[suffix] = no_preprocessing
    extractor._get_extractor = guarded_get_extractor
    # Spawned workers would import unguarded upstream modules. A false return
    # selects the qualified upstream sequential extraction path in this process.
    extractor._extract_parallel = lambda *_args, **_kwargs: False


def run_update(root, *, check_only=False):
    root = Path(root).resolve(strict=True)
    if root != Path.cwd().resolve(strict=True):
        refuse("the corpus must be the current working directory")
    # Set before importing graphify.paths. The adapter has no output override
    # or arbitrary CLI passthrough and never invokes the shell.
    os.environ["GRAPHIFY_OUT"] = "graphify-out"
    os.environ["GRAPHIFY_NO_AUTO_REFRESH"] = "1"
    modules = qualified_modules()
    count = preflight(root)
    print(f"Graphify input guard passed: {count} regular files; graphifyy {QUALIFIED_VERSION}",
          flush=True)
    if check_only:
        return
    install_runtime_guard(root, modules)
    cli = importlib.import_module("graphify.__main__")
    if not callable(getattr(cli, "_run_cli", None)):
        refuse("the installed Graphify command API differs from the qualified contract")
    sys.argv = ["graphify", "update", ".", "--force"]
    # The public entry point may re-exec an unguarded `python -m graphify` to
    # set a hash seed. Invoke the qualified dispatcher in this process instead.
    cli._run_cli()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="check inputs without updating the graph")
    args = parser.parse_args()
    if not sys.flags.isolated:
        refuse("invoke this adapter with Python -I to isolate its module imports")
    try:
        run_update(Path.cwd(), check_only=args.check)
    except (OSError, importlib.metadata.PackageNotFoundError, AttributeError) as error:
        refuse(str(error))


if __name__ == "__main__":
    main()
