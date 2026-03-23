import html
import random
import re
from typing import Any

import httpx

from app.schemas.quote import QuoteResponse

QUOTE_API_JSON_URL = "https://api.mmp.cc/api/yiyan?format=json"
QUOTE_API_TEXT_URL = "https://api.mmp.cc/api/yiyan?format=text"
QUOTE_PROVIDER = "api.mmp.cc"
REMOTE_SOURCE = "一言"
DEFAULT_SOURCE = "本站"
LOCAL_PROVIDER = "local-fallback"
MAX_QUOTE_LEN = 120
MAX_FETCH_RETRIES = 5
FETCH_TIMEOUT_SECONDS = 6.0
QUOTE_PATTERN = re.compile(r'document\.write\("(?P<quote>.*?)"\);?')
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


def _validate_quote(quote: str) -> str:
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
    return _validate_quote(_normalize_quote(quote))


def _parse_quote_from_text(raw: str) -> str:
    cleaned = raw.strip()
    match = QUOTE_PATTERN.search(cleaned)
    candidate = match.group("quote") if match else cleaned
    return _validate_quote(_normalize_quote(candidate))


async def _fetch_remote_quote(client: httpx.AsyncClient) -> str:
    try:
        response = await client.get(QUOTE_API_JSON_URL)
        response.raise_for_status()
        quote = _parse_quote_from_json(response.json())
    except (httpx.HTTPError, ValueError, TypeError):
        quote = ""
    if quote:
        return quote

    try:
        response = await client.get(QUOTE_API_TEXT_URL)
        response.raise_for_status()
        return _parse_quote_from_text(response.text)
    except httpx.HTTPError:
        return ""


async def get_random_quote() -> QuoteResponse:
    async with httpx.AsyncClient(timeout=FETCH_TIMEOUT_SECONDS) as client:
        for _ in range(MAX_FETCH_RETRIES):
            quote = await _fetch_remote_quote(client)
            if quote:
                return QuoteResponse(
                    quote=quote, source=REMOTE_SOURCE, provider=QUOTE_PROVIDER
                )

    fallback_quote = random.choice(FALLBACK_QUOTES)
    return QuoteResponse(
        quote=fallback_quote, source=DEFAULT_SOURCE, provider=LOCAL_PROVIDER
    )
