import re

import httpx
from fastapi import APIRouter

from app.schemas.quote import QuoteResponse

router = APIRouter(prefix="/quote", tags=["quote"])

QUOTE_API_URL = "https://api.mmp.cc/api/yiyan?format=text"
QUOTE_PATTERN = re.compile(r'document\.write\("(?P<quote>.*)"\);?')
DEFAULT_QUOTE = ""
DEFAULT_SOURCE = ""
MAX_QUOTE_LEN = 16


def _parse_quote(raw: str) -> str:
    match = QUOTE_PATTERN.search(raw.strip())
    if not match:
        return DEFAULT_QUOTE

    quote = match.group("quote").strip()
    if not quote:
        return DEFAULT_QUOTE
    if len(quote) > MAX_QUOTE_LEN:
        return DEFAULT_QUOTE
    return quote


@router.get("/random", response_model=QuoteResponse)
async def random_quote() -> QuoteResponse:
    quote = DEFAULT_QUOTE
    source = "一言"

    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            response = await client.get(QUOTE_API_URL)
            response.raise_for_status()
            quote = _parse_quote(response.text)
    except httpx.HTTPError:
        source = DEFAULT_SOURCE

    return QuoteResponse(quote=quote, source=source, provider="api.mmp.cc")
