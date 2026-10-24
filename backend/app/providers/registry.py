from .base import Provider


class ProviderRegistry:
    """Holds explicitly configured connectors; empty by default to avoid false LIVE claims."""

    def __init__(self) -> None:
        self.observations: list[Provider] = []
        self.warnings: list[Provider] = []


registry = ProviderRegistry()
