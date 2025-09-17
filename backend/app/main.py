from pathlib import Path
from dotenv import load_dotenv

_here = Path(__file__).resolve()     # .../app/main.py
_root = _here.parent.parent          # backend/
_app  = _here.parent                 # backend/app

# Load in this order; later overrides earlier.
load_dotenv(_root / "model.env")
load_dotenv(_root / ".env")
load_dotenv(_app / "services" / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes_process import router as process_router
from app.api.routes_friendli import router as friendli_router

app = FastAPI(title="Meeting Summarizer API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173","http://127.0.0.1:5173"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

@app.get("/health")
def health(): 
    return {"ok": True}

app.include_router(process_router, prefix="/api")
app.include_router(friendli_router, prefix="/api")
