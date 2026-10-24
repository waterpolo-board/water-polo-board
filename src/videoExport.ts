// יצירת סרטון MP4 ממהלך.
// דרך ראשית: WebCodecs (H.264) דרך Mediabunny — מהיר מזמן אמת וחלק בכל מכשיר.
// גיבוי: MediaRecorder בזמן אמת, למכשירים בלי מקודד H.264 ב-WebCodecs.
import { BufferTarget, CanvasSource, Mp4OutputFormat, Output, Quality, canEncodeVideo } from "mediabunny";
import type { Play } from "./model";
import { buildTimeline } from "./timeline";
import { VIDEO, createPainter, readPalette } from "./videoRender";

export interface VideoResult { blob: Blob; ext: "mp4" | "webm"; method: "webcodecs" | "recorder" }

export class VideoCancelled extends Error {}

export async function exportVideo(
  play: Play,
  title: string,
  onProgress: (p: number) => void,
  signal: AbortSignal,
): Promise<VideoResult> {
  const canvas = document.createElement("canvas");
  canvas.width = VIDEO.width;
  canvas.height = VIDEO.height;
  const ctx = canvas.getContext("2d", { alpha: false })!;
  const painter = createPainter(ctx, play, title, readPalette());
  const timeline = buildTimeline(play);

  const quality = new Quality({ bitrate: 4_000_000 });
  const canWebCodecs =
    typeof VideoEncoder !== "undefined" &&
    (await canEncodeVideo("avc", { width: VIDEO.width, height: VIDEO.height, quality }).catch(() => false));

  if (canWebCodecs) {
    try {
      return await encodeWebCodecs();
    } catch (err) {
      if (err instanceof VideoCancelled) throw err;
      console.warn("WebCodecs נכשל, עוברים להקלטה בזמן אמת", err);
    }
  }
  return encodeRecorder();

  async function encodeWebCodecs(): Promise<VideoResult> {
    const output = new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target: new BufferTarget() });
    const source = new CanvasSource(canvas, { codec: "avc", quality, keyFrameInterval: 2 });
    output.addVideoTrack(source, { frameRate: VIDEO.fps });
    await output.start();
    const frames = Math.ceil((timeline.duration / 1000) * VIDEO.fps) + 1;
    for (let i = 0; i < frames; i++) {
      if (signal.aborted) {
        await output.cancel();
        throw new VideoCancelled();
      }
      painter.paint(timeline.sceneAt((i / VIDEO.fps) * 1000));
      await source.add(i / VIDEO.fps, 1 / VIDEO.fps);
      onProgress((i + 1) / frames);
      if (i % 10 === 0) await new Promise((r) => setTimeout(r)); // נותנים לממשק להתעדכן
    }
    await output.finalize();
    return { blob: new Blob([output.target.buffer!], { type: "video/mp4" }), ext: "mp4", method: "webcodecs" };
  }

  function encodeRecorder(): Promise<VideoResult> {
    const types = ["video/mp4;codecs=avc1.42E01F", "video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
    const mimeType = types.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t));
    if (!mimeType) return Promise.reject(new Error("המכשיר הזה לא תומך ביצירת סרטונים"));

    const stream = canvas.captureStream(VIDEO.fps);
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);

    return new Promise((resolve, reject) => {
      let raf = 0;
      recorder.onstop = () => {
        cancelAnimationFrame(raf);
        stream.getTracks().forEach((t) => t.stop());
        if (signal.aborted) return reject(new VideoCancelled());
        const isMp4 = mimeType.startsWith("video/mp4");
        resolve({ blob: new Blob(chunks, { type: isMp4 ? "video/mp4" : "video/webm" }), ext: isMp4 ? "mp4" : "webm", method: "recorder" });
      };
      recorder.onerror = () => reject(new Error("ההקלטה נכשלה"));
      signal.addEventListener("abort", () => recorder.state !== "inactive" && recorder.stop(), { once: true });

      painter.paint(timeline.sceneAt(0));
      recorder.start(250);
      const t0 = performance.now();
      const loop = (now: number) => {
        const t = now - t0;
        painter.paint(timeline.sceneAt(t));
        onProgress(Math.min(1, t / timeline.duration));
        if (t < timeline.duration + 150) raf = requestAnimationFrame(loop);
        else recorder.stop();
      };
      raf = requestAnimationFrame(loop);
    });
  }
}

/** שם קובץ בטוח (עברית מותרת). */
export const videoFileName = (title: string, ext: string) =>
  `${title.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 60) || "מהלך"}.${ext}`;
