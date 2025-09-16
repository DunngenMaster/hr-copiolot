from datetime import datetime
from pathlib import Path
import json, os
from typing import Optional, List

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = Path(os.getenv("DATA_DIR", ROOT / "data"))

def ensure_day_dir() -> Path:
    d = datetime.now().strftime("%Y-%m-%d")
    p = DATA_DIR / d
    p.mkdir(parents=True, exist_ok=True)
    return p

def write_json(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

def write_text(path: Path, text: str) -> None:
    path.write_text(text, encoding="utf-8")

def read_json(path: Path) -> dict:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))

# ---- timeline helpers ----
def _is_ymd_dir(name: str) -> bool:
    # Expect 'YYYY-MM-DD'
    return (
        len(name) == 10 and name[4] == "-" and name[7] == "-"
        and name[:4].isdigit() and name[5:7].isdigit() and name[8:10].isdigit()
    )

def list_day_dirs() -> List[Path]:
    if not DATA_DIR.exists():
        return []
    return sorted([p for p in DATA_DIR.iterdir() if p.is_dir() and _is_ymd_dir(p.name)])

def latest_day_dir() -> Optional[Path]:
    days = list_day_dirs()
    return days[-1] if days else None
