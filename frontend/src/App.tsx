import { useEffect, useState } from "react"
import UploadPanel from "./components/UploadPanel"
import type { GraphT } from "./lib/types"
import GalaxyTabs from "./components/GalaxyTabs"
import OrionPanel from "./components/OrienPanel"
import SummaryPanel from "./components/SummaryPanel"
import TodoPanel from "./components/TodoPanel"

type TabKey = "upload" | "orion" | "summary" | "todo"

export default function App() {
  const [active, setActive] = useState<TabKey>("upload")
  const [busy, setBusy] = useState(false)
  const [savedDir, setSavedDir] = useState<string | null>(null)

  // LLM outputs
  const [graph, setGraph] = useState<GraphT>({ nodes: [], edges: [] })
  const [summary, setSummary] = useState<string[]>([])
  const [tasks, setTasks] = useState<any[]>([])

  // ---- Upload flow ----
  const onPickFile = async (file: File) => {
    const form = new FormData()
    form.append("file", file)
    setBusy(true)
    try {
      const res = await fetch("/api/upload", { method: "POST", body: form })
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
      const json = await res.json()

      setSavedDir(json?.date_dir ?? null)

      const g: GraphT = json?.star_connect
        ? {
            nodes: Array.isArray(json.star_connect.nodes) ? json.star_connect.nodes : [],
            edges: Array.isArray(json.star_connect.edges) ? json.star_connect.edges : [],
          }
        : { nodes: [], edges: [] }
      setGraph(g)

      setSummary(Array.isArray(json?.summary?.bullets) ? json.summary.bullets : [])
      setTasks(Array.isArray(json?.tasks?.items) ? json.tasks.items : [])
    } catch {
      // reset on failure
      setSavedDir(null)
      setGraph({ nodes: [], edges: [] })
      setSummary([])
      setTasks([])
    } finally {
      setBusy(false)
    }
  }

  // ---- Auto-load latest when the app opens ----
  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const res = await fetch("/api/latest")
        if (!res.ok) return
        const json = await res.json()

        setSavedDir(json?.date_dir ?? null)

        const g: GraphT = json?.star_connect
          ? {
              nodes: Array.isArray(json.star_connect.nodes) ? json.star_connect.nodes : [],
              edges: Array.isArray(json.star_connect.edges) ? json.star_connect.edges : [],
            }
          : { nodes: [], edges: [] }
        setGraph(g)

        setSummary(Array.isArray(json?.summary?.bullets) ? json.summary.bullets : [])
        setTasks(Array.isArray(json?.tasks?.items) ? json.tasks.items : [])
      } catch {
        // ignore; keep current state
      }
    }
    fetchLatest()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-slate-900 text-slate-200">
      <div className="pt-6">
        <GalaxyTabs active={active} onChange={setActive} />
      </div>

      {/* Upload */}
      {active === "upload" && (
        <UploadPanel busy={busy} savedDir={savedDir} onPickFile={onPickFile} />
      )}

      {/* Orion */}
      {active === "orion" && (
        <div className="max-w-6xl mx-auto mt-12 px-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-2">
            <OrionPanel data={graph} />
          </div>
        </div>
      )}

      {/* Summary */}
      {active === "summary" && (
        <SummaryPanel bullets={summary} savedDir={savedDir} />
      )}

     {active === "todo" && (
  <div className="max-w-6xl mx-auto mt-12 px-4 text-slate-300/90">
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6">
      <TodoPanel tasks={tasks as any[]} />
    </div>
  </div>
)}
    </div>
  )
}
