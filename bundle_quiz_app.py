from pathlib import Path


base = Path(__file__).resolve().parent
root = base / "japanese-vocab-quiz"
html = (root / "index.html").read_text(encoding="utf-8")
css = (root / "styles.css").read_text(encoding="utf-8")
data = (root / "vocab-data.js").read_text(encoding="utf-8")
n3_data = (root / "n3-vocab-data.js").read_text(encoding="utf-8")
n2_data = (root / "n2-vocab-data.js").read_text(encoding="utf-8")
katakana_data = (root / "katakana-vocab-data.js").read_text(encoding="utf-8")
engine = (root / "quiz-engine.js").read_text(encoding="utf-8")
app = (root / "app.js").read_text(encoding="utf-8")


def replace_once(document, marker, replacement):
    count = document.count(marker)
    if count != 1:
        raise ValueError(f"Expected one bundle marker, found {count}: {marker}")
    return document.replace(marker, replacement, 1)


html = replace_once(html, '  <link rel="stylesheet" href="styles.css">', f"  <style>\n{css}\n  </style>")
html = replace_once(html, '  <script src="vocab-data.js"></script>', f"  <script>\n{data}\n  </script>")
html = replace_once(html, '  <script src="n3-vocab-data.js"></script>', f"  <script>\n{n3_data}\n  </script>")
html = replace_once(html, '  <script src="n2-vocab-data.js"></script>', f"  <script>\n{n2_data}\n  </script>")
html = replace_once(html, '  <script src="katakana-vocab-data.js"></script>', f"  <script>\n{katakana_data}\n  </script>")
html = replace_once(html, '  <script src="quiz-engine.js"></script>', f"  <script>\n{engine}\n  </script>")
html = replace_once(html, '  <script src="app.js"></script>', f"  <script>\n{app}\n  </script>")

for output in (base / "일본어_단어_맞추기_앱.html", base / "index.html"):
    output.write_text(html, encoding="utf-8")
    print(f"built {output} ({output.stat().st_size} bytes)")
