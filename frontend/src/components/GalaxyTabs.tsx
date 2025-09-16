import { ReactNode, useState } from "react"

type TabKey = "upload" | "orion" | "summary" | "todo"

export default function GalaxyTabs({
  active,
  onChange,
}: {
  active: TabKey
  onChange: (k: TabKey) => void
}) {
  const tabs: { key: TabKey; label: string }[] = [
    { key: "upload", label: "Upload" },
    { key: "orion", label: "Orion" },
    { key: "summary", label: "Summary" },
    { key: "todo", label: "To-Do" },
  ]

  return (
    <div className="w-full flex justify-center pt-6">
    <div
  className="flex gap-3"
  style={{
    display: "flex",
    flexWrap: "nowrap",
    marginLeft: "40%",
    marginTop: "0.5%"
  }}
>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            style={{
    margin: "10px",
    padding: "15px"}}
            className={[
              "px-6 py-3 rounded-2xl transition-all",
              "bg-white/5 border border-white/10 backdrop-blur",
              "hover:border-cyan-400/40 hover:shadow-[0_0_0_2px_rgba(34,211,238,0.15)]",
              active === t.key
                ? "ring-2 ring-cyan-300/30 shadow-lg"
                : "ring-0",
            ].join(" ")} 
            >
            <span
              className={[
                "text-sm tracking-wide",
                active === t.key ? "text-cyan-100" : "text-slate-200/80",
              ].join(" ")}
            >
              {t.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
