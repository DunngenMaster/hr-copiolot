from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import JSONResponse
from app.core.storage import save_transcript

router = APIRouter()

@router.post("/upload")
async def upload_transcript(file: UploadFile = File(None), transcript: str = Form(None)):
    if file is None and transcript is None:
        raise HTTPException(status_code=400, detail="no transcript provided")
    text = transcript
    if file is not None:
        if not file.filename.lower().endswith(".txt"):
            raise HTTPException(status_code=400, detail="only .txt accepted")
        text = (await file.read()).decode("utf-8", errors="ignore")
    meta = save_transcript(text)
    return JSONResponse(meta)
