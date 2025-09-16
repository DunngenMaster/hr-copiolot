import React, { useMemo, useState } from "react"

type AskResponse = {
  answer: string
  sources?: any[]
  followups?: string[]
}

type Msg = { role: "user" | "ai"; content: string }

export default function SummaryPanel({
  bullets,
  savedDir,
}: {
  bullets: string[]
  savedDir?: string | null
}) {
  const [question, setQuestion] = useState("")
  const [date, setDate] = useState<string>("latest")
  const [scope, setScope] = useState<"auto" | "summary" | "tasks" | "transcript" | "graph">("auto")
  const [asking, setAsking] = useState(false)
  const [runs, setRuns] = useState<string[] | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])

  function parseBullet(b: string) {
    const cleaned = b.replace(/^[\s•*\-]+/, "").trim()
    const m =
      cleaned.match(/^(?:\*\*|__)?\s*([^:*]+?)\s*(?:\*\*|__)?\s*:\s*(.*)$/i) ||
      cleaned.match(/^([^:*]+?)\s*:\s*(.*)$/i)
    if (m) {
      const key = m[1].trim()
      const text = m[2].replace(/\*\*/g, "").trim()
      return { key, text }
    }
    return { key: "Other", text: cleaned.replace(/\*\*/g, "").trim() }
  }

  const groups = useMemo(() => {
    const g: Record<string, string[]> = {}
    bullets.forEach((b) => {
      const { key, text } = parseBullet(b)
      if (!g[key]) g[key] = []
      g[key].push(text)
    })
    return g
  }, [bullets])

  const groupOrder = ["Decision", "Blocker", "Risk", "Key Date", "Action Item", "Progress", "Dependencies", "Communication", "Other"]

  async function ensureRuns() {
    if (runs) return
    try {
      const r = await fetch("/api/runs")
      if (!r.ok) return
      const js = await r.json()
      if (Array.isArray(js?.dates)) setRuns(js.dates)
    } catch {}
  }

  async function onAsk() {
    const q = question.trim()
    if (!q) return
    setAsking(true)
    setMessages((m) => [...m, { role: "user", content: q }])
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, date: date || "latest", scope, top_k: 4 }),
      })
      const js = (await res.json()) as AskResponse
      const a = js?.answer || "Sorry, something went wrong. Try again."
      setMessages((m) => [...m, { role: "ai", content: a }])
    } catch {
      setMessages((m) => [...m, { role: "ai", content: "Sorry, something went wrong. Try again." }])
    } finally {
      setAsking(false)
      setQuestion("")
    }
  }

  const styles: Record<string, React.CSSProperties> = {
    page: { width: "100%", padding: 24, margin: "0 auto", boxSizing: "border-box" },
    card: {
      width: "100%",
      borderRadius: 18,
      padding: 24,
      background: "linear-gradient(#0b1220, #0b1220) padding-box, linear-gradient(135deg, #7c3aed, #06b6d4, #f472b6) border-box",
      border: "1px solid transparent",
      boxShadow: "0 0 42px rgba(124,58,237,.25)",
      color: "#e5e7eb",
    },
    cardCyanGlow: {
      width: "100%",
      borderRadius: 18,
      padding: 24,
      background: "linear-gradient(#0b1220, #0b1220) padding-box, linear-gradient(135deg, #06b6d4, #60a5fa, #a78bfa) border-box",
      border: "1px solid transparent",
      boxShadow: "0 0 42px rgba(34,211,238,.28)",
      color: "#e5e7eb",
    },
    headerRow: { display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 },
    title: { fontSize: 22, fontWeight: 700, color: "#ffffff" },
    meta: { fontSize: 12, color: "#cbd5e1" },
    sectionTitle: { marginTop: 16, marginBottom: 6, fontWeight: 600, color: "#a5f3fc", fontSize: 16 },
    list: { margin: 0, paddingLeft: 20 },
    li: {
      margin: "6px 0",
      lineHeight: 1.6,
      fontSize: 16,
      color: "#e5e7eb",
      whiteSpace: "normal",
      wordBreak: "break-word",
      overflowWrap: "anywhere",
    },
    summaryBody: {
      maxHeight: "30vh",
      minHeight: "20vh",
      overflowY: "auto",
      paddingRight: 8,
      whiteSpace: "normal",
      wordBreak: "break-word",
      overflowWrap: "anywhere",
    },
    chatWrap: { display: "flex", flexDirection: "column", gap: 10, marginTop: 10, minHeight: 120 },
    bubbleUser: {
      alignSelf: "flex-end",
      maxWidth: "80%",
      padding: "10px 12px",
      borderRadius: 14,
      background: "#1f2937",
      color: "#fff",
      boxShadow: "0 0 16px rgba(96,165,250,.25)",
      whiteSpace: "pre-wrap",
    },
    bubbleAI: {
      alignSelf: "flex-start",
      maxWidth: "85%",
      padding: "10px 12px",
      borderRadius: 14,
      background: "rgba(255,255,255,0.06)",
      color: "#e5e7eb",
      boxShadow: "0 0 16px rgba(34,211,238,.22)",
      whiteSpace: "pre-wrap",
    },
    controls: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 10 },
    textarea: {
      width: "100%",
      minHeight: 90,
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(255,255,255,0.05)",
      color: "#e5e7eb",
      padding: "10px 12px",
      outline: "none",
      fontSize: 15,
    },
    select: {
      fontSize: 12,
      color: "#e5e7eb",
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 8,
      padding: "6px 8px",
    },
    button: {
      marginLeft: "auto",
      padding: "10px 14px",
      borderRadius: 12,
      border: "1px solid rgba(34,211,238,0.5)",
      background: "rgba(34,211,238,0.10)",
      color: "#cffafe",
      cursor: "pointer",
    },
    disabledBtn: {
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(255,255,255,0.06)",
      color: "#94a3b8",
      cursor: "not-allowed",
    },
  }

  return (
    <div style={styles.page}>
      <style>{`
        [data-scroll]::-webkit-scrollbar { width: 10px; }
        [data-scroll]::-webkit-scrollbar-thumb { background: rgba(148,163,184,.55); border-radius: 10px; }
        [data-scroll]::-webkit-scrollbar-thumb:hover { background: rgba(148,163,184,.8); }
        [data-scroll]::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      <div style={styles.card}>
        <div style={styles.headerRow}>
          <div style={styles.title}>Highlights</div>
          <div style={styles.meta}>Run: {savedDir ?? "—"}</div>
        </div>

        {bullets.length === 0 ? (
          <div style={{ color: "#cbd5e1" }}>No summary yet — upload a transcript first.</div>
        ) : (
          <div style={styles.summaryBody} data-scroll>
            {groupOrder.filter((k) => groups[k]?.length).map((key) => (
              <section key={key}>
                <div style={styles.sectionTitle}>{key}</div>
                <ul style={styles.list}>
                  {groups[key].map((t, i) => (
                    <li key={i} style={styles.li}>{t}</li>
                  ))}
                </ul>
              </section>
            ))}
            {groups["Other"] && groupOrder.every((k) => k === "Other" || !groups[k]) && (
              <ul style={styles.list}>
                {groups["Other"].map((t, i) => (
                  <li key={i} style={styles.li}>{t}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div style={{ ...styles.cardCyanGlow, marginTop: 24 }}>
        <div style={styles.headerRow}>
          <div style={styles.title}>Ask Gemini</div>
        </div>

        <div style={styles.chatWrap}>
          {messages.length === 0 ? (
            <div style={{ fontSize: 14, color: "#94a3b8" }}>No messages yet.</div>
          ) : (
            messages.map((m, idx) => (
              <div key={idx} style={m.role === "user" ? styles.bubbleUser : styles.bubbleAI}>{m.content}</div>
            ))
          )}
        </div>

        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") onAsk() }}
          placeholder="Type your question…"
          style={styles.textarea}
        />

        <div style={styles.controls}>
          <label style={{ fontSize: 12, color: "#94a3b8" }}>
            Date{" "}
            <select value={date} onChange={(e) => setDate(e.target.value)} onFocus={ensureRuns} style={styles.select}>
              <option value="latest">Latest</option>
              {runs?.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>

          <label style={{ fontSize: 12, color: "#94a3b8" }}>
            Scope{" "}
            <select value={scope} onChange={(e) => setScope(e.target.value as any)} style={styles.select}>
              <option value="auto">Auto</option>
              <option value="summary">Summary</option>
              <option value="tasks">Tasks</option>
              <option value="transcript">Transcript</option>
              <option value="graph">Graph</option>
            </select>
          </label>

          <button
            onClick={onAsk}
            disabled={asking}
            style={asking ? { ...styles.button, ...styles.disabledBtn } : styles.button}
            title="Ctrl/Cmd + Enter to send"
          >
            {asking ? "Asking…" : "Ask Gemini"}
          </button>
        </div>
      </div>
    </div>
  )
}