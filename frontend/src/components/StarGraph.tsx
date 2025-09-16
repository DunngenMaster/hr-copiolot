import { useEffect, useRef } from "react"
import * as d3 from "d3"
import type { GraphT } from "../lib/types"
import { groupColor } from "../lib/types"

export default function StarGraph({
  data,
  focusedId,
  onSelectNode,
  onSelectEdge,
}: {
  data: GraphT
  focusedId?: string | null
  onSelectNode?: (id: string) => void
  onSelectEdge?: (a: string, b: string) => void
}) {
  const ref = useRef<SVGSVGElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const svg = d3.select(ref.current)
    const wrap = d3.select(wrapRef.current)
    svg.selectAll("*").remove()

    const w = wrap.node()?.clientWidth || 900
    const h = 560
    svg.attr("viewBox", `0 0 ${w} ${h}`)

    // ---- defs for subtle glow on edges/nodes (matches your old vibe)
    const defs = svg.append("defs")
    const glow = defs.append("filter").attr("id","edgeglow")
    glow.append("feGaussianBlur").attr("stdDeviation","2").attr("result","blur")
    const m = glow.append("feMerge")
    m.append("feMergeNode").attr("in","blur")
    m.append("feMergeNode").attr("in","SourceGraphic")

    const g = svg.append("g")

    // ---- zoom/pan
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 2.5])
      .on("zoom", ({transform}) => g.attr("transform", transform.toString()))
    svg.call(zoom as any)

    // If no data yet, stop here (keeps hooks order stable)
    if (!data?.nodes?.length) return

    const nodes = data.nodes.map(d => ({ ...d }))
    const links = (data.edges || []).map(e => ({ ...e })) as any[]

    // ---- build quick index for node hover details
    const byId: Record<string, any> = {}
    nodes.forEach(n => (byId[n.id] = n))
    const nodePartners: Record<string, Set<string>> = {}
    const nodeTasks: Record<string, { title: string; details?: string | null }[]> = {}
    nodes.forEach(n => { nodePartners[n.id] = new Set(); nodeTasks[n.id] = [] })
    for (const e of links) {
      const a = typeof e.source === "string" ? e.source : e.source.id
      const b = typeof e.target === "string" ? e.target : e.target.id
      if (nodePartners[a]) nodePartners[a].add(b)
      if (nodePartners[b]) nodePartners[b].add(a)
      if (e.tasks?.length) {
        nodeTasks[a].push(...e.tasks)
        nodeTasks[b].push(...e.tasks)
      }
    }

    // ---- simulation
    const sim = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(links).id((d:any)=>d.id).distance(120).strength(0.25))
      .force("charge", d3.forceManyBody().strength(-260))
      .force("center", d3.forceCenter(w/2, h/2))
      .force("collision", d3.forceCollide().radius((d:any)=>10 + (d.size||1)*3))

    // ---- edges
    const link = g.append("g")
      .attr("stroke", "rgba(148,163,184,0.35)")
      .style("filter","url(#edgeglow)")
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke-width", (d:any)=>1 + (d.weight||1))

    // ---- nodes
    const node = g.append("g")
      .selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("r", (d:any)=>8 + (d.size||1)*3)
      .attr("fill", (d:any)=>groupColor(d.group))
      .attr("stroke", "rgba(255,255,255,0.35)")
      .attr("stroke-width", 0.5)
      .style("cursor","pointer")
      .call(d3.drag<SVGCircleElement, any>()
        .on("start", (e,d)=>{ if(!e.active) sim.alphaTarget(0.3).restart(); d.fx=d.x; d.fy=d.y })
        .on("drag", (e,d)=>{ d.fx=e.x; d.fy=e.y })
        .on("end",  (e,d)=>{ if(!e.active) sim.alphaTarget(0); d.fx=null; d.fy=null })
      )

    // ---- labels
    const label = g.append("g")
      .selectAll("text")
      .data(nodes)
      .enter()
      .append("text")
      .text((d:any)=>d.label)
      .attr("fill","#E6EEF7")
      .attr("font-size", 12)
      .attr("pointer-events","none")

    // ---- edge tooltips (you had this)
    const edgeTip = d3.select(wrapRef.current)
      .append("div")
      .style("position","absolute")
      .style("padding","8px 10px")
      .style("background","#0B0F14")
      .style("border","1px solid rgba(110,231,249,0.3)")
      .style("border-radius","10px")
      .style("color","#E6EEF7")
      .style("font-size","12px")
      .style("opacity","0")
      .style("pointer-events","none")

    link.on("mousemove", (e:any, d:any) => {
      const tasks = (d.tasks||[]).slice(0,2).map((t:any)=>`• ${t.title}`).join("<br/>")
      edgeTip.html(`<div>${d.source.id || d.source} ⇄ ${d.target.id || d.target}</div><div style="opacity:.8">${tasks||"No tasks"}</div>`)
        .style("left", (e.offsetX+14)+"px")
        .style("top",  (e.offsetY+14)+"px")
        .style("opacity","1")
    }).on("mouseleave", ()=> edgeTip.style("opacity","0"))
      .on("click", (_e:any, d:any) => onSelectEdge && onSelectEdge(d.source.id || d.source, d.target.id || d.target))

    // ---- NEW: node hover card (partners + top tasks)
    const nodeTip = d3.select(wrapRef.current)
      .append("div")
      .style("position","absolute")
      .style("padding","10px 12px")
      .style("background","#0B0F14")
      .style("border","1px solid rgba(110,231,249,0.35)")
      .style("border-radius","12px")
      .style("color","#E6EEF7")
      .style("font-size","12px")
      .style("opacity","0")
      .style("pointer-events","none")
      .style("max-width","260px")

    node.on("mousemove", (e:any, d:any) => {
      const partners = Array.from(nodePartners[d.id] || [])
      const tasks = (nodeTasks[d.id] || []).slice(0,3)
      nodeTip.html(
        `<div style="font-weight:600">${d.label}</div>
         <div style="opacity:.9;margin-top:6px"><span style="opacity:.85">Partners:</span> ${partners.length?partners.join(", "):"—"}</div>
         <div style="opacity:.85;margin-top:6px">${tasks.length?tasks.map(t=>`• ${t.title}`).join("<br/>"):"No tasks"}</div>`
      )
      .style("left", (e.offsetX+14)+"px")
      .style("top",  (e.offsetY+14)+"px")
      .style("opacity","1")
    }).on("mouseleave", ()=> nodeTip.style("opacity","0"))
      .on("click", (_e:any, d:any)=> onSelectNode && onSelectNode(d.id))

    // ---- focus styling
    if (focusedId) {
      node.attr("opacity", (d:any)=> d.id===focusedId ? 1 : 0.35)
      label.attr("opacity", (d:any)=> d.id===focusedId ? 1 : 0.35)
      link.attr("opacity", (l:any)=> (l.source.id===focusedId || l.target.id===focusedId) ? 0.9 : 0.15)
    }

    // ---- NEW: auto-zoom to focused node
    function zoomTo(id: string) {
      const n:any = nodes.find((x:any)=>x.id===id)
      if (!n) return
      const go = () => {
        if (n.x == null || n.y == null) {
          // not positioned yet; try next tick
          setTimeout(go, 60)
          return
        }
        const scale = 1.6
        const tx = w/2 - n.x * scale
        const ty = h/2 - n.y * scale
        svg.transition().duration(750)
          .call(zoom.transform as any, d3.zoomIdentity.translate(tx,ty).scale(scale))
      }
      go()
    }
    if (focusedId) zoomTo(focusedId)

    // ---- sim tick
    sim.on("tick", () => {
      link
        .attr("x1",(d:any)=>d.source.x)
        .attr("y1",(d:any)=>d.source.y)
        .attr("x2",(d:any)=>d.target.x)
        .attr("y2",(d:any)=>d.target.y)
      node
        .attr("cx",(d:any)=>d.x)
        .attr("cy",(d:any)=>d.y)
      label
        .attr("x",(d:any)=>d.x + 12)
        .attr("y",(d:any)=>d.y + 4)
    })

    return () => {
      try { (sim as any)?.stop?.() } catch {}
      try { edgeTip.remove() } catch {}
      try { nodeTip.remove() } catch {}
    }
  }, [data, focusedId, onSelectNode, onSelectEdge])

  return (
    <div ref={wrapRef} className="relative w-full h-[560px]">
      <svg ref={ref} className="w-full h-full rounded-xl" />
    </div>
  )
}
