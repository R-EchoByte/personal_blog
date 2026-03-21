import html
import random
import re
from typing import Any

import httpx
from fastapi import APIRouter

from app.schemas.quote import QuoteResponse

router = APIRouter(prefix="/quote", tags=["quote"])

QUOTE_API_JSON_URL = "https://api.mmp.cc/api/yiyan?format=json"
QUOTE_API_TEXT_URL = "https://api.mmp.cc/api/yiyan?format=text"
QUOTE_PATTERN = re.compile(r'document\.write\("(?P<quote>.*?)"\);?')
DEFAULT_SOURCE = "本站"
MAX_QUOTE_LEN = 120
MAX_FETCH_RETRIES = 5
FALLBACK_QUOTES = (
    "不以物喜，不以己悲",
    "慢慢来，比较快",
    "日日自新，步步向前",
    "心有所向，行必能至",
    "知不足而奋进，望远山而前行",
)


def _normalize_quote(text: str) -> str:
    quote = html.unescape(text).replace('\\"', '"').strip()
    return re.sub(r"\s+", " ", quote)


def _parse_quote(raw: str) -> str:
    cleaned = raw.strip()
    match = QUOTE_PATTERN.search(cleaned)
    candidate = match.group("quote") if match else cleaned
    quote = _normalize_quote(candidate)

    if not quote:
        return ""
    if len(quote) > MAX_QUOTE_LEN:
        return ""
    return quote


def _parse_quote_from_json(payload: Any) -> str:
    if not isinstance(payload, dict):
        return ""
    quote = payload.get("quote")
    if not isinstance(quote, str):
        return ""
    normalized = _normalize_quote(quote)
    if not normalized:
        return ""
    if len(normalized) > MAX_QUOTE_LEN:
        return ""
    return normalized


@router.get("/random", response_model=QuoteResponse)
async def random_quote() -> QuoteResponse:
    async with httpx.AsyncClient(timeout=6.0) as client:
        for _ in range(MAX_FETCH_RETRIES):
            try:
                response = await client.get(QUOTE_API_JSON_URL)
                response.raise_for_status()
                quote = _parse_quote_from_json(response.json())
            except (httpx.HTTPError, ValueError, TypeError):
                quote = ""
            if quote:
                return QuoteResponse(quote=quote, source="一言", provider="api.mmp.cc")

            try:
                response = await client.get(QUOTE_API_TEXT_URL)
                response.raise_for_status()
                quote = _parse_quote(response.text)
            except httpx.HTTPError:
                quote = ""
            if quote:
                return QuoteResponse(quote=quote, source="一言", provider="api.mmp.cc")

    fallback_quote = random.choice(FALLBACK_QUOTES)
    return QuoteResponse(quote=fallback_quote, source=DEFAULT_SOURCE, provider="local-fallback")
