// חלון "סרטון": מכין, מראה תצוגה מקדימה, ומשתף (וואטסאפ וכו') או שומר לקובץ.
// השיתוף מופעל רק מלחיצה על "שתף" — דפדפנים דורשים לחיצה טרייה של המשתמש.
import { t } from "./i18n";
import type { Play } from "./model";
import { VideoCancelled, exportVideo, videoFileName } from "./videoExport";

const $ = <T extends Element>(sel: string) => document.querySelector<T>(sel)!;

let busy = false;

export async function shareVideo(play: Play, title: string) {
  if (busy) return;
  busy = true;
  const dialog = $<HTMLElement>("#video-dialog");
  const heading = $<HTMLElement>("#video-title");
  const sub = $<HTMLElement>("#video-sub");
  const bar = $<HTMLElement>("#video-bar");
  const progress = $<HTMLElement>("#video-progress");
  const preview = $<HTMLVideoElement>("#video-preview");
  const shareBtn = $<HTMLButtonElement>("#video-share");
  const saveBtn = $<HTMLButtonElement>("#video-save");
  const closeBtn = $<HTMLButtonElement>("#video-close");

  const controller = new AbortController();
  let url = "";

  const reset = () => {
    heading.textContent = t("video.making");
    sub.textContent = title;
    bar.style.transform = "scaleX(0)";
    progress.hidden = false;
    progress.setAttribute("aria-valuenow", "0");
    preview.hidden = true;
    shareBtn.hidden = true;
    saveBtn.hidden = true;
    closeBtn.textContent = t("video.cancel");
  };

  const close = () => {
    controller.abort();
    dialog.hidden = true;
    preview.pause();
    preview.removeAttribute("src");
    preview.load();
    if (url) URL.revokeObjectURL(url);
    closeBtn.onclick = shareBtn.onclick = saveBtn.onclick = null;
    document.removeEventListener("keydown", onKey);
    busy = false;
  };
  const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();

  reset();
  dialog.hidden = false;
  closeBtn.onclick = close;
  document.addEventListener("keydown", onKey);
  closeBtn.focus();

  try {
    const result = await exportVideo(
      play,
      title,
      (p) => {
        bar.style.transform = `scaleX(${p})`;
        progress.setAttribute("aria-valuenow", String(Math.round(p * 100)));
      },
      controller.signal,
    );
    const file = new File([result.blob], videoFileName(title, result.ext), { type: result.blob.type });
    url = URL.createObjectURL(result.blob);

    heading.textContent = t("video.ready");
    sub.textContent = `${title} · ${(result.blob.size / 1024 / 1024).toFixed(1)}MB`;
    progress.hidden = true;
    preview.src = url;
    preview.hidden = false;
    preview.play().catch(() => {});
    closeBtn.textContent = t("close");

    const canShare = typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });
    shareBtn.hidden = !canShare;
    saveBtn.hidden = false;
    saveBtn.classList.toggle("primary", !canShare);
    (canShare ? shareBtn : saveBtn).focus();

    shareBtn.onclick = async () => {
      try {
        await navigator.share({ files: [file], title, text: `${title} — ${t("app.title")}` });
      } catch (err) {
        if ((err as Error).name !== "AbortError") saveBtn.click(); // אם השיתוף נכשל — לפחות לשמור
      }
    };
    saveBtn.onclick = () => {
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.append(a);
      a.click();
      a.remove();
    };
  } catch (err) {
    if (err instanceof VideoCancelled) return;
    console.error(err);
    heading.textContent = t("video.failed");
    sub.textContent = (err as Error).message || t("video.failedHint");
    progress.hidden = true;
    closeBtn.textContent = t("close");
  }
}
