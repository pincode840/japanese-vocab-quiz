(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.ReadingRenderer = api;
}(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function matchingTerms(text, guides) {
    return Object.keys(guides)
      .filter((term) => term && String(text).includes(term))
      // Longest-first matching prevents a short guide from splitting a compound word.
      .sort((a, b) => b.length - a.length);
  }

  function replaceGuidedTerms(text, guides, replacement) {
    const terms = matchingTerms(text, guides);
    if (!terms.length) return replacement(String(text), null);

    const pattern = new RegExp(terms.map(escapeRegExp).join("|"), "g");
    let output = "";
    let cursor = 0;
    for (const match of String(text).matchAll(pattern)) {
      output += replacement(String(text).slice(cursor, match.index), null);
      output += replacement(match[0], guides[match[0]]);
      cursor = match.index + match[0].length;
    }
    output += replacement(String(text).slice(cursor), null);
    return output;
  }

  function create(commonGuides = {}) {
    function guidesFor(readings) {
      return { ...commonGuides, ...(readings || {}) };
    }

    function toHtml(text, readings, enabled) {
      if (!enabled) return escapeHtml(text);
      return replaceGuidedTerms(text, guidesFor(readings), (term, reading) => (
        reading
          ? `<ruby>${escapeHtml(term)}<rt aria-hidden="true">${escapeHtml(reading)}</rt></ruby>`
          : escapeHtml(term)
      ));
    }

    function toAccessibleText(text, readings, enabled) {
      if (!enabled) return String(text);
      return replaceGuidedTerms(text, guidesFor(readings), (term, reading) => (
        reading ? `${term}（${reading}）` : term
      ));
    }

    function render(target, text, readings, enabled) {
      target.innerHTML = toHtml(text, readings, enabled);
      // The explicit label makes the reading deterministic across screen readers.
      target.setAttribute("aria-label", toAccessibleText(text, readings, enabled));
    }

    return { render, toHtml, toAccessibleText };
  }

  return { create, escapeHtml };
}));
