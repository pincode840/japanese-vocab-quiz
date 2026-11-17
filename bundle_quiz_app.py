from pathlib import Path
from hashlib import sha256


base = Path(__file__).resolve().parent
assets_root = base / "japanese-vocab-quiz"
source_html = (assets_root / "index.html").read_text(encoding="utf-8")
asset_names = [
    "styles.css",
    "vocab-data.js",
    "n3-vocab-data.js",
    "n2-vocab-data.js",
    "katakana-vocab-data.js",
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


# GitHub Pages uses a small entry document and separate cacheable assets.
deploy_html = source_html
deploy_html = replace_once(
    deploy_html,
    'href="styles.css"',
    f'href="japanese-vocab-quiz/styles.css?v={asset_versions["styles.css"]}"',
)
for asset_name in asset_names[1:]:
    deploy_html = replace_once(
        deploy_html,
        f'src="{asset_name}"',
        f'src="japanese-vocab-quiz/{asset_name}?v={asset_versions[asset_name]}"',
    )

deploy_output = base / "index.html"
deploy_output.write_text(deploy_html, encoding="utf-8")
if deploy_output.stat().st_size > 80_000:
    raise ValueError("Deploy entry HTML must remain below 80 KB")
print(f"built split deploy page {deploy_output} ({deploy_output.stat().st_size} bytes)")


# Keep a portable single-file build for users who explicitly need offline use.
standalone_html = source_html
standalone_html = replace_once(
    standalone_html,
    '  <link rel="stylesheet" href="styles.css">',
    f"  <style>\n{(assets_root / 'styles.css').read_text(encoding='utf-8')}\n  </style>",
)
for asset_name in asset_names[1:]:
    script = (assets_root / asset_name).read_text(encoding="utf-8")
    standalone_html = replace_once(
        standalone_html,
        f'  <script src="{asset_name}"></script>',
        f"  <script>\n{script}\n  </script>",
    )

standalone_output = base / "일본어_단어_맞추기_앱.html"
standalone_output.write_text(standalone_html, encoding="utf-8")
print(f"built standalone page {standalone_output} ({standalone_output.stat().st_size} bytes)")
