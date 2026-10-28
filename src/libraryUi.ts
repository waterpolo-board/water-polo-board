// מגירת הספרייה: שמירה, חיפוש, פתיחה, ניגון בלחיצה אחת, ושכפול/שינוי שם/מחיקה.
import { allPlays, deletePlay, putPlay, requestPersistence } from "./db";
import { stepCount, t, type Key } from "./i18n";
import { examplePlays } from "./examples";
import {
  TAGS, cleanName, copyName, createEntry, exportLibrary, filterPlays, mergeImport, newId, normalizeTags, parseImport,
  type SavedPlay, type Tag,
} from "./library";
import { clone, type Play } from "./model";
import { prefersReducedMotion } from "./motion";
import { thumbnailSvg } from "./thumbnail";
import { shareVideo } from "./videoUi";

export interface LibraryHost {
  current(): { play: Play; libraryId?: string };
  /** פותח מהלך על הלוח; autoplay = מנגן מיד. */
  open(entry: SavedPlay, autoplay: boolean): void;
  /** המהלך הפתוח נשמר / נותק מהספרייה. */
  linked(id: string | undefined): void;
}

const SEEDED_KEY = "wpb.seeded.v1";
const $ = <T extends Element>(sel: string) => document.querySelector<T>(sel)!;

const ICON_PLAY = `<svg class="icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4.2v11.6a.8.8 0 0 0 1.2.7l9.2-5.8a.8.8 0 0 0 0-1.4L7.2 3.5a.8.8 0 0 0-1.2.7z"/></svg>`;
const ICON_MORE = `<svg class="icon" viewBox="0 0 20 20" aria-hidden="true"><circle cx="4.5" cy="10" r="1.6"/><circle cx="10" cy="10" r="1.6"/><circle cx="15.5" cy="10" r="1.6"/></svg>`;

