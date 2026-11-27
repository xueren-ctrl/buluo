/**
 * 应用内下载安装 APK（Android 原生端专用）
 * ============================================
 * 流程：fetch（带进度）→ 写到应用缓存 → FileOpener 调起系统安装器。
 * 全程不打开浏览器。任一步失败时调用方回退到浏览器下载。
 *
 * 下载地址按顺序尝试：
 *   1. GitHub Release 的 APK 直链（checkForUpdate 原生模式返回的 apkUrl，
 *      发版后立刻可用，不用等网站同步）
 *   2. 网站自带的 /app-release.apk（本站同源文件，需 _headers 放行 CORS）
 */

import { Filesystem, Directory } from "@capacitor/filesystem";
import { FileOpener } from "@capacitor-community/file-opener";
import { log, warn } from "./logger";

/** 网站自带的 APK 地址（与首页下载按钮同源） */
export const SITE_APK_URL = "https://buluo-6uv.pages.dev/app-release.apk";
export const APK_MIME = "application/vnd.android.package-archive";

export interface DownloadProgress {
  loaded: number;
  total: number;
  /** 0-100；total 未知时为 -1 */
  percent: number;
}

/** ArrayBuffer → base64（分块，避免大 buffer 栈溢出） */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, i + CHUNK) as unknown as number[]
    );
  }
  return btoa(binary);
}

async function fetchWithProgress(
  url: string,
  onProgress?: (p: DownloadProgress) => void
): Promise<ArrayBuffer> {
  const res = await fetch(url, {
    cache: "no-cache",
    signal: AbortSignal.timeout(180000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (!res.body) throw new Error("响应无 body");
  const total = Number(res.headers.get("content-length") || 0);
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      loaded += value.length;
      onProgress?.({
        loaded,
        total,
        percent: total > 0 ? Math.round((loaded / total) * 100) : -1,
      });
    }
  }
  const merged = new Uint8Array(loaded);
  let off = 0;
  for (const c of chunks) {
    merged.set(c, off);
    off += c.length;
  }
  return merged.buffer;
}

/**
 * 按顺序尝试多个下载地址，任一成功即写入缓存并调起安装器。
 * 全部失败时抛错，调用方回退浏览器下载。
 */
export async function downloadAndInstallApk(
  urls: string[],
  onProgress?: (p: DownloadProgress) => void
): Promise<void> {
  let lastError: unknown = null;
  for (const url of urls) {
    try {
      log(`in-app-update: 开始下载 ${url}`);
      const buf = await fetchWithProgress(url, onProgress);
      const fileName = `buluo-update-${Date.now()}.apk`;
      await Filesystem.writeFile({
        path: fileName,
        directory: Directory.Cache,
        data: arrayBufferToBase64(buf),
        recursive: true,
      });
      const { uri } = await Filesystem.getUri({
        path: fileName,
        directory: Directory.Cache,
      });
      log(`in-app-update: 已保存到缓存，调起安装器 ${uri}`);
      await FileOpener.open({
        filePath: uri,
        contentType: APK_MIME,
        openWithDefault: true,
      });
      return;
    } catch (e) {
      warn(`in-app-update: ${url} 失败`, e);
      lastError = e;
    }
  }
  throw lastError ?? new Error("下载失败");
}
