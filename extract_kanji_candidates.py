import re
from collections import Counter
from pathlib import Path


for path in sorted(Path("tmp/pdfs").glob("*.txt")):
    text = path.read_text(encoding="utf-8")
    text = re.sub(r"\(cid:\d+\)", "", text)
    text = re.sub(r"(?<=[ぁ-んァ-ヶ一-龯々])\s+(?=[ぁ-んァ-ヶ一-龯々])", "", text)
    words = re.findall(r"[一-龯々]{2,10}", text)
    counts = Counter(words)
    print(f"\n### {path.name} unique={len(counts)}")
    print(" | ".join(word for word, _count in counts.most_common()))
