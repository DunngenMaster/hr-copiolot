import os, json, httpx, re, unicodedata, logging
from typing import Tuple, Any, Dict, List
from app.models.schemas import StarConnect, SummaryBlock, TaskList, Node, Edge, EdgeTask

log = logging.getLogger(__name__)

GEMINI_API_KEY = ""
MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"

def _prompt_star(transcript: str) -> str:
    return f"""
You extract a collaboration graph and adjacency matrix from an unstructured morning meeting transcript.
Return ONLY valid JSON with keys:
- nodes: [{{id,label,size,group}}]
- edges: [{{source,target,weight,tasks:[{{title,details,snippets}}]}}]
- matrix: 2D array of numbers; matrix[i][j] is interaction weight between nodes[i] and nodes[j].
Rules:
- Identify people by how they self-introduce ("ashu here", "george here").
- Create an edge when work is requested, co-owned, or referenced.
- weight ~ frequency/strength of interaction (1–5).
- tasks: short actionable titles with up to 2 supporting snippets from transcript.
Transcript:
\"\"\"{transcript}\"\"\"
JSON:
"""

def _prompt_summary(transcript: str) -> str:
    return f"""
Summarize the meeting in at most 8 bullets. Focus on decisions, blockers, risks, and key dates.
Return ONLY JSON: {{ "bullets": [ "...", "..."] }}
Transcript:
\"\"\"{transcript}\"\"\" 
JSON:
"""

def _prompt_tasks(transcript: str) -> str:
    return f"""
Extract a task list from the transcript. Normalize owners' names if possible.
Return ONLY JSON:
{{
  "items":[
    {{"owner":"Ashu","description":"review fraud detection inputs","due":"today 4:30pm","priority":"normal","source_snippet":"...","assignees":["Ashu"]}}
  ]
}}
Include owner when clear; else leave null. Include due dates/times in natural text if mentioned.
Transcript:
\"\"\"{transcript}\"\"\" 
JSON:
"""

def _extract_json(text: str, fallback: dict) -> dict:
    if not text:
        return fallback
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return fallback
    s = text[start:end+1]
    try:
        return json.loads(s)
    except Exception:
        s2 = re.sub(r"^```json|```$", "", s.strip(), flags=re.MULTILINE)
        try:
            return json.loads(s2)
        except Exception:
            return fallback

