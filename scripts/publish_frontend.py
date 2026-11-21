"""Publish staged Vite output without removing files used by open browser tabs."""

import os
from pathlib import Path
import re
import shutil
import sys
import tempfile


def publish(source: Path, destination: Path):
    source = source.resolve()
    destination = destination.resolve()
    if source == destination or source in destination.parents or destination in source.parents:
        raise ValueError("Staging and live directories must be separate")
    entry = source / "index.html"
    html = entry.read_text()
    references = re.findall(r'''(?:src|href)=["']/?(assets/[^"']+)["']''', html)
    if not references:
        raise ValueError("No built assets referenced by index.html")
    for reference in references:
        asset = (source / reference).resolve()
        if source not in asset.parents or not asset.is_file():
            raise ValueError(f"Missing entry asset: {reference}")
    files = sorted(p for p in source.rglob("*") if p.is_file() and p != entry)
    # Vite's content-addressed resources must remain immutable across releases.
    for file in files:
        relative = file.relative_to(source)
        old = destination / relative
        if relative.parts[0] == "assets" and old.exists() and old.read_bytes() != file.read_bytes():
            raise ValueError(f"Asset filename reused for different content: {relative}")
    destination.mkdir(parents=True, exist_ok=True)
    # Switch the entry only after all dependencies exist. Keep old assets for open tabs.
    for file in [*files, entry]:
        target = destination / file.relative_to(source)
        if file != entry and target.exists() and target.read_bytes() == file.read_bytes():
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        fd, temporary = tempfile.mkstemp(prefix=".publish-", dir=target.parent)
        try:
            with os.fdopen(fd, "wb") as output, file.open("rb") as content:
                shutil.copyfileobj(content, output)
            os.chmod(temporary, 0o644)
            os.replace(temporary, target)
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)
    print(f"Published {len(files)} resources; switched index.html; retained older assets")


if __name__ == "__main__":
    publish(Path(sys.argv[1]), Path(sys.argv[2]))
