import { ChangeEvent } from "react"

export default function UploadPanel({
  busy,
  savedDir,
  onPickFile,
}: {
  busy?: boolean
  savedDir?: string | null
  onPickFile: (file: File) => void
}) {
  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) onPickFile(f)
  }

  return (
    <div className="max-w-4xl mx-auto mt-12">
     <div className="mb-6">
  <h1 className="text-4xl font-semibold">Upload Transcript</h1>
  <p className="text-slate-300/80 mt-2">Drop a .txt file or choose from your computer</p>
</div>

<label className="block w-full rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-10 cursor-pointer hover:border-violet-400/40 hover:shadow-[0_0_0_2px_rgba(167,139,250,0.15)] transition-all">
  <input type="file" accept=".txt" className="hidden" onChange={onChange} />
  <div className="flex items-center justify-center h-72">
    <div className="text-center space-y-2">
      <div className="text-lg">{busy ? "Processing…" : "Drop transcript here or click to choose"}</div>
      <div className="text-slate-400 text-sm">Saved: {savedDir ?? "—"}</div>
    </div>
  </div>
</label>

    </div>
    
  )
}
