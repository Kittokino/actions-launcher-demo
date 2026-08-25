/* Search engine: fuzzy + synonym matching over the action catalog.
   Returns results split by match type so the UI can teach canonical action names. */

function normalizeText(s) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function editDistance(a, b) {
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 2) return 3;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j - 1], prev[j], curr[j - 1]);
    }
    prev = curr;
  }
  return prev[n];
}

/* Does a query token match a target word? (prefix or typo-tolerant) */
function tokenMatchesWord(token, word) {
  if (word.startsWith(token)) return true;
  if (token.length >= 4) {
    const allowed = token.length >= 6 ? 2 : 1;
    // compare against the word and its prefix of the token's length + slack
    if (editDistance(token, word) <= allowed) return true;
    if (word.length > token.length + allowed &&
        editDistance(token, word.slice(0, token.length + 1)) <= allowed) return true;
  }
  return false;
}

/* Do all query tokens match somewhere in the text? */
function tokensMatchText(tokens, text) {
  const words = text.split(" ");
  return tokens.every((t) => words.some((w) => tokenMatchesWord(t, w)));
}

/* Search the catalog. Returns { direct: [{action, score}], related: [{action, matchedTerm, score}] } */
function searchActions(query, categoryFilter) {
  const q = normalizeText(query);
  const tokens = q.split(" ").filter(Boolean);
  const direct = [];
  const related = [];
  if (!tokens.length) return { direct, related };

  for (const action of ACTIONS) {
    if (categoryFilter && categoryFilter !== "all" && action.category !== categoryFilter) continue;
    const name = normalizeText(action.name);
    const desc = normalizeText(action.description);

    let score = 0;
    if (name.includes(q)) score = 100 - name.indexOf(q);
    else if (tokensMatchText(tokens, name)) score = 70;
    else if (desc.includes(q)) score = 45;
    else if (tokensMatchText(tokens, desc)) score = 35;

    if (score > 0) {
      direct.push({ action, score });
      continue;
    }

    // Synonym pass: match query against each synonym phrase.
    let best = null;
    for (const syn of action.synonyms) {
      const s = normalizeText(syn);
      let synScore = 0;
      if (s.includes(q) || q.includes(s)) synScore = 60;
      else if (tokensMatchText(tokens, s)) synScore = 45;
      if (synScore > (best ? best.score : 0)) best = { term: syn, score: synScore };
    }
    if (best) related.push({ action, matchedTerm: best.term, score: best.score });
  }

  const byScore = (a, b) => b.score - a.score || a.action.name.localeCompare(b.action.name);
  direct.sort(byScore);
  related.sort(byScore);
  return { direct, related };
}

/* Highlight the parts of a display name that match the query. Returns HTML. */
function highlightName(name, query) {
  const q = normalizeText(query);
  const tokens = q.split(" ").filter(Boolean);
  if (!tokens.length) return escapeHtml(name);

  const lowerName = name.toLowerCase();
  // Whole-query substring match: highlight the exact range.
  const idx = lowerName.indexOf(q);
  if (q.length > 1 && idx >= 0) {
    return escapeHtml(name.slice(0, idx)) + "<mark>" + escapeHtml(name.slice(idx, idx + q.length)) + "</mark>" + escapeHtml(name.slice(idx + q.length));
  }
  // Otherwise highlight each word that a token matches (prefix or fuzzy).
  return name.split(/(\s+)/).map((part) => {
    const w = normalizeText(part);
    if (w && tokens.some((t) => tokenMatchesWord(t, w))) return "<mark>" + escapeHtml(part) + "</mark>";
    return escapeHtml(part);
  }).join("");
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
