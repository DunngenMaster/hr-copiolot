import {ChangeEvent, useState} from "react"
import {uploadTranscript} from "../lib/api"

export default function FileDrop(){
  const [status,setStatus]=useState("")
  const onFile=async (e:ChangeEvent<HTMLInputElement>)=>{
    const f=e.target.files?.[0]; if(!f) return
    setStatus("Uploading...")
    try{
      const meta=await uploadTranscript(f)
      setStatus(`Saved: ${meta.timestamp}`)
    }catch{ setStatus("Failed") }
  }
  return (
    <div className="space-y-2">
      <label className="block border rounded-xl p-6 text-center cursor-pointer">
        <input type="file" accept=".txt" className="hidden" onChange={onFile}/>
        <div>Drop a transcript .txt or click to choose</div>
      </label>
      <div className="text-sm opacity-70">{status}</div>
    </div>
  )
}
