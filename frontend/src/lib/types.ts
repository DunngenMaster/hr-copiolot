// Types for the Orion graph
export type NodeT = { id: string; label: string; size?: number; group?: string }
export type EdgeTaskT = { title: string; details?: string | null; snippets?: string[] }
export type EdgeT = { source: string; target: string; weight?: number; tasks?: EdgeTaskT[] }
export type GraphT = { nodes: NodeT[]; edges: EdgeT[] }

// Galaxy-ish group → color
export const groupColor = (g?: string) => {
  const p: Record<string, string> = {
    "1": "#6EE7F9",
    "2": "#A78BFA",
    "3": "#FDE68A",
    default: "#93C5FD",
  }
  return p[g || "default"] || p.default
}
