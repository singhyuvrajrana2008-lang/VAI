import asyncio
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Generic, TypeVar


T = TypeVar("T")


@dataclass
class ProviderResult(Generic[T]):
    provider: str
    state: str
    fetched_at: datetime
    items: list[T]
    message: str
    quality_flags: list[str]


class Provider(ABC, Generic[T]):
    provider_id: str
    capability: str

    @abstractmethod
    async def fetch(self, catchment_id: str) -> list[T]:
        """Fetch normalized records; implementations must preserve source provenance."""

    async def fetch_safely(self, catchment_id: str, timeout_seconds: float) -> ProviderResult[T]:
        now = datetime.now().astimezone()
        try:
            items = await asyncio.wait_for(self.fetch(catchment_id), timeout=timeout_seconds)
            state = "partial" if items else "unavailable"
            message = "Provider returned records." if items else "Provider returned no records."
            return ProviderResult(self.provider_id, state, now, items, message, [])
        except TimeoutError:
            return ProviderResult(self.provider_id, "error", now, [], "Provider request timed out.", ["PROVIDER_TIMEOUT"])
        except Exception:
            return ProviderResult(self.provider_id, "error", now, [], "Provider request failed.", ["PROVIDER_ERROR"])
