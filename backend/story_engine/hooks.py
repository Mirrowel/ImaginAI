from __future__ import annotations


class StoryEngineHooks:
    """No-op hook seam for future memory, scripts, stats, image, safety, and style systems."""

    async def before_state_load(self, context: dict) -> None:
        """Run before adventure state reconstruction begins."""

    async def after_state_load(self, context: dict) -> None:
        """Run after adventure state reconstruction completes."""

    async def before_context_selection(self, context: dict) -> None:
        """Run before cards, memories, summaries, and turns are selected."""

    async def after_context_selection(self, context: dict) -> None:
        """Run after prompt context layers have been selected."""

    async def before_prompt_build(self, context: dict) -> None:
        """Run before prompt messages are assembled."""

    async def after_prompt_build(self, context: dict) -> None:
        """Run after prompt messages and debug layers are assembled."""

    async def before_model_call(self, context: dict) -> None:
        """Run immediately before the RotatorGateway call."""

    async def on_stream_chunk(self, context: dict, chunk: dict) -> None:
        """Observe normalized stream chunks without mutating secrets or prompt snapshots."""

    async def after_model_response(self, context: dict) -> None:
        """Run after raw model output is received and before commit."""

    async def before_turn_commit(self, context: dict) -> None:
        """Run before generated content is saved as a turn or variant."""

    async def after_turn_commit(self, context: dict) -> None:
        """Run after generated content is saved."""

    async def after_variant_selected(self, context: dict) -> None:
        """Run after a retry variant becomes active/canonical."""

    async def after_fork_created(self, context: dict) -> None:
        """Run after an adventure fork has been materialized."""