def _slugify(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")
    s = s.lower()
    out = []
    for ch in s:
        if ch.isalnum():
            out.append(ch)
        elif ch in " -_.":
            out.append("-")
    slug = "".join(out).strip("-")
    return slug or "node"

def _to_str(x: Any) -> str:
    if x is None:
        return ""
    return str(x)

def _ensure_list(x: Any) -> List:
    return x if isinstance(x, list) else []

def _normalize_tasks_list(tasks_raw: Any) -> List[Dict[str, Any]]:
    tasks = []
    for t in _ensure_list(tasks_raw):
        if isinstance(t, str):
            tasks.append({"title": t, "details": None, "snippets": []})
        elif isinstance(t, dict):
            tasks.append({
                "title": _to_str(t.get("title") or t.get("task") or "task").strip(),
                "details": _to_str(t.get("details") or t.get("desc") or "").strip() or None,
                "snippets": _ensure_list(t.get("snippets")),
            })
    return tasks

def _build_id_map_from_nodes(nodes_in: List[Any]) -> Tuple[List[Dict[str, Any]], Dict[Any, str]]:
    nodes_out: List[Dict[str, Any]] = []
    id_map: Dict[Any, str] = {}
    if nodes_in and isinstance(nodes_in[0], dict):
        for idx, n in enumerate(nodes_in):
            label = _to_str(n.get("label") or n.get("name") or n.get("id") or f"Person {idx}")
            node_id_raw = n.get("id", idx)
            node_id = _to_str(node_id_raw).strip() or _slugify(label)
            if node_id.isdigit():
                node_id = _slugify(label) or f"person-{idx}"
            size = n.get("size", 1.0)
            group = n.get("group")
            try:
                size_f = float(size)
            except Exception:
                size_f = 1.0
            nodes_out.append({"id": node_id, "label": label, "size": size_f, "group": _to_str(group).strip() if group is not None else None})
            id_map[node_id_raw] = node_id
            id_map[idx] = node_id
    else:
        for idx, label in enumerate(nodes_in):
            label_s = _to_str(label).strip() or f"Person {idx}"
            node_id = _slugify(label_s) or f"person-{idx}"
            nodes_out.append({"id": node_id, "label": label_s, "size": 1.0, "group": None})
            id_map[idx] = node_id
            id_map[label_s] = node_id
    seen = set()
    for i, n in enumerate(nodes_out):
        if n["id"] in seen:
            n["id"] = f"{n['id']}-{i}"
        seen.add(n["id"])
    return nodes_out, id_map

def _resolve_ref_to_id(ref: Any, id_map: Dict[Any, str], nodes_out: List[Dict[str, Any]]) -> str:
    if ref in id_map:
        return id_map[ref]
    ref_s = _to_str(ref).strip().lower()
    for n in nodes_out:
        if n["id"].lower() == ref_s or n["label"].lower() == ref_s:
            return n["id"]
    return _slugify(ref_s or "node")

def normalize_star_json(raw: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(raw, dict):
        raw = {}
    nodes_in = _ensure_list(raw.get("nodes", []))
    edges_in = _ensure_list(raw.get("edges", []))
    matrix_in = _ensure_list(raw.get("matrix", []))
    nodes_out, id_map = _build_id_map_from_nodes(nodes_in)
    edges_out: List[Dict[str, Any]] = []
    for e in edges_in:
        if isinstance(e, dict):
            s = _resolve_ref_to_id(e.get("source"), id_map, nodes_out)
            t = _resolve_ref_to_id(e.get("target"), id_map, nodes_out)
            w = e.get("weight", 1.0)
            try:
                w_f = float(w)
            except Exception:
                w_f = 1.0
            tasks = _normalize_tasks_list(e.get("tasks", []))
            edges_out.append({"source": s, "target": t, "weight": w_f, "tasks": tasks})
        elif isinstance(e, (list, tuple)) and len(e) >= 2:
            s = _resolve_ref_to_id(e[0], id_map, nodes_out)
            t = _resolve_ref_to_id(e[1], id_map, nodes_out)
            edges_out.append({"source": s, "target": t, "weight": 1.0, "tasks": []})
    M: List[List[float]] = []
    if matrix_in and isinstance(matrix_in, list) and all(isinstance(row, list) for row in matrix_in):
        try:
            M = [[float(x) for x in row] for row in matrix_in]
        except Exception:
            M = []
    if not M:
        n = len(nodes_out)
        M = [[0.0]*n for _ in range(n)]
    return {"nodes": nodes_out, "edges": edges_out, "matrix": M}

async def _gemini_call(prompt: str) -> str:
    if not GEMINI_API_KEY:
        return ""
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(URL + f"?key={GEMINI_API_KEY}", json={"contents":[{"parts":[{"text": prompt}]}]})
        r.raise_for_status()
        data = r.json()
        return data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")

def _mock_star() -> StarConnect:
    nodes = [Node(id="ashu", label="Ashu", size=3.0), Node(id="dave", label="Dave", size=2.0), Node(id="priya", label="Priya", size=2.0)]
    edges = [
        Edge(source="ashu", target="dave", weight=2.0, tasks=[EdgeTask(title="integrate logs", details="Ashu uses Dave's collector", snippets=["sync with ashu about integrating logs"])]),
        Edge(source="priya", target="ashu", weight=1.0, tasks=[EdgeTask(title="UI handoff", details=None, snippets=["pair with ananya on redesign"])])
    ]
    matrix = [[0,2,1],[2,0,0],[1,0,0]]
    return StarConnect(nodes=nodes, edges=edges, matrix=matrix)

def _mock_summary() -> SummaryBlock:
    return SummaryBlock(bullets=["DB migrations pending staging slot","Fraud model awaits logs from Dave","Dashboard redesign; requirements from George"])

def _mock_tasks() -> TaskList:
    return TaskList(items=[
        {"owner":"Ashu","description":"sync with Dave on log integration","due":"today 4:30pm","priority":"normal","source_snippet":"dave will sync with ashu","assignees":["Ashu","Dave"]},
        {"owner":"Charlie","description":"run DB migrations on staging","due":"after 3pm","priority":"high","source_snippet":"Diana opens slot after 3 PM","assignees":["Charlie"]}
    ])

async def run_all_processors(transcript: str) -> Tuple[StarConnect, SummaryBlock, TaskList]:
    if not GEMINI_API_KEY:
        return _mock_star(), _mock_summary(), _mock_tasks()
    star_text = await _gemini_call(_prompt_star(transcript))
    summary_text = await _gemini_call(_prompt_summary(transcript))
    tasks_text = await _gemini_call(_prompt_tasks(transcript))
    star_json_raw = _extract_json(star_text, _mock_star().dict())
    summary_json = _extract_json(summary_text, _mock_summary().dict())
    tasks_json = _extract_json(tasks_text, _mock_tasks().dict())
    star_json = normalize_star_json(star_json_raw)
    return StarConnect(**star_json), SummaryBlock(**summary_json), TaskList(**tasks_json)
