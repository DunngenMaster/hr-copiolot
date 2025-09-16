from fastapi import APIRouter, UploadFile, File, HTTPException, Body
from typing import Optional, List
from pathlib import Path

from app.core.storage import (
    ensure_day_dir, write_json, write_text, read_json,
    latest_day_dir, list_day_dirs
)
from app.models.schemas import ProcessResponse, StarConnect, SummaryBlock, TaskList
from app.services.gemini_client import run_all_processors

router = APIRouter()

# ---------- main processing ----------
@router.post("/process", response_model=ProcessResponse)
async def process_transcript(file: Optional[UploadFile] = File(None), transcript: Optional[str] = Body(None)):
    if not file and not transcript:
        raise HTTPException(status_code=400, detail="Provide a .txt file or 'transcript' text.")
    text = transcript
    if file:
        if not file.filename.lower().endswith(".txt"):
            raise HTTPException(status_code=400, detail="Only .txt files are accepted.")
        text = (await file.read()).decode("utf-8", errors="ignore")

    day_dir = ensure_day_dir()
    star, summary, tasks = await run_all_processors(text)
    write_text(day_dir / "transcript.txt", text or "")
    write_json(day_dir / "star_connect.json", star.dict())
    write_json(day_dir / "summary.json", summary.dict())
    write_json(day_dir / "tasks.json", tasks.dict())

    return ProcessResponse(date_dir=day_dir.name, star_connect=star, summary=summary, tasks=tasks)

# alias used by frontend
@router.post("/upload", response_model=ProcessResponse)
async def upload_alias(file: Optional[UploadFile] = File(None), transcript: Optional[str] = Body(None)):
    return await process_transcript(file=file, transcript=transcript)

# ---------- read latest for Orion ----------
@router.get("/latest", response_model=ProcessResponse)
async def get_latest():
    day = latest_day_dir()
    if not day:
        raise HTTPException(status_code=404, detail="No saved runs yet.")

    return _read_bundle_from(day)

# ---------- timeline: list days ----------
@router.get("/runs", response_model=List[str])
async def list_runs():
    # returns ['2025-09-12','2025-09-13', ...] ascending
    return [p.name for p in list_day_dirs()]

# ---------- timeline: load by date (YYYY-MM-DD) ----------
@router.get("/by_date/{date}", response_model=ProcessResponse)
async def get_by_date(date: str):
    candidates = [p for p in list_day_dirs() if p.name == date]
    if not candidates:
        raise HTTPException(status_code=404, detail=f"No run for {date}")
    return _read_bundle_from(candidates[0])

# ---------- helpers ----------
def _read_bundle_from(day_dir: Path) -> ProcessResponse:
    star_p = day_dir / "star_connect.json"
    sum_p  = day_dir / "summary.json"
    tasks_p = day_dir / "tasks.json"

    if not star_p.exists():
        raise HTTPException(status_code=404, detail=f"{star_p.name} not found in {day_dir.name}")

    star = StarConnect(**read_json(star_p))
    summary = SummaryBlock(**read_json(sum_p) if sum_p.exists() else {"bullets": []})
    tasks = TaskList(**read_json(tasks_p) if tasks_p.exists() else {"items": []})

    return ProcessResponse(date_dir=day_dir.name, star_connect=star, summary=summary, tasks=tasks)
