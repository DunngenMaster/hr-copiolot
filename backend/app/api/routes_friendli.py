from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Literal, Optional, Tuple
from pathlib import Path
import json

from app.services.friendli_client import friendli_chat, FriendliHTTPError

router = APIRouter()

class Msg(BaseModel):
    role: Literal["system","user","assistant"]
    content: str

class AskReq(BaseModel):
    messages: List[Msg]

class AskRes(BaseModel):
    answer: str

SYSTEM_PROMPT = "You are Friendli. Answer concisely using the meeting context provided."

BACKEND_ROOT = Path(__file__).resolve().parents[2]   # .../backend
DATA_DIR = BACKEND_ROOT / "data"

def _runs() -> List[Path]:
    if not DATA_DIR.exists():
        return []
    return [p for p in DATA_DIR.iterdir() if p.is_dir()]

def _pick_run(prefer_both: bool = True) -> Optional[Path]:
    dirs = _runs()
    if not dirs:
        return None
    # sort by mtime desc
    dirs.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    if prefer_both:
        for d in dirs:
            if (d / "transcript.txt").exists() and (d / "summary.json").exists():
                return d
    for d in dirs:
        if (d / "transcript.txt").exists():
            return d
    return None

def _load_run(name: Optional[str]) -> Tuple[Optional[Path], List[str], str]:
    target = None
    if name:
        cand = DATA_DIR / name
        if cand.exists() and cand.is_dir():
            target = cand
    if target is None:
        target = _pick_run(prefer_both=True) or _pick_run(prefer_both=False)
    if target is None:
        return None, [], ""

    bullets: List[str] = []
    transcript = ""
    sfile = target / "summary.json"
    tfile = target / "transcript.txt"

    if sfile.exists():
        try:
            js = json.loads(sfile.read_text(encoding="utf-8", errors="ignore"))
            bl = js.get("bullets")
            if isinstance(bl, list):
                bullets = [str(x) for x in bl]
        except Exception:
            bullets = []

    if tfile.exists():
        try:
            transcript = tfile.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            transcript = ""

    return target, bullets, transcript

def _trim(s: str, n: int) -> str:
    s = (s or "").strip()
    return s if len(s) <= n else s[:n] + "\n...[truncated]"

@router.get("/friendli_context_preview")
def friendli_context_preview(run: Optional[str] = Query(None)):
    d, bullets, transcript = _load_run(run)
    return {
        "selected_run": d.name if d else None,
        "bullets_count": len(bullets),
        "transcript_chars": len(transcript),
        "data_dir": str(DATA_DIR),
        "hint": "Use ?run=<folderName> to target a specific subfolder under /data",
    }

@router.post("/friendli_chat", response_model=AskRes)
async def friendli_chat_post(req: AskReq, run: Optional[str] = Query(None)):
    run_dir, bullets, transcript = _load_run(run)
    if run_dir is None:
        raise HTTPException(status_code=404, detail=f"No run folder with transcript.txt under {DATA_DIR}")
    if not transcript and not bullets:
        raise HTTPException(status_code=400, detail="Found run folder, but no transcript/summary inside")

    parts = [SYSTEM_PROMPT, f"Run folder: {run_dir.name}"]
    if bullets:
        parts.append("Meeting Summary:\n- " + "\n- ".join(bullets[:60]))
    if transcript:
        parts.append("Transcript (trimmed):\n" + _trim(transcript, 18000))
    system_ctx = "\n\n".join(parts)

    msgs = [{"role": "system", "content": system_ctx}] + [m.model_dump() for m in req.messages]

    try:
        answer = await friendli_chat(msgs)
        return AskRes(answer=answer)
    except FriendliHTTPError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Friendli unknown error: {e!r}")
