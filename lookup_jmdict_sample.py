import gzip
from lxml import etree

targets = {"貴重", "怪しい", "好調", "要求", "祝う", "分析", "利益"}
found = {}
with gzip.open("tmp/pdfs/JMdict.gz", "rb") as stream:
    for _event, entry in etree.iterparse(stream, events=("end",), tag="entry", load_dtd=True, resolve_entities=False, huge_tree=True):
        spellings = [node.text for node in entry.findall("k_ele/keb")]
        hit = targets.intersection(spellings)
        if hit:
            readings = [node.text for node in entry.findall("r_ele/reb")]
            glosses = {}
            for gloss in entry.findall("sense/gloss"):
                lang = gloss.get("{http://www.w3.org/XML/1998/namespace}lang", "eng")
                glosses.setdefault(lang, []).append(gloss.text)
            for word in hit:
                found[word] = {"readings": readings, "glosses": glosses}
        entry.clear()
        while entry.getprevious() is not None:
            del entry.getparent()[0]

for target in sorted(targets):
    print(target, found.get(target))
