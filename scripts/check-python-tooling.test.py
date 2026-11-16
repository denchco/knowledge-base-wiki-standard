"""Offline qualification of the frozen pip-audit cache dependency chain."""

import gc
import importlib.metadata
import json
import subprocess
import sys
import tempfile
import tracemalloc
import unittest
from datetime import datetime, timezone
from email.utils import format_datetime
from pathlib import Path
from unittest.mock import patch

import filelock
import msgpack
import requests
from cachecontrol.caches import FileCache
from cachecontrol.serialize import Serializer
# Follow pip-audit's entry-point order; importing its private cache first cycles
# through the service package while caching_session is still being defined.
import pip_audit._service  # noqa: F401
from pip_audit._cache import _SafeFileCache, caching_session
from urllib3 import HTTPResponse


class PythonToolingQualification(unittest.TestCase):
    def test_selected_dependency_versions(self):
        expected = {
            "filelock": "4.2.1", "msgpack": "1.2.3", "CacheControl": "0.14.4",
            "pip-audit": "2.10.1", "graphifyy": "0.9.70", "zensical": "0.0.59",
        }
        for name, version in expected.items():
            with self.subTest(package=name):
                self.assertEqual(importlib.metadata.version(name), version)
        self.assertEqual(msgpack.unpackb.__module__, "msgpack._cmsgpack")

    def test_pip_audit_session_cache_roundtrip_and_vary(self):
        with tempfile.TemporaryDirectory() as directory:
            with caching_session(Path(directory)) as session:
                adapter = session.get_adapter("https://example.test/")
                cache = adapter.cache
                self.assertIsInstance(cache, _SafeFileCache)
                self.assertIs(cache.lock_class, filelock.FileLock)
                request = requests.Request("GET", "https://example.test/audit", headers={"Accept": "application/json"}).prepare()
                body = b'{"vulnerabilities":[],"source":"fixture"}'
                response = HTTPResponse(status=200, body=body, preload_content=False,
                    headers={"Date": format_datetime(datetime.now(timezone.utc), usegmt=True),
                        "Cache-Control": "public, max-age=3600", "Vary": "Accept",
                        "Content-Type": "application/json", "Content-Length": str(len(body))})
                # pip-audit intentionally replaces cache files atomically without
                # invoking FileLock; the inherited constructor still imports it.
                with patch.object(cache, "lock_class", side_effect=AssertionError("unexpected lock")):
                    adapter.controller.cache_response(request, response, body=body)
                    cached = adapter.controller.cached_request(request)
                self.assertIsNot(cached, False)
                self.assertEqual(json.loads(cached.read()), json.loads(body))
                changed = requests.Request("GET", request.url, headers={"Accept": "text/plain"}).prepare()
                self.assertFalse(adapter.controller.cached_request(changed))
                cache.delete(request.url)
                self.assertIsNone(cache.get(request.url))

    def test_cachecontrol_filecache_uses_filelock_context(self):
        with tempfile.TemporaryDirectory() as directory:
            cache = FileCache(directory)
            with patch.object(cache, "lock_class", wraps=filelock.FileLock) as constructor:
                cache.set("fixture", b"first")
                cache.set("fixture", b"replacement")
            self.assertEqual(constructor.call_count, 2)
            self.assertEqual(cache.get("fixture"), b"replacement")
            cache.delete("fixture")
            self.assertIsNone(cache.get("fixture"))

    def test_filelock_excludes_a_second_process_and_releases(self):
        child = """
import sys
from filelock import FileLock, Timeout
try:
    with FileLock(sys.argv[1], timeout=0):
        print('acquired')
except Timeout:
    print('blocked')
"""
        with tempfile.TemporaryDirectory() as directory:
            lock_path = str(Path(directory) / "cache.lock")
            def attempt():
                return subprocess.run([sys.executable, "-I", "-B", "-c", child, lock_path],
                    check=True, text=True, capture_output=True, timeout=10).stdout.strip()
            with filelock.FileLock(lock_path):
                self.assertEqual(attempt(), "blocked")
            self.assertEqual(attempt(), "acquired")

    def test_rejected_cache_maps_do_not_retain_decoded_values(self):
        # GHSA-j586-36cw-2gc2: CacheControl catches strict-map-key errors.
        # Use bounded inert bytes through that actual decoder, with no streams,
        # network, executable payload or attacker-controlled filesystem paths.
        serializer = Serializer()
        request = requests.Request("GET", "https://example.test/audit").prepare()
        malformed = b"cc=4," + msgpack.packb({42: b"x" * (256 * 1024)}, use_bin_type=True)
        self.assertIsNone(serializer.loads(request, malformed))
        gc.collect()
        tracemalloc.start()
        try:
            before = tracemalloc.get_traced_memory()[0]
            for _ in range(24):
                self.assertIsNone(serializer.loads(request, malformed))
            gc.collect()
            retained = tracemalloc.get_traced_memory()[0] - before
        finally:
            tracemalloc.stop()
        self.assertLess(retained, 512 * 1024, f"rejected cache maps retained {retained} bytes")


if __name__ == "__main__":
    unittest.main(verbosity=2)
