import { useEffect, useMemo, useState } from "react"

type RawTask = {
  description: string
  owner?: string | null
  assignees?: string[]
  due?: string | null
}

function deriveTimes(t: RawTask) {
  const now = new Date()
  const endOfDay = (d: Date) => {
    const x = new Date(d)
    x.setHours(17, 0, 0, 0)
    return x
  }
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
  const fmtTime = (d: Date) => {
    const h = d.getHours()
    const m = d.getMinutes()
    const am = h < 12
    const hh = h % 12 === 0 ? 12 : h % 12
    return `${hh}:${pad(m)} ${am ? "AM" : "PM"}`
  }

  const text = `${t.description} ${t.due || ""}`.toLowerCase()
  let when = new Date(now)
  let timeChosen = false

  if (text.includes("tomorrow")) when.setDate(when.getDate() + 1)
  if (/morning/.test(text)) { when.setHours(10, 0, 0, 0); timeChosen = true }
  else if (/afternoon/.test(text)) { when.setHours(15, 0, 0, 0); timeChosen = true }
  else if (/evening|eod|end of day/.test(text)) { when = endOfDay(when); timeChosen = true }
  else if (/(\d{1,2}:\d{2})/.test(text)) {
    const m = text.match(/(\d{1,2}):(\d{2})/)
    if (m) { when.setHours(parseInt(m[1], 10), parseInt(m[2], 10), 0, 0); timeChosen = true }
  }

  if (!timeChosen && /(submit|finish|deliver|ship|deploy|handoff|share)/.test(text)) {
    when = endOfDay(when)
  }

  const followup = new Date(when)
  followup.setMinutes(followup.getMinutes() - 30)

  return {
    dueLabel: `${when.toDateString()} · ${fmtTime(when)}`,
    followLabel: fmtTime(followup),
  }
}

function storageKey(desc: string) {
  return `todo_done_${desc}`
}

export default function TodoPanel({ tasks }: { tasks: RawTask[] }) {
  const [done, setDone] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const next: Record<string, boolean> = {}
    tasks.forEach(t => {
      const k = storageKey(t.description)
      const v = localStorage.getItem(k)
      if (v) next[t.description] = v === "1"
    })
    setDone(next)
  }, [tasks])

  const toggle = (desc: string) => {
    setDone(prev => {
      const v = !prev[desc]
      localStorage.setItem(storageKey(desc), v ? "1" : "0")
      return { ...prev, [desc]: v }
    })
  }

  const rows = useMemo(() => {
    return tasks.map(t => {
      const who = t.owner || (t.assignees && t.assignees[0]) || "someone"
      const times = deriveTimes(t)
      return { ...t, who, ...times }
    })
  }, [tasks])

  if (!rows.length) {
    return <div style={{ color: "#94a3b8", fontSize: 14 }}>No tasks yet — upload a transcript first.</div>
  }

  const cardStyle: React.CSSProperties = {
    borderRadius: 16,
    padding: 16,
    background: "linear-gradient(#0b1220, #0b1220) padding-box, linear-gradient(135deg, #06b6d4, #3b82f6, #9333ea) border-box",
    border: "1px solid transparent",
    boxShadow: "0 0 20px rgba(59,130,246,.25)",
    color: "#e5e7eb",
    display: "flex",
    flexDirection: "column",
    gap: 6,
    height: "100%", // cards same height
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 20 }}>
      {rows.map((t, i) => (
        <div key={i} style={cardStyle}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <input
              type="checkbox"
              checked={!!done[t.description]}
              onChange={() => toggle(t.description)}
              style={{ marginTop: 4, width: 18, height: 18, accentColor: "#06b6d4" }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>{t.description}</div>

              <div style={{ fontSize: 13, color: "#cbd5e1" }}>
                Owner: <span style={{ color: "#f3f4f6" }}>{t.owner || "Unassigned"}</span>
                {Array.isArray(t.assignees) && t.assignees.length > 0 && (
                  <> · Assignees: <span style={{ color: "#f3f4f6" }}>{t.assignees.join(", ")}</span></>
                )}
              </div>

              <div style={{ fontSize: 13, color: "#d1d5db" }}>
                <span style={{ opacity: 0.8 }}>Follow up:</span>{" "}
                Check with <span style={{ color: "#67e8f9" }}>{t.who}</span> at{" "}
                <span style={{ color: "#67e8f9" }}>{t.followLabel}</span>
                <span style={{ opacity: 0.6 }}> (30 min before target)</span>
              </div>

              <div style={{ fontSize: 13, color: "#94a3b8" }}>
                Target: <span style={{ color: "#f3f4f6" }}>{t.dueLabel}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
