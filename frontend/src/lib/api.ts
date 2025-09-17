// src/lib/api.ts
export type UploadResponse = {
  date_dir: string
  star_connect: { nodes: any[]; edges: any[] }
  summary: { bullets: string[] }
  tasks: { items: any[] }
}

export async function uploadTranscript(file: File): Promise<UploadResponse> {
  const fd = new FormData()
  fd.append("file", file)

  const res = await fetch("/api/upload", {
    method: "POST",
    body: fd,
  })

  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Upload failed (${res.status}): ${txt}`)
  }

  // Ensure JSON + shape
  const data = await res.json()
  const parsed: UploadResponse = {
    date_dir: data.date_dir ?? null,
    star_connect: typeof data.star_connect === "string" ? JSON.parse(data.star_connect) : (data.star_connect ?? { nodes: [], edges: [] }),
    summary: typeof data.summary === "string" ? JSON.parse(data.summary) : (data.summary ?? { bullets: [] }),
    tasks: typeof data.tasks === "string" ? JSON.parse(data.tasks) : (data.tasks ?? { items: [] }),
  }

  // Hard guards so Orion never renders blank due to bad shapes
  if (!Array.isArray(parsed.star_connect?.nodes)) parsed.star_connect.nodes = []
  if (!Array.isArray(parsed.star_connect?.edges)) parsed.star_connect.edges = []
  if (!Array.isArray(parsed.summary?.bullets)) parsed.summary.bullets = []
  if (!Array.isArray(parsed.tasks?.items)) parsed.tasks.items = []

  return parsed
}
