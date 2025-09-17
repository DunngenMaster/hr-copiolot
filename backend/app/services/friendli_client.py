FRIENDLI_API_KEY = "flp_34HHakPbvzO3QCqkGIhQkkKlQBGQcwFzpig9fCOzxLw49"
FRIENDLI_API_BASE = "https://api.friendli.ai/serverless/v1"
FRIENDLI_MODEL = "meta-llama-3.1-8b-instruct"
# -----------------------------------


# app/services/friendli_client.py
import httpx
import json


class FriendliHTTPError(RuntimeError):
    pass

def _extract_text(js: dict) -> str:
    try:
        return js["choices"][0]["message"]["content"]
    except Exception:
        pass
    try:
        return js["choices"][0]["text"]
    except Exception:
        pass
    val = js.get("output_text") or js.get("content") or js.get("answer")
    if val:
        return val
    raise FriendliHTTPError(f"Unexpected response shape: {json.dumps(js)[:800]}")

async def friendli_chat(messages, temperature: float = 0.3,
                        model: str | None = None, max_tokens: int = 512) -> str:
    url = f"{FRIENDLI_API_BASE}/chat/completions"
    payload = {
        "model": model or FRIENDLI_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": False,
    }
    headers = {
        "Authorization": f"Bearer {FRIENDLI_API_KEY}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=40) as client:
        r = await client.post(url, json=payload, headers=headers)

    if r.status_code >= 300:
        raise FriendliHTTPError(f"HTTP {r.status_code} from Friendli: {r.text[:1000]}")

    try:
        js = r.json()
    except Exception:
        raise FriendliHTTPError(f"Non-JSON response: {r.text[:800]}")

    return _extract_text(js)
