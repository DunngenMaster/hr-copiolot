import { useMemo, useState } from "react"
import StarGraph from "./StarGraph"
import type { GraphT, EdgeTaskT } from "../lib/types"
import { mergeReciprocalEdges } from "../lib/normalize"

type NodeDetails = { partners: string[]; tasks: EdgeTaskT[] }

export default function OrionPanel({ data }: { data: GraphT | undefined }) {
  const [q, setQ] = useState("")
  const [focusId, setFocusId] = useState<string | null>(null)

  const safe = useMemo<GraphT>(
    () => ({ nodes: data?.nodes ?? [], edges: data?.edges ?? [] }),
    [data]
  )
  const merged = useMemo(() => mergeReciprocalEdges(safe), [safe])

  // Build quick details per person from edges
  const nodeDetails = useMemo<Record<string, NodeDetails>>(() => {
    const base: Record<string, NodeDetails> = {}
    for (const n of merged.nodes) base[n.id] = { partners: [], tasks: [] }
    for (const e of merged.edges) {
      base[e.source]?.partners.push(e.target)
      base[e.target]?.partners.push(e.source)
      if (e.tasks?.length) {
        base[e.source]?.tasks.push(...e.tasks)
        base[e.target]?.tasks.push(...e.tasks)
      }
    }
    // dedupe partners
    for (const k of Object.keys(base)) {
      base[k].partners = Array.from(new Set(base[k].partners))
    }
    return base
  }, [merged])

  const jump = () => {
    const hit =
      merged.nodes.find(n => n.id.toLowerCase() === q.toLowerCase() || n.label.toLowerCase() === q.toLowerCase()) ||
      merged.nodes.find(n => n.label.toLowerCase().includes(q.toLowerCase()))
    if (hit) setFocusId(hit.id)
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="text-slate-300/80 text-sm">Orion — collaboration map</div>
        <div className="flex items-center gap-2">
          <input
            placeholder="Search person…"
            value={q}
            onChange={e=>setQ(e.target.value)}
            onKeyDown={e=>e.key==="Enter" && jump()}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-cyan-400/40"
          />
          <button onClick={jump} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-400/40 text-sm">
            Go
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-2">
        <StarGraph
          data={merged}
          focusedId={focusId}
          nodeDetails={nodeDetails}
          onSelectNode={(id)=>setFocusId(id)}
        />
      </div>

      {!merged.nodes.length && (
        <div className="mt-4 text-slate-400 text-sm">
          No connections yet — upload a transcript.
        </div>
      )}
    </div>
  )
}
