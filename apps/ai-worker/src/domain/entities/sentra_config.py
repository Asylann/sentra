"""
SentraConfig — Domain entity for repository-level custom rules.

Parsed from a ``.sentra.yml`` file fetched from the repository's file tree
at the PR's ``head.sha``. This gives B2B users self-serve control over the
AI code review process without requiring any changes to the Sentra platform.

Usage::

    raw_yaml = await github_client.get_file_content(repo, sha, ".sentra.yml", iid)
    config = SentraConfig.from_yaml_string(raw_yaml)

If the file does not exist (``raw_yaml`` is ``None``) or is malformed, a
default (all-empty) ``SentraConfig`` is returned so the pipeline continues
without interruption.
"""
import logging
from typing import Optional

import yaml
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

_SENTRA_YML = ".sentra.yml"


class SentraConfig(BaseModel):
    """
    Strict Pydantic model representing repository-level Sentra configuration.

    All fields are optional — an empty ``.sentra.yml`` (or a missing one)
    yields a no-op config that does not alter the default review behaviour.

    Fields
    ------
    custom_prompt:
        Free-text instruction appended verbatim to the LLM system prompt.
        Use this to add domain-specific context, e.g.
        ``"This is a HIPAA-regulated codebase. Treat any PII exposure as CRITICAL."``.

    forbidden_patterns:
        List of patterns (strings, regex fragments, or plain identifiers)
        that must never appear in new code. The LLM is instructed to flag
        any occurrence as a HIGH finding.
        Example: ``["eval(", "exec(", "os.system("]``.

    enforce_test_coverage:
        When ``True``, the LLM is instructed to flag any new function or
        class that lacks a corresponding test file as a LOW finding.

    architectural_guidelines:
        High-level architectural rules the LLM must verify against.
        Example: ``["Never import from infrastructure layer in domain layer",
                    "All HTTP endpoints must use dependency injection"]``.
    """

    custom_prompt: Optional[str] = Field(default=None)
    forbidden_patterns: list[str] = Field(default_factory=list)
    enforce_test_coverage: bool = Field(default=False)
    architectural_guidelines: list[str] = Field(default_factory=list)

    @property
    def has_rules(self) -> bool:
        """Return ``True`` if any non-default rule is configured."""
        return bool(
            self.custom_prompt
            or self.forbidden_patterns
            or self.enforce_test_coverage
            or self.architectural_guidelines
        )

    @classmethod
    def from_yaml_string(cls, raw_yaml: Optional[str]) -> "SentraConfig":
        """
        Parse a raw YAML string into a ``SentraConfig`` instance.

        Parameters
        ----------
        raw_yaml:
            The raw content of ``.sentra.yml``, or ``None`` if the file was
            not found in the repository.

        Returns
        -------
        SentraConfig
            Parsed configuration, or a default (all-empty) instance on error.
        """
        if not raw_yaml:
            return cls()

        try:
            data = yaml.safe_load(raw_yaml)
        except yaml.YAMLError as exc:
            logger.warning(
                "%s: failed to parse YAML — using default config. Error: %s",
                _SENTRA_YML,
                exc,
            )
            return cls()

        if not isinstance(data, dict):
            logger.warning(
                "%s: expected a YAML mapping at the root, got %s — using default config.",
                _SENTRA_YML,
                type(data).__name__,
            )
            return cls()

        try:
            return cls.model_validate(data)
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "%s: schema validation failed — using default config. Error: %s",
                _SENTRA_YML,
                exc,
            )
            return cls()
