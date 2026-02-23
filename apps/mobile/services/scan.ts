import { Platform } from "react-native";

export type ScanAnalyzeResponse = {
  session_id: string;
  measurements: Record<string, number>;
  body_composition: {
    bmi: number;
    body_fat_percentage: number;
    fat_mass_lbs: number;
    lean_mass_lbs: number;
    waist_to_hip_ratio: number;
  };
  health_assessment: {
    category: string;
    risk_level: string;
    recommendation: string;
  };
};

type UploadAsset = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

function guessName(view: "front" | "side" | "back", uri: string) {
  const ext = uri.split(".").pop()?.toLowerCase();
  const safeExt = ext && ["jpg", "jpeg", "png"].includes(ext) ? ext : "jpg";
  return `${view}.${safeExt}`;
}

function guessType(uri: string, mimeType?: string | null) {
  if (mimeType) return mimeType;
  const ext = uri.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  return "image/jpeg";
}

/**
 * Uploads 3 photos to POST /scan/analyze as multipart/form-data.
 * NOTE: Do NOT manually set Content-Type. Let fetch set the boundary.
 */
export async function analyzeScan(params: {
  baseUrl: string; // e.g. "http://10.0.2.2:8000" (android emulator) or your LAN IP
  token: string;
  front: UploadAsset;
  side: UploadAsset;
  back: UploadAsset;
}): Promise<ScanAnalyzeResponse> {
  const { baseUrl, token, front, side, back } = params;

  const fd = new FormData();

  const appendImage = (key: "front" | "side" | "back", asset: UploadAsset) => {
    const name = asset.fileName ?? guessName(key, asset.uri);
    const type = guessType(asset.uri, asset.mimeType);

    // On Android, sometimes uri needs "file://" prefix already included by picker (usually is).
    // Keep as-is.
    fd.append(key, {
      uri: asset.uri,
      name,
      type,
    } as any);
  };

  appendImage("front", front);
  appendImage("side", side);
  appendImage("back", back);

  const res = await fetch(`${baseUrl}/scan/analyze`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body: fd,
  });

  if (!res.ok) {
    let detail = `Upload failed (${res.status})`;
    try {
      const data = await res.json();
      detail = data?.detail ? String(data.detail) : detail;
    } catch {}
    throw new Error(detail);
  }

  return (await res.json()) as ScanAnalyzeResponse;
}
