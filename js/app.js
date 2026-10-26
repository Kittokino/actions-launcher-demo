/* Actions Launcher demo — UI wiring: console shell, launcher, pins, AI suggestions, subtabs, chat. */

(function () {
  "use strict";

  const actionById = (id) => ACTIONS.find((a) => a.id === id);

  /* ---------------- Shared state ---------------- */
  const state = {
    pinned: [...DEFAULT_PINS],        // rep-managed pins (action ids) — never mutated by Einstein
    recents: [],                      // launched action ids, newest first
    chatIndex: 1,                     // messages revealed so far
    autoplay: null,                   // interval handle
    activeNav: "customer",
    ai: {
      enabled: true,                  // Einstein Suggestions toggle
      active: false,                  // AI-suggested actions currently replace the pinned row
      loading: false,                 // extraction in progress (non-blocking)
      intents: [],                    // [{id, label, actionIds, selected}] for the current stage
      lastStageIndex: -1,             // latest stage surfaced (drives the "new suggestions" dot)
      feedback: null,                 // 'up' | 'down' | null
    },
    views: {
      customer: { subtabs: [], activeSubtab: "record", counter: 0 },
      case:     { subtabs: [], activeSubtab: "record", counter: 0 },
    },
  };

  const launchers = [];

  /* ---------------- Toasts ---------------- */
  function toast(message, ai) {
    const region = document.getElementById("toast-region");
    const el = document.createElement("div");
    el.className = "toast" + (ai ? " toast--ai" : "");
    el.innerHTML = (ai ? ICONS.sparkle : ICONS.flow) + "<span></span>";
    el.querySelector("span").textContent = message;
    region.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  /* ---------------- Subtabs ---------------- */
  function subtabPaneId(viewId, subtabId) {
    return "pane-" + viewId + "-" + subtabId;
  }

  function renderSubtabBar(viewId) {
    const view = state.views[viewId];
    const bar = document.querySelector('.subtab-bar[data-view="' + viewId + '"]');
    bar.innerHTML = "";

    const recordTab = document.createElement("button");
    recordTab.className = "subtab" + (view.activeSubtab === "record" ? " is-active" : "");
    recordTab.innerHTML = (viewId === "customer"
      ? '<svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M20 6h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 0h-4V4h4v2z"/></svg>')
      + "<span>" + (viewId === "customer" ? "Details" : "Case " + CASE_RECORD.number) + "</span>";
    recordTab.addEventListener("click", () => activateSubtab(viewId, "record"));
    bar.appendChild(recordTab);

    for (const st of view.subtabs) {
      const action = st.actionId ? actionById(st.actionId) : null;
      const label = action ? action.name : st.label;
      const iconHtml = action ? ICONS[action.category] : st.icon;
      const tab = document.createElement("button");
      tab.className = "subtab" + (view.activeSubtab === st.id ? " is-active" : "");
      tab.innerHTML = iconHtml + "<span></span>";
      tab.querySelector("span").textContent = label;
      const close = document.createElement("button");
      close.className = "subtab__close";
      close.setAttribute("aria-label", "Close " + label);
      close.innerHTML = ICONS.close;
      close.addEventListener("click", (e) => {
        e.stopPropagation();
        closeSubtab(viewId, st.id);
      });
      tab.appendChild(close);
      tab.addEventListener("click", () => activateSubtab(viewId, st.id));
      bar.appendChild(tab);
    }
  }

  function activateSubtab(viewId, subtabId) {
    const view = state.views[viewId];
    view.activeSubtab = subtabId;
    renderSubtabBar(viewId);
    const container = document.querySelector('.subtab-contents[data-view="' + viewId + '"]');
    for (const pane of container.children) {
      pane.hidden = pane.id !== subtabPaneId(viewId, subtabId);
    }
  }

  function closeSubtab(viewId, subtabId) {
    const view = state.views[viewId];
    const idx = view.subtabs.findIndex((s) => s.id === subtabId);
    if (idx < 0) return;
    view.subtabs.splice(idx, 1);
    const pane = document.getElementById(subtabPaneId(viewId, subtabId));
    if (pane) pane.remove();
    if (view.activeSubtab === subtabId) {
      view.activeSubtab = view.subtabs.length ? view.subtabs[Math.max(0, idx - 1)].id : "record";
    }
    activateSubtab(viewId, view.activeSubtab);
  }

  function launchAction(actionId, viewId) {
    const view = state.views[viewId];
    const action = actionById(actionId);

    // Recents: newest first, dedupe, cap 5.
    state.recents = [actionId, ...state.recents.filter((id) => id !== actionId)].slice(0, 5);

    // Re-focus an already-open subtab for the same action (Salesforce behavior).
    const existing = view.subtabs.find((s) => s.actionId === actionId);
    if (existing) {
      activateSubtab(viewId, existing.id);
      toast("Switched to open workflow: " + action.name);
      return;
    }

    const id = "st" + (++view.counter);
    view.subtabs.push({ id, actionId });

    const pane = document.createElement("div");
    pane.className = "subtab-pane";
    pane.id = subtabPaneId(viewId, id);
    const color = CATEGORIES[action.category].color;
    pane.innerHTML =
      '<div class="workflow-placeholder">' +
        '<div class="workflow-placeholder__icon" style="background:' + color + '">' + ICONS[action.category] + "</div>" +
        "<h2></h2>" +
        "<p></p>" +
        '<div class="workflow-placeholder__frame">' + ICONS.flow +
          " The <strong>" + escapeHtml(action.name) + "</strong> workflow starts here.<br/>" +
          "Guided steps for this workflow would render in this subtab." +
        "</div>" +
        '<div class="workflow-placeholder__context">Context: ' +
          escapeHtml(viewId === "customer" ? CUSTOMER.name + " · " + CUSTOMER.account : "Case " + CASE_RECORD.number + " · " + CASE_RECORD.subject) +
        "</div>" +
      "</div>";
    pane.querySelector("h2").textContent = action.name;
    pane.querySelector("p").textContent = action.description;
    document.querySelector('.subtab-contents[data-view="' + viewId + '"]').appendChild(pane);

    activateSubtab(viewId, id);
    toast("Launched workflow: " + action.name);
    refreshLaunchers();
  }

  function openClosedCasesTab(viewId) {
    const view = state.views[viewId];
    const existing = view.subtabs.find((s) => s.kind === "closed-cases");
    if (existing) { activateSubtab(viewId, existing.id); return; }

    const id = "st" + (++view.counter);
    view.subtabs.push({ id, kind: "closed-cases", label: "Closed Cases", icon: ICONS.briefcase });

    const rows = CLOSED_CASES.map((c) =>
      "<tr>" +
        '<td class="list-table__num">' + c.number + "</td>" +
        "<td>" + escapeHtml(c.subject) + "</td>" +
        '<td><span class="case-reason case-reason--' + c.reason.toLowerCase().replace(/[^a-z]+/g, "-") + '">' + escapeHtml(c.reason) + "</span></td>" +
        '<td class="list-table__date">' + c.closed + "</td>" +
      "</tr>").join("");

    const pane = document.createElement("div");
    pane.className = "subtab-pane";
    pane.id = subtabPaneId(viewId, id);
    pane.innerHTML =
      '<div class="list-view">' +
        '<div class="list-view__head">' +
          '<div class="list-view__title">' + ICONS.briefcase + " Closed Cases <span class=\"list-view__count\">" + CLOSED_CASES.length + "</span></div>" +
          '<div class="list-view__sub">Resolved and closed cases for <strong>' + escapeHtml(CUSTOMER.name) + "</strong> · " + CUSTOMER.account + "</div>" +
        "</div>" +
        '<table class="list-table">' +
          "<thead><tr><th>Case Number</th><th>Subject</th><th>Closed Reason</th><th>Date Closed</th></tr></thead>" +
          "<tbody>" + rows + "</tbody>" +
        "</table>" +
      "</div>";
    document.querySelector('.subtab-contents[data-view="' + viewId + '"]').appendChild(pane);

    activateSubtab(viewId, id);
    toast("Opened " + CLOSED_CASES.length + " closed cases for " + CUSTOMER.name);
  }

  function openArticleTab(viewId, articleId) {
    const view = state.views[viewId];
    const article = KNOWLEDGE_ARTICLES.find((a) => a.id === articleId);
    if (!article) return;
    const existing = view.subtabs.find((s) => s.kind === "article" && s.articleId === articleId);
    if (existing) { activateSubtab(viewId, existing.id); return; }

    const id = "st" + (++view.counter);
    view.subtabs.push({ id, kind: "article", articleId, label: article.title, icon: ICONS.book });

    const pane = document.createElement("div");
    pane.className = "subtab-pane";
    pane.id = subtabPaneId(viewId, id);
    pane.innerHTML =
      '<div class="article-view">' +
        '<div class="article-view__eyebrow">' + ICONS.book + " Knowledge Article · " + article.number + "</div>" +
        '<h2 class="article-view__title"></h2>' +
        '<div class="article-view__meta">Last Published ' + article.published + "</div>" +
        '<p class="article-view__lead"></p>' +
        '<div class="article-view__frame">' + ICONS.book + " The full knowledge article would render here.</div>" +
      "</div>";
    pane.querySelector(".article-view__title").textContent = article.title;
    pane.querySelector(".article-view__lead").textContent = article.snippet;
    document.querySelector('.subtab-contents[data-view="' + viewId + '"]').appendChild(pane);

    activateSubtab(viewId, id);
    toast("Opened article: " + article.title);
  }

  /* ---------------- Launcher component ---------------- */
  class Launcher {
    constructor(container, viewId) {
      this.viewId = viewId;
      this.categoryFilter = "all";
      this.activeIndex = -1;
      this.flatResults = []; // flattened rows currently in the dropdown

      container.innerHTML =
        '<div class="detail-card launcher-card">' +
          '<div class="detail-card__header">' +
            "<span>" + ICONS.search + " Actions Launcher</span>" +
            '<label class="einstein-toggle" title="Turn Einstein action suggestions on or off">' +
              '<span class="einstein-toggle__text">' + ICONS.sparkle + " Einstein Suggestions</span>" +
              '<input type="checkbox" class="einstein-toggle__input" checked />' +
              '<span class="einstein-toggle__switch"></span>' +
              '<span class="einstein-toggle__state">Enabled</span>' +
            "</label>" +
          "</div>" +
          '<div class="detail-card__body">' +
            '<div class="launcher-search">' +
              '<span class="launcher-search__icon">' + ICONS.search + "</span>" +
              '<input type="text" placeholder="Search actions" aria-label="Search actions" autocomplete="off" />' +
              '<div class="launcher-dropdown" hidden></div>' +
            "</div>" +
            '<div class="pinned-strip"></div>' +
          "</div>" +
        "</div>";

      this.input = container.querySelector(".launcher-search input");
      this.dropdown = container.querySelector(".launcher-dropdown");
      this.pinnedStrip = container.querySelector(".pinned-strip");
      this.toggleInput = container.querySelector(".einstein-toggle__input");
      this.toggleState = container.querySelector(".einstein-toggle__state");
      this.overflowOpen = false;

      this.input.addEventListener("focus", () => this.open());
      this.input.addEventListener("click", () => this.open());
      this.input.addEventListener("input", () => { this.activeIndex = -1; this.open(); });
      this.input.addEventListener("keydown", (e) => this.onKeydown(e));
      // Close the dropdown as soon as the field loses focus (results/chips keep focus via mousedown preventDefault).
      this.input.addEventListener("blur", () => this.close());
      this.toggleInput.addEventListener("change", (e) => setEinsteinEnabled(e.target.checked));
      document.addEventListener("mousedown", (e) => {
        if (!container.contains(e.target)) this.close();
        if (this.overflowOpen && !this.pinnedStrip.contains(e.target)) { this.overflowOpen = false; this.renderPins(); }
      });

      // Re-fit the single-row pins whenever the strip's own width changes: window resize,
      // window restore, subtab show/hide, chat collapse. ResizeObserver catches them all.
      // The strip width is set by the column (not by the chips), so trimming never re-triggers this.
      this._lastPinWidth = -1;
      if (typeof ResizeObserver !== "undefined") {
        this._ro = new ResizeObserver(() => {
          const w = this.pinnedStrip.clientWidth;
          if (w !== this._lastPinWidth) { this._lastPinWidth = w; this.renderPins(); }
        });
        this._ro.observe(this.pinnedStrip);
      }

      this.renderPins();
      launchers.push(this);
    }

    open() { this.dropdown.hidden = false; this.renderDropdown(); }
    close() { this.dropdown.hidden = true; this.activeIndex = -1; }
    isOpen() { return !this.dropdown.hidden; }

    onKeydown(e) {
      if (e.key === "Escape") { this.close(); this.input.blur(); return; }
      if (!this.isOpen() && (e.key === "ArrowDown" || e.key === "Enter")) { this.open(); return; }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!this.flatResults.length) return;
        const dir = e.key === "ArrowDown" ? 1 : -1;
        this.activeIndex = (this.activeIndex + dir + this.flatResults.length) % this.flatResults.length;
        this.paintActive();
      } else if (e.key === "Enter") {
        if (this.activeIndex >= 0 && this.flatResults[this.activeIndex]) {
          this.launch(this.flatResults[this.activeIndex].action.id);
        } else if (this.flatResults.length) {
          this.launch(this.flatResults[0].action.id);
        }
      }
    }

    paintActive() {
      const rows = this.dropdown.querySelectorAll(".launcher-result");
      rows.forEach((row, i) => {
        row.classList.toggle("is-active", i === this.activeIndex);
        if (i === this.activeIndex) row.scrollIntoView({ block: "nearest" });
      });
    }

    launch(actionId) {
      launchAction(actionId, this.viewId);
      this.input.value = "";
      this.close();
      this.input.blur();
    }

    resultRow(action, matchedTerm, query) {
      const row = document.createElement("div");
      row.className = "launcher-result";
      row.setAttribute("role", "option");
      const cat = CATEGORIES[action.category];
      const isPinned = state.pinned.includes(action.id);
      row.innerHTML =
        '<span class="launcher-result__icon" style="background:' + cat.color + '">' + ICONS[action.category] + "</span>" +
        '<span class="launcher-result__text">' +
          '<div class="launcher-result__name">' + (query ? highlightName(action.name, query) : escapeHtml(action.name)) +
            (action.pro ? ' <span class="pro-badge">Pro</span>' : "") + "</div>" +
          '<div class="launcher-result__desc">' + escapeHtml(action.description) + "</div>" +
          (matchedTerm ? '<div class="launcher-result__matched">↳ matched “' + escapeHtml(matchedTerm) + '”</div>' : "") +
        "</span>" +
        '<button class="launcher-result__pin' + (isPinned ? " is-pinned" : "") + '" title="' + (isPinned ? "Unpin" : "Pin") + ' this action">' + ICONS.pin + "</button>";
      row.addEventListener("mousedown", (e) => e.preventDefault()); // keep input focus
      row.addEventListener("click", (e) => {
        if (e.target.closest(".launcher-result__pin")) return;
        this.launch(action.id);
      });
      row.querySelector(".launcher-result__pin").addEventListener("click", (e) => {
        e.stopPropagation();
        togglePin(action.id);
      });
      return row;
    }

    sectionTitle(html, related) {
      const el = document.createElement("div");
      el.className = "launcher-section-title" + (related ? " launcher-section-title--related" : "");
      el.innerHTML = html;
      return el;
    }

    renderChips() {
      const chips = document.createElement("div");
      chips.className = "launcher-chips";
      const all = [{ id: "all", label: "All" }].concat(Object.values(CATEGORIES));
      for (const c of all) {
        const chip = document.createElement("button");
        chip.className = "launcher-chip" + (this.categoryFilter === c.id ? " is-active" : "");
        chip.textContent = c.label;
        chip.addEventListener("mousedown", (e) => e.preventDefault());
        chip.addEventListener("click", () => {
          this.categoryFilter = c.id;
          this.activeIndex = -1;
          this.renderDropdown();
          this.input.focus();
        });
        chips.appendChild(chip);
      }
      return chips;
    }

    renderDropdown() {
      const query = this.input.value.trim();
      this.dropdown.innerHTML = "";
      this.flatResults = [];

      if (!query) {
        // Empty state shows recents only; the category chips appear once the rep types.
        // Reset the filter so a leftover category can never hide recent actions.
        this.categoryFilter = "all";
        // Empty state: recents (Salesforce global-search pattern).
        const recents = state.recents
          .map(actionById)
          .filter((a) => a);
        if (recents.length) {
          this.dropdown.appendChild(this.sectionTitle(ICONS.clock + " Recent"));
          for (const a of recents) {
            this.dropdown.appendChild(this.resultRow(a, null, ""));
            this.flatResults.push({ action: a });
          }
        } else {
          const empty = document.createElement("div");
          empty.className = "launcher-empty launcher-empty--illustration";
          empty.innerHTML =
            '<img class="launcher-empty__art" src="assets/search-empty-state.avif" alt="" />' +
            '<div class="launcher-empty__title">Search for an action</div>' +
            '<div class="launcher-empty__text">Type what you want to do, like “refund”, “roaming”, or “unlock device”.</div>';
          this.dropdown.appendChild(empty);
        }
        this.paintActive();
        return;
      }

      // Category chips only appear once there is a query to filter.
      this.dropdown.appendChild(this.renderChips());
      const { direct, related } = searchActions(query, this.categoryFilter);

      if (direct.length) {
        this.dropdown.appendChild(this.sectionTitle("Matching actions"));
        for (const r of direct) {
          this.dropdown.appendChild(this.resultRow(r.action, null, query));
          this.flatResults.push({ action: r.action });
        }
      }
      if (related.length) {
        this.dropdown.appendChild(this.sectionTitle(ICONS.sparkle + " Related — matched by term", true));
        for (const r of related) {
          this.dropdown.appendChild(this.resultRow(r.action, r.matchedTerm, ""));
          this.flatResults.push({ action: r.action });
        }
      }
      if (!direct.length && !related.length) {
        const empty = document.createElement("div");
        empty.className = "launcher-empty";
        empty.textContent = "No actions found for “" + query + "”" +
          (this.categoryFilter !== "all" ? " in " + CATEGORIES[this.categoryFilter].label : "") + ".";
        this.dropdown.appendChild(empty);
      }
      this.paintActive();
    }

    renderPins() {
      const ai = state.ai;
      // Keep both launchers' toggles in sync with the shared Einstein state.
      if (this.toggleInput) {
        this.toggleInput.checked = ai.enabled;
        this.toggleState.textContent = ai.enabled ? "Enabled" : "Disabled";
      }
      this.pinnedStrip.innerHTML = "";

      /* ----- Controls row: Autofill trigger + (when active) intents, feedback, restore ----- */
      const controls = document.createElement("div");
      controls.className = "pinned-strip__controls";

      if (ai.enabled) {
        const showDot = !ai.loading && currentStageIndex(state.chatIndex) > ai.lastStageIndex;
        const autofill = document.createElement("button");
        autofill.className = "autofill-btn" + (ai.active ? " is-active" : "");
        autofill.disabled = ai.loading;
        autofill.title = "Refresh the action suggestions based on the conversation history";
        autofill.innerHTML = ICONS.sparkle +
          '<span>Autofill with Einstein<sup class="autofill-dot' + (showDot ? " is-visible" : "") +
          '" title="New suggestions available"></sup></span>';
        autofill.addEventListener("click", () => invokeAutofill());
        controls.appendChild(autofill);

        if (ai.loading) {
          const loading = document.createElement("span");
          loading.className = "autofill-loading";
          loading.innerHTML = '<span class="ai-spinner"></span> Extracting user intents and fetching actions…';
          controls.appendChild(loading);
        } else if (ai.active) {
          const intents = document.createElement("span");
          intents.className = "intents";
          intents.innerHTML = '<span class="intents__label">Extracted intents:</span>';
          for (const intent of ai.intents) {
            const chip = document.createElement("label");
            chip.className = "intent-chip" + (intent.selected ? " is-selected" : "");
            chip.innerHTML = '<input type="checkbox" ' + (intent.selected ? "checked" : "") + " /><span>" + escapeHtml(intent.label) + "</span>";
            chip.querySelector("input").addEventListener("change", (e) => {
              intent.selected = e.target.checked;
              refreshLaunchers();
            });
            intents.appendChild(chip);
          }
          controls.appendChild(intents);

          const fb = document.createElement("span");
          fb.className = "ai-feedback";
          fb.innerHTML =
            '<button class="ai-feedback__btn' + (ai.feedback === "up" ? " is-on" : "") + '" data-fb="up" title="These suggestions were helpful">' + ICONS.thumbUp + "</button>" +
            '<button class="ai-feedback__btn' + (ai.feedback === "down" ? " is-on" : "") + '" data-fb="down" title="These suggestions missed the mark">' + ICONS.thumbDown + "</button>";
          fb.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
            ai.feedback = b.dataset.fb;
            toast(b.dataset.fb === "up" ? "Thanks — glad Einstein's suggestions helped." : "Thanks — we'll use this to sharpen suggestions.", true);
            refreshLaunchers();
          }));
          controls.appendChild(fb);
        }
      }
      this.pinnedStrip.appendChild(controls);

      /* ----- Actions row: Einstein actions (when active) or the rep's pins ----- */
      const showingAI = ai.enabled && ai.active;
      const chipIds = (showingAI ? selectedAIActionIds() : [...state.pinned]).slice(0, MAX_PINS);

      const actionsRow = document.createElement("div");
      // Normal pins live on a single non-wrapping row; AI suggestions may wrap.
      actionsRow.className = "pinned-strip__actions" + (showingAI ? "" : " pinned-strip__actions--single");

      // In single-row mode the chips live in their own shrinkable, clipping track so they
      // can never force the column wider; the caret sits outside the track.
      const track = showingAI ? actionsRow : document.createElement("div");
      if (!showingAI) { track.className = "pin-track"; actionsRow.appendChild(track); }

      if (!chipIds.length) {
        const hint = document.createElement("span");
        hint.className = "pinned-strip__none";
        hint.textContent = showingAI
          ? "Select an intent above to see matching actions."
          : "No pinned actions — pin from search results, or let Einstein suggest some.";
        track.appendChild(hint);
      }

      const chipEls = [];
      for (const id of chipIds) {
        const action = actionById(id);
        if (!action) continue;
        const chip = document.createElement("button");
        chip.className = "pin-chip" + (showingAI ? " pin-chip--ai" : "");
        chip.title = action.description + " — click to launch";
        chip.innerHTML = '<span class="pin-chip__name"></span>';
        chip.querySelector(".pin-chip__name").textContent = action.name;
        chip.addEventListener("click", () => launchAction(id, this.viewId));
        track.appendChild(chip);
        chipEls.push({ id, el: chip });
      }

      // Overflow caret: preserved pins (Einstein active) or pins that don't fit the row (otherwise).
      const overflow = this.buildOverflow(showingAI);
      actionsRow.appendChild(overflow);
      this.pinnedStrip.appendChild(actionsRow);

      // Normal pins: fit as many as the track's width allows, move the rest into the caret menu.
      if (!showingAI) this.layoutPinRow(track, chipEls, overflow);

      // "Show pinned actions" sits below the suggested buttons — a fixed spot regardless of how they wrap.
      if (showingAI) {
        const restoreRow = document.createElement("div");
        restoreRow.className = "pinned-strip__restore";
        const restore = document.createElement("button");
        restore.className = "ai-clear";
        restore.textContent = "Show pinned actions";
        restore.title = "Clear Einstein suggestions and restore your pinned actions";
        restore.addEventListener("click", () => clearAI());
        restoreRow.appendChild(restore);
        this.pinnedStrip.appendChild(restoreRow);
      }
    }

    buildOverflow(showingAI) {
      const wrap = document.createElement("div");
      wrap.className = "pin-overflow";
      const btn = document.createElement("button");
      btn.className = "pin-overflow__btn";
      btn.innerHTML = ICONS.chevron;
      btn.title = showingAI ? "Your pinned actions (kept)" : "More pinned actions";
      btn.setAttribute("aria-label", btn.title);
      btn.addEventListener("click", (e) => { e.stopPropagation(); this.overflowOpen = !this.overflowOpen; this.renderPins(); });
      wrap.appendChild(btn);

      const menu = document.createElement("div");
      menu.className = "pin-overflow__menu";
      menu.hidden = !this.overflowOpen;
      if (showingAI) {
        menu.appendChild(overflowHeader("Your pinned actions"));
        if (state.pinned.length) {
          state.pinned.forEach((id) => menu.appendChild(this.overflowItem(id)));
          menu.appendChild(overflowNote("Restored when you clear Einstein."));
        } else {
          menu.appendChild(overflowNote("You have no pinned actions."));
        }
        const divider = document.createElement("div");
        divider.className = "pin-overflow__divider";
        menu.appendChild(divider);
      }
      // Normal mode: any pins that don't fit the row are injected above the Edit entry by layoutPinRow.

      // Manage pins entry point (dual-listbox editor).
      const edit = document.createElement("button");
      edit.className = "pin-overflow__item pin-overflow__edit";
      edit.innerHTML = '<span class="pin-overflow__ico">' + ICONS.pin + "</span><span>Edit pinned actions…</span>";
      edit.addEventListener("click", () => { this.overflowOpen = false; this.renderPins(); openPinEditor(); });
      menu.appendChild(edit);

      wrap.appendChild(menu);
      return wrap;
    }

    // Single-row pins: keep as many inline as the track's width allows, push the rest into the caret menu.
    // The track is flex-shrinkable with overflow:hidden, so its clientWidth is the real space the
    // column grants (never inflated by the chips). Re-runs on every render and on ResizeObserver ticks,
    // so a wider display reveals more buttons automatically.
    layoutPinRow(track, chipEls, overflow) {
      const available = track.clientWidth;
      // When the pane is hidden (display:none) the width reads 0 — leave every pin inline and
      // let the ResizeObserver re-fit once the pane becomes visible.
      if (available <= 0) return;

      const menu = overflow.querySelector(".pin-overflow__menu");
      const editBtn = menu.querySelector(".pin-overflow__edit");
      const cs = getComputedStyle(track);
      const gap = parseFloat(cs.columnGap || cs.gap) || 10;

      let used = 0;
      let overflowing = false;
      const overflowIds = [];
      for (const { id, el } of chipEls) {
        const next = used + (used ? gap : 0) + el.offsetWidth;
        if (!overflowing && next <= available) {
          used = next;
        } else {
          overflowing = true;
          el.remove();
          overflowIds.push(id);
        }
      }

      if (overflowIds.length) {
        const frag = document.createDocumentFragment();
        overflowIds.forEach((id) => frag.appendChild(this.overflowItem(id)));
        const divider = document.createElement("div");
        divider.className = "pin-overflow__divider";
        frag.appendChild(divider);
        menu.insertBefore(frag, editBtn);
      }
    }

    overflowItem(id) {
      const action = actionById(id);
      const item = document.createElement("button");
      item.className = "pin-overflow__item";
      // No category icon here — the label alone matches how the pinned buttons read.
      item.innerHTML = "<span></span>";
      item.querySelector("span").textContent = action.name;
      item.addEventListener("click", () => { this.overflowOpen = false; launchAction(id, this.viewId); });
      return item;
    }
  }

  function refreshLaunchers() {
    for (const l of launchers) {
      l.renderPins();
      if (l.isOpen()) l.renderDropdown();
    }
  }

  function togglePin(actionId) {
    const i = state.pinned.indexOf(actionId);
    if (i >= 0) {
      state.pinned.splice(i, 1);
      toast("Unpinned: " + actionById(actionId).name);
    } else {
      state.pinned.push(actionId);
      toast("Pinned: " + actionById(actionId).name);
    }
    refreshLaunchers();
  }

  /* ---------------- Einstein autofill (intent-based, reversible) ---------------- */

  // Latest stage whose message threshold the conversation has reached (-1 = none yet).
  function currentStageIndex(chatIndex) {
    let idx = -1;
    AI_STAGES.forEach((s, i) => { if (chatIndex >= s.minMessages) idx = i; });
    return idx;
  }

  // Union of actions across the currently selected intents (order-preserving, deduped).
  function selectedAIActionIds() {
    const ids = [];
    for (const intent of state.ai.intents) {
      if (!intent.selected) continue;
      for (const aid of intent.actionIds) if (!ids.includes(aid)) ids.push(aid);
    }
    return ids;
  }

  function invokeAutofill() {
    const ai = state.ai;
    if (!ai.enabled || ai.loading) return;
    const stageIdx = currentStageIndex(state.chatIndex);
    if (stageIdx < 0) {
      toast("Einstein hasn’t heard enough of the conversation yet — advance the chat first.", true);
      return;
    }
    // Non-blocking: show the spinner but keep the current actions clickable until results land.
    ai.loading = true;
    refreshLaunchers();
    setTimeout(() => {
      ai.loading = false;
      ai.active = true;
      ai.lastStageIndex = stageIdx;
      ai.feedback = null;
      ai.intents = AI_STAGES[stageIdx].intents.map((it) => ({ ...it, selected: true }));
      refreshLaunchers();
      const n = selectedAIActionIds().length;
      toast("Einstein extracted " + ai.intents.length + " intent" + (ai.intents.length === 1 ? "" : "s") +
        " and suggested " + n + " action" + (n === 1 ? "" : "s"), true);
    }, 1100);
  }

  // Reversible: clears the AI overlay and restores the rep's untouched pinned actions.
  function clearAI() {
    state.ai.active = false;
    state.ai.intents = [];
    state.ai.feedback = null;
    refreshLaunchers();
  }

  function setEinsteinEnabled(on) {
    state.ai.enabled = on;
    if (!on) { state.ai.active = false; state.ai.loading = false; state.ai.intents = []; }
    refreshLaunchers();
  }

  function overflowHeader(text) {
    const el = document.createElement("div");
    el.className = "pin-overflow__header";
    el.textContent = text;
    return el;
  }

  function overflowNote(text) {
    const el = document.createElement("div");
    el.className = "pin-overflow__note";
    el.textContent = text;
    return el;
  }

  /* ---------------- Pin editor (dual-listbox modal) ---------------- */
  const MAX_PINS = 10;

  function openPinEditor() {
    let working = state.pinned.slice(); // edit a working copy; Cancel discards
    let filter = "";

    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true" aria-label="Edit pinned actions">' +
        '<div class="modal__header">' +
          '<h2 class="modal__title">Edit Pinned Actions</h2>' +
          '<button class="modal__close" aria-label="Close">' + ICONS.close + "</button>" +
        "</div>" +
        '<div class="modal__body">' +
          '<p class="modal__subtitle">Pick the actions to pin beneath the search field, and set their order. You can pin up to ' + MAX_PINS + ".</p>" +
          '<div class="duallist">' +
            '<div class="duallist__pane">' +
              '<div class="duallist__pane-head"><span class="duallist__pane-title">Available actions</span><span class="duallist__count avail-count"></span></div>' +
              '<div class="duallist__search">' + ICONS.search + '<input type="text" placeholder="Search actions…" aria-label="Search available actions" /></div>' +
              '<div class="duallist__list avail-list"></div>' +
            "</div>" +
            '<div class="duallist__pane">' +
              '<div class="duallist__pane-head"><span class="duallist__pane-title">Pinned actions</span><span class="duallist__count sel-count"></span></div>' +
              '<div class="duallist__list sel-list"></div>' +
            "</div>" +
          "</div>" +
        "</div>" +
        '<div class="modal__footer">' +
          '<span class="modal__hint"></span>' +
          '<div class="modal__actions">' +
            '<button class="slds-button slds-button_neutral modal-cancel">Cancel</button>' +
            '<button class="slds-button slds-button_brand modal-save">Save</button>' +
          "</div>" +
        "</div>" +
      "</div>";
    document.body.appendChild(backdrop);

    const availList = backdrop.querySelector(".avail-list");
    const selList = backdrop.querySelector(".sel-list");
    const availCount = backdrop.querySelector(".avail-count");
    const selCount = backdrop.querySelector(".sel-count");
    const searchInput = backdrop.querySelector(".duallist__search input");
    const hint = backdrop.querySelector(".modal__hint");

    // Soft tinted pill, single gray label; no category icon (keeps the editor calm and matches the overflow menu).
    const badge = (a) => '<span class="cat-badge" style="background:' + CATEGORIES[a.category].tint + '">' + CATEGORIES[a.category].label + "</span>";
    const proBadge = (a) => a.pro ? '<span class="pro-badge">Pro</span>' : "";
    const rowMain = (a) => '<span class="duallist__row-main"><span class="duallist__name">' + escapeHtml(a.name) + "</span>" + badge(a) + proBadge(a) + "</span>";

    function renderAvail() {
      const f = filter.trim().toLowerCase();
      const items = ACTIONS
        .filter((a) => !working.includes(a.id))
        .filter((a) => !f || a.name.toLowerCase().includes(f) || a.description.toLowerCase().includes(f) || CATEGORIES[a.category].label.toLowerCase().includes(f))
        .sort((a, b) => CATEGORIES[a.category].label.localeCompare(CATEGORIES[b.category].label) || a.name.localeCompare(b.name));
      const atCap = working.length >= MAX_PINS;
      availCount.textContent = items.length + " available";
      availList.innerHTML = "";
      if (!items.length) {
        availList.innerHTML = '<div class="duallist__empty">' + (f ? "No actions match your search." : "All actions are pinned.") + "</div>";
        return;
      }
      for (const a of items) {
        const row = document.createElement("button");
        row.className = "duallist__row";
        row.disabled = atCap;
        row.title = atCap ? "You can pin up to " + MAX_PINS + " actions" : a.description;
        row.innerHTML = rowMain(a) + '<span class="duallist__add">' + ICONS.plus + "</span>";
        row.addEventListener("click", () => { if (working.length < MAX_PINS) { working.push(a.id); renderAll(); } });
        availList.appendChild(row);
      }
    }

    function renderSel() {
      selCount.textContent = working.length + " of " + MAX_PINS;
      selCount.classList.toggle("is-full", working.length >= MAX_PINS);
      selList.innerHTML = "";
      if (!working.length) {
        selList.innerHTML = '<div class="duallist__empty">No actions pinned yet — add from the left.</div>';
        return;
      }
      working.forEach((id, i) => {
        const a = actionById(id);
        const row = document.createElement("div");
        row.className = "duallist__row duallist__row--sel";
        row.innerHTML = rowMain(a) +
          '<span class="duallist__reorder">' +
            '<button class="duallist__mv" data-mv="up" ' + (i === 0 ? "disabled" : "") + ' aria-label="Move up">' + ICONS.arrowUp + "</button>" +
            '<button class="duallist__mv" data-mv="down" ' + (i === working.length - 1 ? "disabled" : "") + ' aria-label="Move down">' + ICONS.arrowDown + "</button>" +
            '<button class="duallist__remove" aria-label="Remove">' + ICONS.close + "</button>" +
          "</span>";
        row.querySelector('[data-mv="up"]').addEventListener("click", () => { if (i > 0) { [working[i - 1], working[i]] = [working[i], working[i - 1]]; renderAll(); } });
        row.querySelector('[data-mv="down"]').addEventListener("click", () => { if (i < working.length - 1) { [working[i + 1], working[i]] = [working[i], working[i + 1]]; renderAll(); } });
        row.querySelector(".duallist__remove").addEventListener("click", () => { working.splice(i, 1); renderAll(); });
        selList.appendChild(row);
      });
    }

    function renderAll() {
      renderAvail();
      renderSel();
      hint.textContent = working.length >= MAX_PINS ? "Maximum of " + MAX_PINS + " pinned actions reached." : "";
    }

    function close() { document.removeEventListener("keydown", onKey); backdrop.remove(); }
    function onKey(e) { if (e.key === "Escape") close(); }

    searchInput.addEventListener("input", () => { filter = searchInput.value; renderAvail(); });
    backdrop.querySelector(".modal__close").addEventListener("click", close);
    backdrop.querySelector(".modal-cancel").addEventListener("click", close);
    backdrop.querySelector(".modal-save").addEventListener("click", () => {
      state.pinned = working.slice();
      refreshLaunchers();
      toast("Pinned actions updated (" + working.length + ")");
      close();
    });
    backdrop.addEventListener("mousedown", (e) => { if (e.target === backdrop) close(); });
    document.addEventListener("keydown", onKey);

    renderAll();
    searchInput.focus();
  }

  /* ---------------- Chat panel ---------------- */
  const chatMessages = document.getElementById("chat-messages");
  const chatNextBtn = document.getElementById("chat-next");
  const chatAutoplayBtn = document.getElementById("chat-autoplay");
  const chatRestartBtn = document.getElementById("chat-restart");

  function renderChat() {
    chatMessages.innerHTML = "";
    for (let i = 0; i < state.chatIndex && i < CHAT_SCRIPT.length; i++) {
      const m = CHAT_SCRIPT[i];
      const el = document.createElement("div");
      el.className = "chat-msg chat-msg--" + m.from;
      el.innerHTML = '<div class="chat-msg__who">' + (m.from === "customer" ? "Sari" : "Kitto (you)") + '</div><div class="chat-msg__bubble"></div>';
      el.querySelector(".chat-msg__bubble").textContent = m.text;
      chatMessages.appendChild(el);
    }
    if (state.chatIndex >= CHAT_SCRIPT.length) {
      const done = document.createElement("div");
      done.className = "chat-panel__ended";
      done.textContent = "End of scripted conversation";
      chatMessages.appendChild(done);
      stopAutoplay();
    }
    chatNextBtn.disabled = state.chatIndex >= CHAT_SCRIPT.length;
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function nextMessage() {
    if (state.chatIndex < CHAT_SCRIPT.length) {
      state.chatIndex++;
      renderChat();
      refreshLaunchers(); // surfaces the "new suggestions" dot when a new stage is reached
    }
  }

  function stopAutoplay() {
    if (state.autoplay) {
      clearInterval(state.autoplay);
      state.autoplay = null;
      chatAutoplayBtn.textContent = "▶ Auto-play";
    }
  }

  chatNextBtn.addEventListener("click", nextMessage);
  chatAutoplayBtn.addEventListener("click", () => {
    if (state.autoplay) { stopAutoplay(); return; }
    if (state.chatIndex >= CHAT_SCRIPT.length) return;
    state.autoplay = setInterval(nextMessage, 2200);
    chatAutoplayBtn.textContent = "⏸ Pause";
  });
  chatRestartBtn.addEventListener("click", () => {
    stopAutoplay();
    state.chatIndex = 1;
    state.ai.active = false;
    state.ai.loading = false;
    state.ai.intents = [];
    state.ai.lastStageIndex = -1;
    state.ai.feedback = null;
    renderChat();
    refreshLaunchers();
  });

  /* ---------------- Customer profile card ---------------- */
  function buildProfileCard(container) {
    const p = CUSTOMER_PROFILE;
    let insightIndex = 0;

    const card = document.createElement("div");
    card.className = "detail-card profile-card";
    container.appendChild(card);

    function gaugeSvg(score) {
      const r = 24, circ = 2 * Math.PI * r, filled = (score / 100) * circ;
      return '<svg viewBox="0 0 58 58">' +
        '<circle cx="29" cy="29" r="' + r + '" fill="none" stroke="#ece6de" stroke-width="5"/>' +
        '<circle cx="29" cy="29" r="' + r + '" fill="none" stroke="#dd7a01" stroke-width="5" stroke-linecap="round" stroke-dasharray="' + filled.toFixed(1) + ' ' + circ.toFixed(1) + '"/>' +
        "</svg>";
    }

    function render() {
      const ins = p.insights[insightIndex];
      card.innerHTML =
        '<button class="profile-card__menu" aria-label="Profile options" aria-haspopup="true">' + ICONS.chevron + "</button>" +
        '<div class="profile-card__menu-list" hidden>' +
          '<button data-menu="edit">Edit profile</button>' +
          '<button data-menu="record">Open full 360° record</button>' +
          '<button data-menu="merge">Find duplicate contacts</button>' +
        "</div>" +
        '<div class="profile-card__header">' +
          '<div class="profile-card__avatar"><img src="assets/customer-avatar.png" alt="' + escapeHtml(p.fullName) + '" /></div>' +
          '<div class="profile-card__headmain">' +
            '<div class="profile-card__badges">' +
              p.badges.map((b) => '<span class="profile-badge profile-badge--' + b.kind + '">' + escapeHtml(b.label) + "</span>").join("") +
            "</div>" +
            '<div class="profile-card__name">' + escapeHtml(p.fullName) + "</div>" +
            '<div class="profile-card__meta">' +
              "<span>Nickname: <strong>" + escapeHtml(p.nickname) + "</strong></span>" +
              '<span title="' + escapeHtml(p.pronouns) + '">Pronouns: <strong>' + escapeHtml(p.pronouns) + "</strong></span>" +
            "</div>" +
          "</div>" +
        "</div>" +
        '<div class="profile-card__contact">' +
          '<a class="profile-row profile-row--link" href="tel:' + p.phone.replace(/[^0-9+]/g, "") + '">' + ICONS.phone + "<span>" + escapeHtml(p.phone) + "</span></a>" +
          '<a class="profile-row profile-row--link" href="mailto:' + escapeHtml(p.email) + '">' + ICONS.mail + "<span>" + escapeHtml(p.email) + "</span></a>" +
          '<div class="profile-row profile-row--muted">' + ICONS.location + "<span>" + escapeHtml(p.location) + "</span></div>" +
        "</div>" +
        '<div class="profile-card__tags">' +
          p.tags.map((t) => '<span class="profile-tag' + (t.link ? " profile-tag--link" : "") + '">' + escapeHtml(t.label) + "</span>").join("") +
        "</div>" +
        '<div class="profile-section">' +
          '<div class="profile-section__title">Retention Score</div>' +
          '<div class="retention">' +
            '<div class="retention__gauge">' + gaugeSvg(p.retention.score) + '<div class="retention__gauge-label">' + p.retention.score + "%</div></div>" +
            '<div class="retention__body">' +
              '<div class="retention__risk">Risk of Attrition: ' + escapeHtml(p.retention.risk) + "</div>" +
              '<div class="retention__note">' + escapeHtml(p.retention.note) + "</div>" +
            "</div>" +
          "</div>" +
        "</div>" +
        '<div class="einstein-card">' +
          '<div class="einstein-card__body">' +
            '<div class="einstein-card__icon">' + ICONS.einstein + "</div>" +
            '<div class="einstein-card__text">' + escapeHtml(ins.text) + "</div>" +
          "</div>" +
          '<div class="einstein-card__recs">' +
            '<div class="einstein-card__recs-title">Einstein recommends:</div>' +
            "<ul>" +
              ins.recommendations.map((r, i) =>
                "<li>" + escapeHtml(r.prefix) + ' <a data-rec="' + i + '">' + escapeHtml(r.linkText) + "</a></li>").join("") +
            "</ul>" +
          "</div>" +
          '<div class="einstein-card__meta">Generated: ' + escapeHtml(ins.generated) + "</div>" +
          '<div class="einstein-card__links"><a data-link="past">See past insights</a> | <a data-link="regen">Regenerate insights</a></div>' +
        "</div>";
      wire();
    }

    function wire() {
      const menuBtn = card.querySelector(".profile-card__menu");
      const menuList = card.querySelector(".profile-card__menu-list");
      menuBtn.addEventListener("click", (e) => { e.stopPropagation(); menuList.hidden = !menuList.hidden; });
      menuList.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
        const labels = { edit: "Opening profile editor…", record: "Opening full 360° record…", merge: "Scanning for duplicate contacts…" };
        toast(labels[b.dataset.menu]);
        menuList.hidden = true;
      }));
      card.querySelectorAll(".einstein-card__recs a[data-rec]").forEach((a) => a.addEventListener("click", () => {
        const rec = p.insights[insightIndex].recommendations[+a.dataset.rec];
        if (rec.actionId) launchAction(rec.actionId, "customer");
        else toast("Queued: " + rec.linkText);
      }));
      card.querySelector('a[data-link="regen"]').addEventListener("click", () => {
        insightIndex = (insightIndex + 1) % p.insights.length;
        render();
        toast("Einstein generated a fresh insight", true);
      });
      card.querySelector('a[data-link="past"]').addEventListener("click", () => toast("Opening insight history…"));
    }

    document.addEventListener("mousedown", (e) => {
      const menuBtn = card.querySelector(".profile-card__menu");
      const menuList = card.querySelector(".profile-card__menu-list");
      if (menuList && !menuList.hidden && !menuBtn.contains(e.target) && !menuList.contains(e.target)) {
        menuList.hidden = true;
      }
    });

    render();
  }

  /* ---------------- Knowledge component ---------------- */
  function buildKnowledgeCard(container, viewId) {
    const card = document.createElement("div");
    card.className = "detail-card knowledge-card";
    card.innerHTML =
      '<div class="detail-card__header">' +
        "<span>Knowledge</span>" +
        '<button class="card-menu-btn" title="Knowledge component options" aria-label="Knowledge options">' + ICONS.chevron + "</button>" +
      "</div>" +
      '<div class="detail-card__body">' +
        '<div class="knowledge-toolbar">' +
          '<div class="knowledge-search">' + ICONS.search +
            '<input type="text" placeholder="Search Knowledge" aria-label="Search Knowledge" autocomplete="off" />' +
          "</div>" +
          '<div class="knowledge-sortwrap">' +
            '<button class="knowledge-sort-btn" title="Sort" aria-haspopup="true" aria-expanded="false">' + ICONS.sort + ICONS.chevron + "</button>" +
            '<div class="knowledge-sort-menu" hidden>' +
              '<button data-sort="relevance">Relevance</button>' +
              '<button data-sort="published">Last Published</button>' +
              '<button data-sort="title">Title (A–Z)</button>' +
            "</div>" +
          "</div>" +
        "</div>" +
        '<div class="knowledge-suggested">Suggested Articles</div>' +
        '<div class="knowledge-meta"></div>' +
        '<div class="knowledge-list"></div>' +
      "</div>";
    container.appendChild(card);

    const SORT_LABELS = { relevance: "Relevance", published: "Last Published", title: "Title" };
    let sortMode = "relevance";
    let sortOpen = false;

    const input = card.querySelector(".knowledge-search input");
    const meta = card.querySelector(".knowledge-meta");
    const listEl = card.querySelector(".knowledge-list");
    const sortBtn = card.querySelector(".knowledge-sort-btn");
    const sortMenu = card.querySelector(".knowledge-sort-menu");

    function renderList() {
      const q = input.value.trim().toLowerCase();
      const list = KNOWLEDGE_ARTICLES.filter((a) =>
        !q || a.title.toLowerCase().includes(q) || a.snippet.toLowerCase().includes(q) || a.number.includes(q));
      if (sortMode === "published") list.sort((a, b) => b.iso.localeCompare(a.iso));
      else if (sortMode === "title") list.sort((a, b) => a.title.localeCompare(b.title));
      // "relevance" keeps the authored (most-relevant-first) order
      meta.textContent = list.length + " Result" + (list.length === 1 ? "" : "s") + " · Sorted by " + SORT_LABELS[sortMode];
      listEl.innerHTML = "";
      if (!list.length) {
        listEl.innerHTML = '<div class="knowledge-empty">No articles match your search.</div>';
        return;
      }
      for (const a of list) {
        const row = document.createElement("div");
        row.className = "knowledge-article";
        row.innerHTML =
          '<div class="knowledge-article__main">' +
            '<a class="knowledge-article__title" role="button" tabindex="0"></a>' +
            '<div class="knowledge-article__meta">' + a.number + " · Last Published " + a.published + "</div>" +
            '<div class="knowledge-article__snippet"></div>' +
          "</div>" +
          '<button class="knowledge-article__more" title="Article actions" aria-label="Article actions">' + ICONS.chevron + "</button>";
        row.querySelector(".knowledge-article__title").textContent = a.title;
        row.querySelector(".knowledge-article__snippet").textContent = a.snippet;
        const open = () => openArticleTab(viewId, a.id);
        const titleEl = row.querySelector(".knowledge-article__title");
        titleEl.addEventListener("click", open);
        titleEl.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
        row.querySelector(".knowledge-article__more").addEventListener("click", () => toast("Article actions: " + a.title));
        listEl.appendChild(row);
      }
    }

    function setSortOpen(open) {
      sortOpen = open;
      sortMenu.hidden = !open;
      sortBtn.setAttribute("aria-expanded", String(open));
      sortBtn.classList.toggle("is-open", open);
    }

    function paintActiveSort() {
      sortMenu.querySelectorAll("button").forEach((b) =>
        b.classList.toggle("is-active", b.dataset.sort === sortMode));
    }

    input.addEventListener("input", renderList);
    sortBtn.addEventListener("click", (e) => { e.stopPropagation(); setSortOpen(!sortOpen); });
    sortMenu.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
      sortMode = b.dataset.sort;
      paintActiveSort();
      renderList();
      setSortOpen(false);
    }));
    document.addEventListener("mousedown", (e) => {
      if (sortOpen && !card.querySelector(".knowledge-sortwrap").contains(e.target)) setSortOpen(false);
    });
    card.querySelector(".card-menu-btn").addEventListener("click", () => toast("Knowledge component options"));

    paintActiveSort();
    renderList();
  }

  /* ---------------- Record pages ---------------- */
  function buildRecordPane(viewId) {
    const pane = document.createElement("div");
    pane.className = "subtab-pane";
    pane.id = subtabPaneId(viewId, "record");

    if (viewId === "customer") {
      pane.innerHTML =
        '<div class="record-columns">' +
          '<div class="record-col-profile"></div>' +
          '<div class="record-col-rest">' +
            '<div class="record-highlights record-highlights--slim">' +
              '<div class="record-highlights__label">Account Details</div>' +
              '<dl class="record-fields">' +
                '<div class="record-field"><dt>Account</dt><dd>' + CUSTOMER.account + "</dd></div>" +
                '<div class="record-field"><dt>Plan</dt><dd>' + CUSTOMER.plan + "</dd></div>" +
                '<div class="record-field"><dt>Status</dt><dd>' + CUSTOMER.status + "</dd></div>" +
                '<div class="record-field"><dt>Balance</dt><dd class="is-alert">' + CUSTOMER.balance + "</dd></div>" +
              "</dl>" +
            "</div>" +
            '<div class="record-columns-inner">' +
              '<div class="record-col-main"><div class="launcher-slot"></div>' +
                '<div class="detail-card"><div class="detail-card__header"><span>Contact &amp; Billing</span>' +
                  '<button class="card-menu-btn" data-card-menu="Contact &amp; Billing" title="Contact & Billing component options" aria-label="Contact & Billing options">' + ICONS.chevron + "</button></div>" +
                  '<div class="detail-card__body">' +
                    '<div class="record-group"><div class="record-group__title">Contact</div><dl>' +
                      "<div><dt>Street Address</dt><dd>" + CUSTOMER.street + "</dd></div>" +
                      "<div><dt>City</dt><dd>" + CUSTOMER.city + "</dd></div>" +
                      "<div><dt>Region</dt><dd>" + CUSTOMER.region + "</dd></div>" +
                      "<div><dt>Zip Code</dt><dd>" + CUSTOMER.zip + "</dd></div>" +
                      "<div><dt>Preferred Contact</dt><dd>" + CUSTOMER.preferredContact + "</dd></div>" +
                    "</dl></div>" +
                    '<div class="record-group"><div class="record-group__title">Billing</div><dl>' +
                      "<div><dt>Current Balance</dt><dd>" + CUSTOMER.balance + " · due Jul 15</dd></div>" +
                      "<div><dt>Last Payment</dt><dd>" + CUSTOMER.lastPayment + "</dd></div>" +
                      "<div><dt>Autopay</dt><dd>Enabled</dd></div>" +
                      "<div><dt>Payment Method</dt><dd>" + CUSTOMER.paymentMethod + "</dd></div>" +
                      "<div><dt>Billing Cycle</dt><dd>" + CUSTOMER.billingCycle + "</dd></div>" +
                      "<div><dt>Paperless Billing</dt><dd>" + CUSTOMER.paperless + "</dd></div>" +
                    "</dl></div>" +
                    '<div class="record-group"><div class="record-group__title">Service</div><dl>' +
                      "<div><dt>Devices</dt><dd>" + CUSTOMER.devices + "</dd></div>" +
                      "<div><dt>SIM Type</dt><dd>" + CUSTOMER.simType + "</dd></div>" +
                      "<div><dt>Contract</dt><dd>" + CUSTOMER.contract + "</dd></div>" +
                    "</dl></div>" +
                  "</div></div>" +
              "</div>" +
              '<div class="record-col-side">' +
                '<div class="detail-card"><div class="detail-card__header"><span>Open Cases (1)</span>' +
                  '<button class="card-menu-btn" data-card-menu="Open Cases" title="Open Cases component options" aria-label="Open Cases options">' + ICONS.chevron + "</button></div>" +
                  '<div class="detail-card__body"><p><strong>' + CASE_RECORD.number + "</strong> — " + escapeHtml(CASE_RECORD.subject) +
                  '<br/><small style="color:var(--text-weak)">' + CASE_RECORD.status + " · " + CASE_RECORD.priority + " priority · opened " + CASE_RECORD.opened + "</small></p></div>" +
                  '<a class="card-footer-link" data-open="closed-cases" role="button" tabindex="0">View closed cases (' + CLOSED_CASES.length + ") " + ICONS.chevronRight + "</a></div>" +
                '<div class="detail-card"><div class="detail-card__header"><span>Recent Activity</span>' +
                  '<button class="card-menu-btn" data-card-menu="Recent Activity" title="Recent Activity component options" aria-label="Recent Activity options">' + ICONS.chevron + "</button></div>" +
                  '<div class="detail-card__body"><p>• Live chat started — today 2:14 PM<br/>• May bill issued ($184.50) — Jun 28<br/>• Roaming usage in Spain — May 4–18<br/>• April bill paid ($95.20) — May 30</p></div></div>' +
                '<div class="knowledge-slot"></div>' +
              "</div>" +
            "</div>" +
          "</div>" +
        "</div>";
    } else {
      pane.innerHTML =
        '<div class="record-highlights">' +
          '<span class="record-highlights__icon record-highlights__icon--case"><svg viewBox="0 0 24 24"><path d="M20 6h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 0h-4V4h4v2z"/></svg></span>' +
          "<div>" +
            '<div class="record-highlights__type">Case</div>' +
            '<div class="record-highlights__title">' + escapeHtml(CASE_RECORD.subject) + "</div>" +
          "</div>" +
          '<dl class="record-fields">' +
            '<div class="record-field"><dt>Case Number</dt><dd>' + CASE_RECORD.number + "</dd></div>" +
            '<div class="record-field"><dt>Status</dt><dd>' + CASE_RECORD.status + "</dd></div>" +
            '<div class="record-field"><dt>Priority</dt><dd class="is-alert">' + CASE_RECORD.priority + "</dd></div>" +
            '<div class="record-field"><dt>Origin</dt><dd>' + CASE_RECORD.origin + "</dd></div>" +
          "</dl>" +
        "</div>" +
        '<div class="record-columns">' +
          '<div class="record-col-main"><div class="launcher-slot"></div>' +
            '<div class="detail-card"><div class="detail-card__header">Case Details</div>' +
              '<div class="detail-card__body"><p>' + escapeHtml(CASE_RECORD.description) + "</p></div></div>" +
          "</div>" +
          '<div class="record-col-side">' +
            '<div class="detail-card"><div class="detail-card__header">Contact</div>' +
              '<div class="detail-card__body"><dl>' +
                "<div><dt>Name</dt><dd>" + escapeHtml(CASE_RECORD.contact) + "</dd></div>" +
                "<div><dt>Account</dt><dd>" + CUSTOMER.account + "</dd></div>" +
                "<div><dt>Phone</dt><dd>" + CUSTOMER.phone + "</dd></div>" +
                "<div><dt>Plan</dt><dd>" + CUSTOMER.plan + "</dd></div>" +
              "</dl></div></div>" +
          "</div>" +
        "</div>";
    }

    document.querySelector('.subtab-contents[data-view="' + viewId + '"]').appendChild(pane);
    new Launcher(pane.querySelector(".launcher-slot"), viewId);
    if (viewId === "customer") {
      buildProfileCard(pane.querySelector(".record-col-profile"));
      buildKnowledgeCard(pane.querySelector(".knowledge-slot"), viewId);
      pane.querySelectorAll(".card-menu-btn[data-card-menu]").forEach((btn) => {
        btn.addEventListener("click", () => toast(btn.dataset.cardMenu + " component options"));
      });
      const closedLink = pane.querySelector('.card-footer-link[data-open="closed-cases"]');
      const openClosed = () => openClosedCasesTab(viewId);
      closedLink.addEventListener("click", openClosed);
      closedLink.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openClosed(); } });
    }
  }

  /* ---------------- Console nav ---------------- */
  function setNav(navId) {
    state.activeNav = navId;
    document.querySelectorAll(".console-nav__tab").forEach((t) => {
      t.classList.toggle("is-active", t.dataset.nav === navId);
    });
    document.querySelectorAll(".view").forEach((v) => {
      v.hidden = v.dataset.view !== navId;
    });
  }
  document.querySelectorAll(".console-nav__tab").forEach((t) => {
    t.addEventListener("click", () => setNav(t.dataset.nav));
  });

  /* ---------------- Global keyboard ---------------- */
  document.addEventListener("keydown", (e) => {
    const el = document.activeElement;
    const inField = !!el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable);
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      // Ctrl/Cmd+K focuses the search field.
      e.preventDefault();
      focusActiveLauncher();
    } else if (e.key === "/" && !inField) {
      e.preventDefault();
      focusActiveLauncher();
    } else if (e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === "h" || e.key === "H")) {
      // Shift+H toggles the presenter spotlight ring on the Actions Launcher.
      if (inField) return;
      e.preventDefault();
      document.querySelectorAll(".launcher-card").forEach((c) => c.classList.toggle("highlight-pulse"));
    } else if (e.key === "Escape") {
      document.querySelectorAll(".launcher-card.highlight-pulse").forEach((c) => c.classList.remove("highlight-pulse"));
    }
  });

  function focusActiveLauncher() {
    const view = state.views[state.activeNav];
    // Launcher lives on the record subtab; switch to it if needed.
    if (view.activeSubtab !== "record") activateSubtab(state.activeNav, "record");
    const pane = document.getElementById(subtabPaneId(state.activeNav, "record"));
    const input = pane && pane.querySelector(".launcher-search input");
    if (input) { input.focus(); input.select(); }
  }

  /* ---------------- Init ---------------- */
  buildRecordPane("customer");
  buildRecordPane("case");
  renderSubtabBar("customer");
  renderSubtabBar("case");
  activateSubtab("customer", "record");
  activateSubtab("case", "record");
  setNav("customer");
  renderChat();

  // Utility bar (persistent footer) — each item surfaces its toast.
  document.querySelectorAll(".utility-item[data-toast]").forEach((btn) => {
    btn.addEventListener("click", () => toast(btn.dataset.toast));
  });

  // App Launcher (waffle) — opens the app switcher.
  const appLauncher = document.querySelector(".console-nav__app-icon");
  if (appLauncher) appLauncher.addEventListener("click", () => toast("Opening App Launcher"));

  // Header action icons (notifications / settings / help).
  document.querySelectorAll(".app-header__icon-btn[data-toast]").forEach((btn) => {
    btn.addEventListener("click", () => toast(btn.dataset.toast));
  });

  // Collapsible live-chat panel (CSR view): collapse button hides it, handle restores it.
  const workspaceEl = document.querySelector(".workspace");
  const chatCollapseBtn = document.getElementById("chat-collapse");
  const chatHandleBtn = document.getElementById("chat-handle");
  if (chatCollapseBtn) chatCollapseBtn.addEventListener("click", () => workspaceEl.classList.add("chat-collapsed"));
  if (chatHandleBtn) chatHandleBtn.addEventListener("click", () => workspaceEl.classList.remove("chat-collapsed"));

  // Case tab subtitle = the actual case title, truncated to 15 chars.
  // The full title tooltip lives on the whole tab so it shows anywhere within the tab.
  const caseSub = document.querySelector(".console-nav__tab-sub");
  const caseTab = document.querySelector('.console-nav__tab[data-nav="case"]');
  if (caseSub) caseSub.textContent = CASE_RECORD.subject.slice(0, 15).trimEnd() + "…";
  if (caseTab) caseTab.title = CASE_RECORD.subject;

  // Belt-and-suspenders with the per-launcher ResizeObserver: a window resize (including
  // maximize/restore) re-fits the single-row pins even if an observer notification is missed.
  let pinResizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(pinResizeTimer);
    pinResizeTimer = setTimeout(() => refreshLaunchers(), 120);
  });
})();