export async function initLibrary(host: LibraryHost) {
  const drawer = $<HTMLElement>("#library");
  const scrim = $<HTMLElement>("#scrim");
  const nameInput = $<HTMLInputElement>("#save-name");
  const saveTags = $<HTMLElement>("#save-tags");
  const updateBtn = $<HTMLButtonElement>("#save-update");
  const newBtn = $<HTMLButtonElement>("#save-new");
  const search = $<HTMLInputElement>("#lib-search");
  const filterEl = $<HTMLElement>("#lib-filter");
  const listEl = $<HTMLUListElement>("#lib-list");
  const emptyEl = $<HTMLElement>("#lib-empty");
  const fileInput = $<HTMLInputElement>("#lib-file");
  const saveForm = $<HTMLFormElement>("#save-form");
  const showSave = $<HTMLButtonElement>("#show-save");

  let entries: SavedPlay[] = [];
  let filterTag: Tag | null = null;
  let pickedTags = new Set<Tag>();
  let expanded: string | null = null; // כרטיס עם פעולות פתוחות
  let renaming: string | null = null;

  requestPersistence();
  entries = await allPlays();
  // מהלכים שנשמרו עם תגיות בעברית (לפני שהיו שפות) — ממירים פעם אחת למזהים
  for (const e of entries) {
    const tags = normalizeTags(e.tags);
    if (tags.join() !== e.tags.join()) {
      e.tags = tags;
      await putPlay(e);
    }
  }
  if (!localStorage.getItem(SEEDED_KEY)) {
    if (entries.length === 0) {
      for (const e of examplePlays()) await putPlay(e);
      entries = await allPlays();
    }
    try { localStorage.setItem(SEEDED_KEY, "1"); } catch { /* לא קריטי */ }
  }

  const byId = (id: string | undefined) => entries.find((e) => e.id === id);

  // ---------- פתיחה וסגירה ----------
  /** טופס השמירה פתוח רק כשבאים לשמור; אחרת הרשימה מקבלת את כל הגובה. */
  function setSaveOpen(open: boolean) {
    saveForm.hidden = !open;
    showSave.hidden = open;
  }
  showSave.addEventListener("click", () => {
    setSaveOpen(true);
    nameInput.focus();
  });

  function openPanel(focusSave = false) {
    expanded = null;
    renaming = null;
    setSaveOpen(focusSave);
    syncSaveForm();
    render();
    drawer.hidden = false;
    scrim.hidden = false;
    requestAnimationFrame(() => {
      drawer.classList.add("open");
      scrim.classList.add("open");
      if (focusSave) nameInput.focus();
    });
  }

  function closePanel() {
    drawer.classList.remove("open");
    scrim.classList.remove("open");
    const hide = () => { drawer.hidden = true; scrim.hidden = true; };
    if (prefersReducedMotion()) hide();
    else setTimeout(hide, 280);
  }

  scrim.addEventListener("click", closePanel);
  $("#lib-close").addEventListener("click", closePanel);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !drawer.hidden) closePanel();
  });

  // ---------- שמירה ----------
  function syncSaveForm() {
    const linked = byId(host.current().libraryId);
    nameInput.value = linked?.name ?? "";
    pickedTags = new Set(linked?.tags ?? []);
    renderTagChips(saveTags, (t) => pickedTags.has(t), (t) => {
      if (pickedTags.has(t)) pickedTags.delete(t); else pickedTags.add(t);
      return pickedTags.has(t);
    });
    updateBtn.hidden = !linked;
    if (linked) updateBtn.textContent = t("save.update");
    newBtn.textContent = linked ? t("save.asNew") : t("save.new");
    newBtn.classList.toggle("primary", !linked);
  }

  async function saveNew() {
    const name = cleanName(nameInput.value);
    if (!name) {
      nameInput.focus();
      nameInput.classList.add("shake");
      setTimeout(() => nameInput.classList.remove("shake"), 400);
      return;
    }
    const entry = createEntry(name, [...pickedTags], host.current().play);
    await putPlay(entry);
    entries.push(entry);
    host.linked(entry.id);
    syncSaveForm();
    render(entry.id);
    toast(t("toast.saved", { name: entry.name }));
  }

  async function saveUpdate() {
    const linked = byId(host.current().libraryId);
    if (!linked) return saveNew();
    const updated: SavedPlay = {
      ...linked,
      name: cleanName(nameInput.value) || linked.name,
      tags: [...pickedTags],
      play: clone(host.current().play),
      updatedAt: Date.now(),
    };
    await putPlay(updated);
    entries = entries.map((e) => (e.id === updated.id ? updated : e));
    host.linked(updated.id);
    render(updated.id);
    toast(t("toast.updated", { name: updated.name }));
  }

  $("#save-form").addEventListener("submit", (e) => { e.preventDefault(); saveNew(); });
  updateBtn.addEventListener("click", saveUpdate);

  // ---------- רשימה ----------
  const buildFilter = () =>
    renderTagChips(filterEl, (tag) => filterTag === tag, (tag) => {
      filterTag = filterTag === tag ? null : tag;
      render();
      return filterTag === tag;
    }, true);
  buildFilter();
  search.addEventListener("input", () => render());

  function render(flashId?: string) {
    // מעדכנים את מצב הכפתורים של הסינון (כפתור "הכול" ראשון)
    for (const b of filterEl.querySelectorAll<HTMLButtonElement>("button")) {
      const t = b.dataset.tag as Tag | undefined;
      b.setAttribute("aria-pressed", String(t ? filterTag === t : filterTag === null));
    }

    const shown = filterPlays(entries, search.value, filterTag);
    const currentId = host.current().libraryId;
    listEl.replaceChildren(...shown.map((e) => card(e, e.id === currentId)));
    emptyEl.hidden = shown.length > 0;
    emptyEl.textContent = entries.length === 0
      ? t("empty.none")
      : t("empty.noMatch");

    if (flashId && !prefersReducedMotion()) {
      listEl.querySelector(`[data-id="${CSS.escape(flashId)}"]`)?.animate(
        [{ backgroundColor: "var(--accent-soft)" }, { backgroundColor: "transparent" }],
        { duration: 1100, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
      );
    }
  }

  function card(e: SavedPlay, isCurrent: boolean): HTMLLIElement {
    const li = document.createElement("li");
    li.className = "card" + (isCurrent ? " current" : "");
    li.dataset.id = e.id;

    const open = document.createElement("button");
    open.className = "card-open";
    open.setAttribute("aria-label", t("card.open", { name: e.name }));
    const thumb = document.createElement("span");
    thumb.className = "thumb";
    thumb.innerHTML = thumbnailSvg(e.play); // נבנה מקוד שלנו בלבד, מספרים בלבד
    const meta = document.createElement("span");
    meta.className = "meta";
    const name = document.createElement(renaming === e.id ? "input" : "strong");
    if (name instanceof HTMLInputElement) {
      name.value = e.name;
      name.maxLength = 60;
      name.className = "rename";
      name.setAttribute("aria-label", t("card.renameLabel"));
      const done = (commit: boolean) => {
        if (renaming !== e.id) return;
        renaming = null;
        if (commit) renameEntry(e, name.value); else render();
      };
      name.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") done(true);
        if (ev.key === "Escape") { ev.stopPropagation(); done(false); }
      });
      name.addEventListener("blur", () => done(true));
      name.addEventListener("click", (ev) => ev.stopPropagation());
      requestAnimationFrame(() => { name.focus(); name.select(); });
    } else {
      name.textContent = e.name;
    }
    const sub = document.createElement("span");
    sub.className = "sub";
    sub.textContent = [stepCount(e.play.steps.length), ...e.tags.map((tag) => t(`tag.${tag}` as Key))].join(" · ");
    meta.append(name, sub);
    open.append(thumb, meta);
    open.addEventListener("click", () => {
      if (renaming === e.id) return;
      host.open(e, false);
      closePanel();
    });

    const play = iconButton("card-play primary", t("card.play", { name: e.name }), ICON_PLAY);
    play.disabled = e.play.steps.length < 2;
    play.addEventListener("click", () => { host.open(e, true); closePanel(); });

    const more = iconButton("card-more quiet", t("card.more"), ICON_MORE);
    more.setAttribute("aria-expanded", String(expanded === e.id));
    more.addEventListener("click", () => { expanded = expanded === e.id ? null : e.id; render(); });

    li.append(open, play, more);

    if (expanded === e.id) {
      const actions = document.createElement("div");
      actions.className = "card-actions";
      actions.append(
        textButton(t("card.video"), () => { closePanel(); shareVideo(e.play, e.name); }),
        textButton(t("card.rename"), () => { renaming = e.id; expanded = null; render(); }),
        textButton(t("card.duplicate"), () => duplicate(e)),
        textButton(t("card.delete"), () => remove(e), "danger"),
      );
      li.append(actions);
    }
    return li;
  }

  async function renameEntry(e: SavedPlay, value: string) {
    const name = cleanName(value);
    if (name && name !== e.name) {
      const updated = { ...e, name, updatedAt: Date.now() };
      await putPlay(updated);
      entries = entries.map((x) => (x.id === e.id ? updated : x));
      if (host.current().libraryId === e.id) { host.linked(e.id); syncSaveForm(); }
    }
    render(e.id);
  }

  async function duplicate(e: SavedPlay) {
    const now = Date.now();
    const copy: SavedPlay = { ...clone(e), id: newId(), name: copyName(e.name, entries.map((x) => x.name)), createdAt: now, updatedAt: now };
    await putPlay(copy);
    entries.push(copy);
    expanded = null;
    render(copy.id);
  }

  async function remove(e: SavedPlay) {
    await deletePlay(e.id);
    entries = entries.filter((x) => x.id !== e.id);
    const wasLinked = host.current().libraryId === e.id;
    if (wasLinked) host.linked(undefined);
    expanded = null;
    syncSaveForm();
    render();
    toast(t("toast.deleted", { name: e.name }), {
      label: t("toast.undo"),
      run: async () => {
        await putPlay(e);
        entries.push(e);
        if (wasLinked) host.linked(e.id);
        syncSaveForm();
        render(e.id);
      },
    });
  }

  // ---------- גיבוי ----------
  $("#lib-export").addEventListener("click", () => {
    const blob = new Blob([exportLibrary(entries)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${t("backup.file")}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(t("toast.exported", { n: entries.length }));
  });
  $("#lib-import").addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    fileInput.value = "";
    if (!file) return;
    const incoming = parseImport(await file.text());
    if (!incoming) return toast(t("toast.notBackup"));
    const toWrite = mergeImport(entries, incoming);
    for (const p of toWrite) await putPlay(p);
    entries = await allPlays();
    render();
    toast(toWrite.length ? t("toast.imported", { n: toWrite.length }) : t("toast.importedNone"));
  });

  return {
    openPanel,
    entry: (id: string | undefined) => byId(id),
    /** אחרי החלפת שפה: בונים מחדש את כל הטקסטים במגירה. */
    refresh() {
      buildFilter();
      syncSaveForm();
      render();
    },
  };
}

