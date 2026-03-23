from fastapi import APIRouter

from app.schemas.quote import QuoteResponse
from app.services.quote_service import get_random_quote

router = APIRouter(prefix="/quote", tags=["quote"])


@router.get("/random", response_model=QuoteResponse)
async def random_quote() -> QuoteResponse:
    return await get_random_quote()
