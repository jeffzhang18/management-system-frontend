from pathlib import Path
import os
import tempfile
import unittest
from unittest.mock import patch

from publish_frontend import publish


class PublishTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        root = Path(self.temporary.name)
        self.live = root / "live"
        self.source = root / "stage"
        (self.live / "assets").mkdir(parents=True)
        (self.source / "assets").mkdir(parents=True)
        (self.live / "index.html").write_text("old entry")
        (self.live / "assets/old.js").write_text("old lazy route")
        (self.source / "index.html").write_text('<script src="/assets/new.js"></script>')
        (self.source / "assets/new.js").write_text("new entry")

    def test_entry_switches_last_and_old_tabs_keep_their_assets(self):
        replace = os.replace
        changes = []

        def record(source, target):
            if target.name == "index.html":
                self.assertTrue((self.live / "assets/new.js").is_file())
            else:
                self.assertEqual((self.live / "index.html").read_text(), "old entry")
            changes.append(target.name)
            replace(source, target)

        with patch("publish_frontend.os.replace", side_effect=record):
            publish(self.source, self.live)
        self.assertEqual(changes[-1], "index.html")
        self.assertEqual((self.live / "assets/old.js").read_text(), "old lazy route")
        # A second release must also keep the first release's modules available.
        (self.source / "assets/newer.js").write_text("next release")
        (self.source / "index.html").write_text('<script src="/assets/newer.js"></script>')
        publish(self.source, self.live)
        self.assertTrue((self.live / "assets/new.js").is_file())

    def test_incomplete_upload_never_replaces_live_entry(self):
        (self.source / "assets/new.js").unlink()
        with self.assertRaises(ValueError):
            publish(self.source, self.live)
        self.assertEqual((self.live / "index.html").read_text(), "old entry")

    def test_interrupted_copy_keeps_old_entry_and_cleans_temporary_files(self):
        with patch("publish_frontend.os.replace", side_effect=OSError("Interrupted")):
            with self.assertRaises(OSError):
                publish(self.source, self.live)
        self.assertEqual((self.live / "index.html").read_text(), "old entry")
        self.assertFalse(list(self.live.rglob(".publish-*")))

    def test_reusing_an_asset_name_cannot_break_an_open_tab(self):
        (self.source / "assets/old.js").write_text("different content")
        with self.assertRaises(ValueError):
            publish(self.source, self.live)
        self.assertEqual((self.live / "assets/old.js").read_text(), "old lazy route")
        self.assertEqual((self.live / "index.html").read_text(), "old entry")


if __name__ == "__main__":
    unittest.main()