// ---------- עזרים ----------
const labelOf = (tag: Tag) => t(`tag.${tag}` as Key);
function renderTagChips(
  host: HTMLElement,
  isOn: (t: Tag) => boolean,
  toggle: (t: Tag) => boolean,
  withAll = false,
) {
  host.replaceChildren();
  if (withAll) {
    const all = document.createElement("button");
    all.type = "button";
    all.className = "chip";
    all.textContent = t("all");
    all.setAttribute("aria-pressed", "true");
    all.addEventListener("click", () => {
      for (const t of TAGS) if (isOn(t)) toggle(t);
    });
    host.append(all);
  }
  for (const t of TAGS) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.dataset.tag = t;
    b.textContent = labelOf(t);
    b.setAttribute("aria-pressed", String(isOn(t)));
    b.addEventListener("click", () => b.setAttribute("aria-pressed", String(toggle(t))));
    host.append(b);
  }
}

function iconButton(cls: string, label: string, svg: string) {
  const b = document.createElement("button");
  b.className = cls;
  b.setAttribute("aria-label", label);
  b.innerHTML = svg;
  return b;
}

function textButton(label: string, run: () => void, cls = "") {
  const b = document.createElement("button");
  b.className = cls;
  b.textContent = label;
  b.addEventListener("click", run);
  return b;
}

// ---------- הודעה קצרה ----------
let toastTimer = 0;
export function toast(text: string, action?: { label: string; run: () => void }, ms = 5000) {
  const el = $<HTMLElement>("#toast");
  const btn = el.querySelector<HTMLButtonElement>(".toast-action")!;
  el.querySelector(".toast-text")!.textContent = text;
  btn.hidden = !action;
  btn.onclick = action ? () => { hide(); action.run(); } : null;
  if (action) btn.textContent = action.label;
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add("show"));
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(hide, ms);
  function hide() {
    el.classList.remove("show");
    clearTimeout(toastTimer);
    setTimeout(() => { if (!el.classList.contains("show")) el.hidden = true; }, 250);
  }
}
