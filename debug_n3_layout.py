from pathlib import Path

import pdfplumber

from source_paths import N3_PDF_DIR


PDF_DIR = N3_PDF_DIR
MAIN = PDF_DIR / "JLPT_N3_한권합격_빈출단어문형암기장_스마트폰_패드_학습용.pdf"
LATEST = PDF_DIR / "N3_최신_기출_어휘_문형.pdf"


def dump(path, page_number, top_start, top_end):
    with pdfplumber.open(path) as pdf:
        page = pdf.pages[page_number - 1]
        words = page.extract_words(
            x_tolerance=1,
            y_tolerance=1,
            keep_blank_chars=False,
            extra_attrs=["size"],
        )
    print(f"\n{path.name} / page {page_number} / {page.width}x{page.height}")
    for word in words:
        if top_start <= word["top"] <= top_end:
            print(
                f"{word['text']!r:20} x={word['x0']:7.2f}-{word['x1']:7.2f} "
                f"top={word['top']:7.2f} size={word['size']:4.1f}"
            )


dump(MAIN, 3, 120, 210)
dump(MAIN, 30, 120, 210)
dump(LATEST, 1, 105, 190)

with pdfplumber.open(MAIN) as pdf:
    size_six = set()
    for page in pdf.pages[2:42]:
        for word in page.extract_words(
            x_tolerance=1,
            y_tolerance=1,
            keep_blank_chars=False,
            extra_attrs=["size"],
        ):
            if abs(word["size"] - 6.0) < 0.1:
                size_six.add(word["text"])
print("\nSIZE 6 TOKENS")
print(sorted(size_six))
