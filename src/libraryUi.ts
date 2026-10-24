// מגירת הספרייה: שמירה, חיפוש, פתיחה, ניגון בלחיצה אחת, ושכפול/שינוי שם/מחיקה.
import { allPlays, deletePlay, putPlay, requestPersistence } from "./db";
import { examplePlays } from "./examples";
import {
  TAGS, cleanName, copyName, createEntry, exportLibrary, filterPlays, mergeImport, newId, parseImport,
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
    if (linked) updateBtn.textContent = "עדכן את השמור";
    newBtn.textContent = linked ? "שמור כחדש" : "שמור בספרייה";
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
    toast(`"${entry.name}" נשמר בספרייה`);
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
    toast(`"${updated.name}" עודכן`);
  }

  $("#save-form").addEventListener("submit", (e) => { e.preventDefault(); saveNew(); });
  updateBtn.addEventListener("click", saveUpdate);

  // ---------- רשימה ----------
  renderTagChips(filterEl, (t) => filterTag === t, (t) => {
    filterTag = filterTag === t ? null : t;
    render();
    return filterTag === t;
  }, true);
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
      ? "עוד אין מהלכים שמורים. בנו מהלך על הלוח ושמרו אותו כאן."
      : "אין מהלכים שמתאימים לחיפוש.";

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
    open.setAttribute("aria-label", `פתח את ${e.name}`);
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
      name.setAttribute("aria-label", "שם חדש");
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
    sub.textContent = [`${e.play.steps.length} שלבים`, ...e.tags].join(" · ");
    meta.append(name, sub);
    open.append(thumb, meta);
    open.addEventListener("click", () => {
      if (renaming === e.id) return;
      host.open(e, false);
      closePanel();
    });

    const play = iconButton("card-play primary", `נגן את ${e.name}`, ICON_PLAY);
    play.disabled = e.play.steps.length < 2;
    play.addEventListener("click", () => { host.open(e, true); closePanel(); });

    const more = iconButton("card-more quiet", "פעולות נוספות", ICON_MORE);
    more.setAttribute("aria-expanded", String(expanded === e.id));
    more.addEventListener("click", () => { expanded = expanded === e.id ? null : e.id; render(); });

    li.append(open, play, more);

    if (expanded === e.id) {
      const actions = document.createElement("div");
      actions.className = "card-actions";
      actions.append(
        textButton("שתף כסרטון", () => { closePanel(); shareVideo(e.play, e.name); }),
        textButton("שנה שם", () => { renaming = e.id; expanded = null; render(); }),
        textButton("שכפל", () => duplicate(e)),
        textButton("מחק", () => remove(e), "danger"),
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
    toast(`"${e.name}" נמחק`, {
      label: "ביטול",
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
    a.download = `לוח-כדורמים-גיבוי-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(`נשמר קובץ גיבוי עם ${entries.length} מהלכים`);
  });
  $("#lib-import").addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    fileInput.value = "";
    if (!file) return;
    const incoming = parseImport(await file.text());
    if (!incoming) return toast("הקובץ הזה הוא לא גיבוי של לוח כדורמים");
    const toWrite = mergeImport(entries, incoming);
    for (const p of toWrite) await putPlay(p);
    entries = await allPlays();
    render();
    toast(toWrite.length ? `יובאו ${toWrite.length} מהלכים` : "כל המהלכים בקובץ כבר נמצאים בספרייה");
  });

  return {
    openPanel,
    entry: (id: string | undefined) => byId(id),
  };
}

// ---------- עזרים ----------
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
    all.textContent = "הכול";
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
    b.textContent = t;
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
