export async function startScan(baseUrl: string, userId: number) {
  const res = await fetch(`${baseUrl}/scans/start?user_id=${userId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ template_version: "v1", source: "movenet" }),
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json(); // { id, ... }
}

export async function postSegment(baseUrl: string, scanId: number, segmentType: string, metrics: any, quality?: number) {
  const res = await fetch(`${baseUrl}/scans/${scanId}/segments/${segmentType}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ metrics, quality }),
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function finalizeScan(baseUrl: string, scanId: number) {
  const res = await fetch(`${baseUrl}/scans/${scanId}/finalize`, { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
