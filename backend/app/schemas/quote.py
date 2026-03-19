from pydantic import BaseModel


class QuoteResponse(BaseModel):
    quote: str
    source: str
    provider: str
