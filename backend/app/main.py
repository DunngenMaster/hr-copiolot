from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes_process import router as process_router

app = FastAPI(title="Meeting Summarizer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"ok": True}

# app/main.py
app.include_router(process_router, prefix="")    
app.include_router(process_router, prefix="/api")  