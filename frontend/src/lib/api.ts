export async function uploadTranscript(input: File | string){
  const form=new FormData()
  if(typeof input==="string") form.append("transcript",input)
  else form.append("file",input)
  const res=await fetch("http://localhost:8000/api/upload",{method:"POST",body:form})
  if(!res.ok) throw new Error("upload failed")
  return res.json()
}

export async function askGemini(question: string, date = "latest", scope: "auto" | "summary" | "tasks" | "transcript" | "graph" = "auto") {
  const res = await fetch("http://localhost:8000/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, date, scope, top_k: 4 }),
  })
  if (!res.ok) throw new Error("ask failed")
  return res.json()
}

export async function fetchSnippet(date: string, query: string, windowChars = 320) {
  const url = new URL("/api/snippet", window.location.origin)
  url.searchParams.set("date", date)
  url.searchParams.set("query", query.slice(0, 300))
  url.searchParams.set("window_chars", String(windowChars))
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error("snippet failed")
  return res.json()
}
