from hashlib import sha256
from pathlib import Path
import re


base = Path(__file__).resolve().parent
assets_root = base / "japanese-vocab-quiz"
nested_entry = assets_root / "index.html"
asset_names = [
    "styles.css",
    "vocab-data.js",
    "n3-vocab-data.js",
    "n2-vocab-data.js",
    "katakana-vocab-data.js",
    "usage-context-curated.js",
    "usage-context-data.js",
    "usage-context-ko.js",
    "example-credits.js",
    "reading-data.js",
    "reading-generated-data.js",
    "reading-advanced-guides.js",
    "quiz-engine.js",
    "reading-renderer.js",
    "session-store.js",
    "app.js",
]


def replace_once(document, marker, replacement):
    count = document.count(marker)
    if count != 1:
        raise ValueError(f"Expected one bundle marker, found {count}: {marker}")
    return document.replace(marker, replacement, 1)


# The nested index is both an editable source and a public entry page. Remove
# only previously generated build metadata so rebuilding is idempotent.
source_html = re.sub(
    r'((?:src|href)="[^"/?]+\.(?:js|css))\?v=[a-f0-9]{12}"',
    r'\1"',
    nested_entry.read_text(encoding="utf-8"),
)
source_html = re.sub(
    r'(<small id="build-version">)앱 버전 [a-f0-9]{12}(</small>)',
    r'\1개발 버전\2',
    source_html,
)


# Content-addressed URLs prevent a fresh HTML document from reusing stale JS
# or CSS from GitHub Pages' ten-minute cache. Normalize line endings through
# read_text so Windows and Linux builds produce identical version identifiers.
asset_contents = {
    name: (assets_root / name).read_text(encoding="utf-8") for name in asset_names
}
asset_versions = {
    name: sha256(content.encode("utf-8")).hexdigest()[:12]
    for name, content in asset_contents.items()
}
build_version = sha256(
    (source_html + "".join(asset_versions.values())).encode("utf-8")
).hexdigest()[:12]
source_html = replace_once(
    source_html,
    '<small id="build-version">개발 버전</small>',
    f'<small id="build-version">앱 버전 {build_version}</small>',
)


def write_deploy_page(output, prefix):
    """Publish the same version under either URL without changing origin."""
    deploy_html = source_html
    for asset_name in asset_names:
        attribute = "href" if asset_name.endswith(".css") else "src"
        deploy_html = replace_once(
            deploy_html,
            f'{attribute}="{asset_name}"',
            f'{attribute}="{prefix}{asset_name}?v={asset_versions[asset_name]}"',
        )
    size = len(deploy_html.encode("utf-8"))
    if size > 80_000:
        raise ValueError("Deploy entry HTML must remain below 80 KB")
    if not output.exists() or output.read_text(encoding="utf-8") != deploy_html:
        output.write_text(deploy_html, encoding="utf-8")
    print(f"built split deploy page {output} ({size} bytes)")


# Both GitHub Pages entry paths use small documents and cacheable assets.
write_deploy_page(base / "index.html", f"{assets_root.name}/")
write_deploy_page(nested_entry, "")


# Keep a portable single-file build for users who explicitly need offline use.
standalone_html = source_html
standalone_html = replace_once(
    standalone_html,
    '  <link rel="stylesheet" href="styles.css">',
    f"  <style>\n{asset_contents['styles.css']}\n  </style>",
)
for asset_name in asset_names[1:]:
    script = asset_contents[asset_name]
    standalone_html = replace_once(
        standalone_html,
        f'  <script src="{asset_name}"></script>',
        f"  <script>\n{script}\n  </script>",
    )

standalone_output = base / "일본어_단어_맞추기_앱.html"
standalone_output.write_text(standalone_html, encoding="utf-8")
print(f"built standalone page {standalone_output} ({standalone_output.stat().st_size} bytes)")
