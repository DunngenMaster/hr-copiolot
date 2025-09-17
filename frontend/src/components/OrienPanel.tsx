// src/components/OrionPanel.tsx
import { useMemo, useState } from "react"
import StarGraph from "./StarGraph"
import type { GraphT } from "../lib/types"
import { safeGraphFromAny, mergeReciprocalEdges } from "../lib/normalize"

export default function OrionPanel({ data }: { data: GraphT | any }) {
  const [focusId, setFocusId] = useState<string | null>(null)

  // ⬇️ Make ANY shape safe
  const safe = useMemo<GraphT>(() => safeGraphFromAny(data || {}), [data])

  // ⬇️ Optional: collapse A↔B into one edge
  const merged = useMemo(() => mergeReciprocalEdges(safe), [safe])

  const hasGraph = merged.nodes.length > 0 && merged.edges.length > 0

  return (
    <div className="w-full">
      <div className="text-slate-300/80 text-sm mb-2">Orion — collaboration map</div>

      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-2">
        {hasGraph ? (
          <StarGraph
            data={merged}
            focusedId={focusId}
            onSelectNode={(id)=>setFocusId(id)}
          />
        ) : (
          <div className="p-6 text-slate-400">
            No connections yet — upload a transcript (or the graph data was invalid and got filtered).
          </div>
        )}
      </div>
    </div>
  )
}
