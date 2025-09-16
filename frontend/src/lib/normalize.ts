import type { GraphT, EdgeT } from "./types"

// Merge reciprocal edges (A→B and B→A) into one undirected edge.
// Weight is summed; tasks are concatenated.
export function mergeReciprocalEdges(g: GraphT): GraphT {
  const key = (a: string, b: string) => (a < b ? `${a}__${b}` : `${b}__${a}`)
  const map = new Map<string, EdgeT>()

  for (const e of g.edges || []) {
    const k = key(e.source, e.target)
    if (!map.has(k)) {
      map.set(k, { source: e.source, target: e.target, weight: 0, tasks: [] })
    }
    const m = map.get(k)!
    m.weight = (m.weight ?? 0) + (e.weight ?? 1)
    if (e.tasks?.length) m.tasks = [...(m.tasks ?? []), ...e.tasks]

    // Canonicalize direction for stability
    const [a, b] = e.source < e.target ? [e.source, e.target] : [e.target, e.source]
    m.source = a
    m.target = b
  }

  return { nodes: g.nodes || [], edges: Array.from(map.values()) }
}
