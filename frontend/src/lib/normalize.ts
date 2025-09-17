// src/lib/normalize.ts
// Make ANY backend shape safe for the graph.

export type EdgeTaskT = { title: string; details?: string | null; snippets?: string[] | null }
export type NodeT = { id: string; label: string; size?: number; group?: string }
export type EdgeT = { source: string; target: string; weight?: number; tasks?: EdgeTaskT[] }
export type GraphT = { nodes: NodeT[]; edges: EdgeT[] }

function toStr(x: any): string {
  if (x == null) return ""
  return typeof x === "string" ? x : String(x)
}
function toNum(x: any, fallback = 1): number {
  const n = Number(x)
  return Number.isFinite(n) ? n : fallback
}

export function safeGraphFromAny(raw: any): GraphT {
  const nodesArr: any[] = Array.isArray(raw?.nodes) ? raw.nodes : []
  const edgesArr: any[] = Array.isArray(raw?.edges) ? raw.edges : []

  // 1) nodes -> string ids/labels, sane size/group
  const nodes: NodeT[] = []
  const seen = new Set<string>()
  for (const n of nodesArr) {
    const id = toStr(n?.id || n?.name || n?.label)
    if (!id) continue
    if (seen.has(id)) continue
    seen.add(id)
    nodes.push({
      id,
      label: toStr(n?.label || id),
      size: Math.max(1, toNum(n?.size, 1)),
      group: toStr(n?.group || "1"),
    })
  }

  // index for validation
  const ok = new Set(nodes.map(n => n.id))

  // 2) edges -> string endpoints, drop self/unknowns, sane weight
  const edges: EdgeT[] = []
  for (const e of edgesArr) {
    const src = toStr((e as any)?.source?.id ?? (e as any)?.source)
    const dst = toStr((e as any)?.target?.id ?? (e as any)?.target)
    if (!src || !dst) continue
    if (src === dst) continue
    if (!ok.has(src) || !ok.has(dst)) continue
    edges.push({
      source: src,
      target: dst,
      weight: Math.max(1, toNum((e as any)?.weight, 1)),
      tasks: Array.isArray((e as any)?.tasks) ? (e as any).tasks : [],
    })
  }

  return { nodes, edges }
}

/** Optional: merge A→B and B→A into one thicker edge to reduce clutter */
export function mergeReciprocalEdges(g: GraphT): GraphT {
  const key = (a: string, b: string) => (a < b ? `${a}||${b}` : `${b}||${a}`)
  const map = new Map<string, EdgeT>()

  for (const e of g.edges) {
    const k = key(e.source, e.target)
    const m = map.get(k)
    if (!m) {
      map.set(k, { ...e })
    } else {
      m.weight = (m.weight || 1) + (e.weight || 1)
      if (e.tasks?.length) {
        m.tasks = [...(m.tasks || []), ...e.tasks]
      }
    }
  }
  return { nodes: g.nodes, edges: Array.from(map.values()) }
}
