"""Import Intelligence: CV extraction, field-mapping suggestion, and dedupe scoring
for Domain 04 (Onboarding/Imports).

Everything here is deterministic and rule-based on purpose, not a placeholder for a
model we forgot to train: there is no labeled training data yet for any of these
three tasks (no corpus of hand-verified CV extractions, no labeled header->field
mapping corpus, no adjudicated duplicate/non-duplicate pairs), and shipping a model
"trained" on synthetic data would misrepresent its real-world accuracy to the rest
of the pipeline (import_field_mappings.model_version / import_dedupe_matches records
must stay honest about provenance). `model_version="rule-based-v1"` reflects that.

Security note: `extract_cv` treats its `text` input as UNTRUSTED DATA ONLY. It is never
concatenated into a prompt, never passed to an LLM/tool-invoking context, and never
used to construct file paths, shell commands, or SQL — it is only scanned with regexes
and split on lines. No external calls are made from this module.
"""

from __future__ import annotations

import re
from difflib import SequenceMatcher

from app.schemas.imports import (
    DedupeScoreRequest,
    DedupeScoreResponse,
    EducationEntry,
    ExperienceEntry,
    ExtractCvRequest,
    ExtractCvResponse,
    FieldMappingSuggestion,
    MapFieldsRequest,
    MapFieldsResponse,
)

# ---------------------------------------------------------------------------
# Shared normalization helpers
# ---------------------------------------------------------------------------

_EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
_PHONE_RE = re.compile(r"(\+?\d[\d\-.\s()]{7,}\d)")
_URL_RE = re.compile(r"(https?://[^\s,;]+|www\.[^\s,;]+)", re.IGNORECASE)
_NON_ALNUM_RE = re.compile(r"[^a-z0-9]+")
_DATE_RANGE_RE = re.compile(
    r"(\b\d{4}\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*\d{4}\b)"
    r"\s*(?:-|–|—|to)\s*"
    r"(\b\d{4}\b|present|current|now|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*\d{4}\b)",
    re.IGNORECASE,
)


def _normalize_text(value: str) -> str:
    return _NON_ALNUM_RE.sub(" ", value.lower()).strip()


def _normalize_token_set(value: str) -> set[str]:
    return {t for t in _normalize_text(value).split(" ") if t}


def _digits_only(value: str) -> str:
    return re.sub(r"\D", "", value)


def _similarity(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a, b).ratio()


# ---------------------------------------------------------------------------
# /extract-cv
# ---------------------------------------------------------------------------

_SECTION_HEADINGS: dict[str, tuple[str, ...]] = {
    "summary": ("summary", "profile", "objective", "about"),
    "experience": ("experience", "work experience", "employment", "employment history", "work history"),
    "education": ("education", "academic background", "qualifications"),
    "skills": ("skills", "technical skills", "core competencies", "key skills"),
    "certifications": ("certifications", "certificates", "licenses", "licences"),
    "projects": ("projects", "personal projects", "key projects"),
    "languages": ("languages",),
}

_ALL_HEADING_WORDS = {w for words in _SECTION_HEADINGS.values() for w in words}


def _heading_key(line: str) -> str | None:
    normalized = _normalize_text(line)
    if not normalized or len(normalized) > 40:
        return None
    for key, headings in _SECTION_HEADINGS.items():
        if normalized in headings:
            return key
    return None


def _split_sections(lines: list[str]) -> dict[str, list[str]]:
    sections: dict[str, list[str]] = {}
    current: str | None = None
    for line in lines:
        key = _heading_key(line)
        if key is not None:
            current = key
            sections.setdefault(current, [])
            continue
        if current is not None:
            sections[current].append(line)
    return sections


def _split_list_items(section_lines: list[str]) -> list[str]:
    items: list[str] = []
    for line in section_lines:
        stripped = line.strip(" \t-•*·")
        if not stripped:
            continue
        # A trailing contact footer (email/phone/link) commonly follows an
        # unterminated last section (no heading closes it) — exclude those
        # lines rather than let them leak into e.g. the skills list.
        if _EMAIL_RE.search(stripped) or _URL_RE.search(stripped) or len(_digits_only(stripped)) >= 7:
            continue
        # Skills/certifications/languages are frequently comma- or bullet-separated.
        parts = re.split(r",|;|•|\|", stripped)
        for part in parts:
            part = part.strip()
            if part:
                items.append(part)
    return items


def _parse_experience_entries(section_lines: list[str]) -> list[ExperienceEntry]:
    entries: list[ExperienceEntry] = []
    current_desc: list[str] = []
    current_header: str | None = None
    current_dates: tuple[str, str] | None = None

    def flush() -> None:
        if current_header is None and not current_desc:
            return
        company, title = _split_company_title(current_header or "")
        entries.append(
            ExperienceEntry(
                company=company,
                title=title,
                start_date=current_dates[0] if current_dates else None,
                end_date=current_dates[1] if current_dates else None,
                description=" ".join(current_desc).strip() or None,
            )
        )

    for line in section_lines:
        stripped = line.strip()
        if not stripped:
            continue
        match = _DATE_RANGE_RE.search(stripped)
        if match:
            if current_header is not None or current_desc:
                flush()
            current_desc = []
            current_dates = (match.group(1), match.group(2))
            current_header = _DATE_RANGE_RE.sub("", stripped).strip(" -,–—|")
        elif current_header is None and current_dates is None:
            current_header = stripped
        else:
            current_desc.append(stripped)
    flush()
    return entries[:50]


def _split_company_title(header: str) -> tuple[str | None, str | None]:
    for sep in (" at ", " - ", " – ", " | ", ","):
        if sep in header:
            left, right = header.split(sep, 1)
            return right.strip() or None, left.strip() or None
    return (header.strip() or None), None


def _parse_education_entries(section_lines: list[str]) -> list[EducationEntry]:
    entries: list[EducationEntry] = []
    for line in section_lines:
        stripped = line.strip()
        if not stripped:
            continue
        match = _DATE_RANGE_RE.search(stripped)
        start_date = end_date = None
        rest = stripped
        if match:
            start_date, end_date = match.group(1), match.group(2)
            rest = _DATE_RANGE_RE.sub("", stripped).strip(" -,–—|")
        institution, degree = _split_company_title(rest)
        entries.append(
            EducationEntry(
                institution=institution,
                degree=degree,
                field=None,
                start_date=start_date,
                end_date=end_date,
            )
        )
    return entries[:50]


def extract_cv(request: ExtractCvRequest) -> ExtractCvResponse:
    text = request.text[:200_000]
    lines = [ln.rstrip() for ln in text.splitlines()]
    non_empty_lines = [ln for ln in lines if ln.strip()]

    email_match = _EMAIL_RE.search(text)
    # Require >=9 digits so short numeric spans like a "2012 - 2016" date range
    # (8 digits) never get misread as a phone number.
    phone_value = next(
        (m.group(0).strip() for m in _PHONE_RE.finditer(text) if len(_digits_only(m.group(0))) >= 9),
        None,
    )
    links = list(dict.fromkeys(m.group(0) for m in _URL_RE.finditer(text)))[:20]

    sections = _split_sections(lines)

    # Name/headline: heuristic on the first couple of non-heading, non-contact lines.
    header_candidates = [
        ln.strip()
        for ln in non_empty_lines[:6]
        if _heading_key(ln) is None and "@" not in ln and not _PHONE_RE.search(ln) and len(ln.strip()) <= 80
    ]
    name = header_candidates[0] if header_candidates else None
    headline = header_candidates[1] if len(header_candidates) > 1 else None

    location = None
    location_match = re.search(r"\b([A-Z][a-zA-Z.\s]+,\s*[A-Z]{2,}[a-zA-Z\s]*)\b", "\n".join(non_empty_lines[:10]))
    if location_match:
        location = location_match.group(1).strip()

    summary_lines = sections.get("summary", [])
    summary = " ".join(ln.strip() for ln in summary_lines if ln.strip()).strip() or None

    experience_entries = _parse_experience_entries(sections.get("experience", []))
    education_entries = _parse_education_entries(sections.get("education", []))
    skills = _split_list_items(sections.get("skills", []))[:100]
    certifications = _split_list_items(sections.get("certifications", []))[:50]
    projects = _split_list_items(sections.get("projects", []))[:50]
    languages = _split_list_items(sections.get("languages", []))[:30]

    # NOTE: fields are passed as plain dicts (not `ScoredField(...)` instances) —
    # Pydantic v2's parametrized generics (`ScoredField[str | None]` vs the bare
    # `ScoredField` class) are distinct concrete models at runtime, so handing in
    # a bare instance fails validation. A dict is coerced into the correctly
    # parametrized model regardless.
    return ExtractCvResponse(
        source_import_file_id=request.source_import_file_id,
        name={"value": name, "confidence": 0.6 if name else 0.0},
        headline={"value": headline, "confidence": 0.4 if headline else 0.0},
        summary={"value": summary, "confidence": 0.55 if summary else 0.0},
        email={"value": email_match.group(0) if email_match else None, "confidence": 0.95 if email_match else 0.0},
        phone={"value": phone_value, "confidence": 0.85 if phone_value else 0.0},
        location={"value": location, "confidence": 0.5 if location else 0.0},
        experience={"value": experience_entries, "confidence": 0.6 if experience_entries else 0.0},
        education={"value": education_entries, "confidence": 0.6 if education_entries else 0.0},
        skills={"value": skills, "confidence": 0.65 if skills else 0.0},
        certifications={"value": certifications, "confidence": 0.6 if certifications else 0.0},
        projects={"value": projects, "confidence": 0.55 if projects else 0.0},
        languages={"value": languages, "confidence": 0.6 if languages else 0.0},
        links={"value": links, "confidence": 0.9 if links else 0.0},
    )


# ---------------------------------------------------------------------------
# /map-fields
# ---------------------------------------------------------------------------

# Server-side whitelist — the ONLY targets a header may ever be mapped to.
# Node's import_field_mappings writer must independently enforce this same
# allowlist (defense in depth), but this is the source of truth for the ML side.
_COMPANY_IMPORT_SYNONYMS: dict[str, list[str]] = {
    "company_name": ["company name", "company", "organisation", "organization", "employer", "business name", "account name"],
    "website": ["website", "url", "web site", "site", "homepage", "web address"],
    "domain": ["domain", "email domain", "web domain"],
    "industry": ["industry", "sector", "vertical"],
    "company_size": ["company size", "size", "employees", "headcount", "number of employees", "staff count"],
    "location": ["location", "city", "address", "hq", "headquarters", "country", "region"],
    "description": ["description", "about", "summary", "notes", "overview"],
}

_CONTACT_IMPORT_SYNONYMS: dict[str, list[str]] = {
    "first_name": ["first name", "given name", "forename", "fname"],
    "last_name": ["last name", "surname", "family name", "lname"],
    "email": ["email", "e mail", "email address", "mail"],
    "phone": ["phone", "telephone", "mobile", "cell", "phone number", "contact number"],
    "company_name": ["company", "organisation", "organization", "employer", "company name"],
    "title": ["title", "job title", "position", "role"],
    "location": ["location", "city", "address", "country", "region"],
    "tags": ["tags", "labels", "categories", "segments"],
}

_SCHEMA_SYNONYMS: dict[str, dict[str, list[str]]] = {
    "company_import": _COMPANY_IMPORT_SYNONYMS,
    "contact_import": _CONTACT_IMPORT_SYNONYMS,
}

_MATCH_THRESHOLD = 0.35


def _header_field_score(header_norm: str, header_tokens: set[str], synonyms: list[str]) -> float:
    best = 0.0
    for synonym in synonyms:
        seq_score = _similarity(header_norm, synonym)
        syn_tokens = _normalize_token_set(synonym)
        jaccard = len(header_tokens & syn_tokens) / len(header_tokens | syn_tokens) if (header_tokens or syn_tokens) else 0.0
        best = max(best, seq_score, jaccard)
    return best


def _sniff_sample_values(sample_values: list[str]) -> str | None:
    """Returns a target field hint ('email' | 'website' | 'phone' | 'domain') from sample value shapes."""
    if not sample_values:
        return None
    non_empty = [v.strip() for v in sample_values if v and v.strip()][:20]
    if not non_empty:
        return None

    email_hits = sum(1 for v in non_empty if _EMAIL_RE.fullmatch(v))
    url_hits = sum(1 for v in non_empty if _URL_RE.match(v))
    phone_hits = sum(1 for v in non_empty if _PHONE_RE.fullmatch(v.strip()))

    total = len(non_empty)
    if email_hits / total >= 0.6:
        return "email"
    if url_hits / total >= 0.6:
        return "website"
    if phone_hits / total >= 0.6:
        return "phone"
    return None


def map_fields(request: MapFieldsRequest) -> MapFieldsResponse:
    synonyms_by_field = _SCHEMA_SYNONYMS[request.target_schema]
    mappings: list[FieldMappingSuggestion] = []

    for header_sample in request.headers:
        header_norm = _normalize_text(header_sample.source_header)
        header_tokens = _normalize_token_set(header_sample.source_header)

        scores = {
            field: _header_field_score(header_norm, header_tokens, syns) for field, syns in synonyms_by_field.items()
        }
        sniff_hint = _sniff_sample_values(header_sample.sample_values)
        reason_parts: list[str] = []

        if sniff_hint and sniff_hint in scores:
            # Sample-value type sniffing disambiguates ambiguous/generic headers
            # (e.g. a header literally called "Contact") by boosting the field
            # whose shape the values actually match.
            scores[sniff_hint] = min(1.0, scores[sniff_hint] + 0.25)
            reason_parts.append(f"sample values match {sniff_hint} pattern")

        best_field, best_score = max(scores.items(), key=lambda kv: kv[1]) if scores else (None, 0.0)

        if best_score >= _MATCH_THRESHOLD:
            reason_parts.insert(0, f"header text similarity to '{best_field}' synonyms ({best_score:.2f})")
            mappings.append(
                FieldMappingSuggestion(
                    source_header=header_sample.source_header,
                    target_field=best_field,
                    confidence=round(best_score, 4),
                    reason="; ".join(reason_parts),
                )
            )
        else:
            mappings.append(
                FieldMappingSuggestion(
                    source_header=header_sample.source_header,
                    target_field=None,
                    confidence=0.0,
                    reason="no candidate target field met the confidence threshold",
                )
            )

    return MapFieldsResponse(target_schema=request.target_schema, mappings=mappings)


# ---------------------------------------------------------------------------
# /dedupe-score
# ---------------------------------------------------------------------------

_NAME_FIELD_CANDIDATES = ("name", "full_name", "company_name")


def _entity_name(entity: dict) -> str:
    parts = [entity.get("first_name"), entity.get("last_name")]
    combined = " ".join(str(p) for p in parts if p)
    if combined.strip():
        return combined
    for field in _NAME_FIELD_CANDIDATES:
        value = entity.get(field)
        if value:
            return str(value)
    return ""


def _entity_domain(entity: dict) -> str:
    domain = entity.get("domain")
    if domain:
        return str(domain).strip().lower()
    website = entity.get("website")
    if website:
        cleaned = re.sub(r"^https?://", "", str(website).strip().lower())
        cleaned = re.sub(r"^www\.", "", cleaned)
        return cleaned.split("/")[0]
    return ""


def dedupe_score(request: DedupeScoreRequest) -> DedupeScoreResponse:
    candidate, existing = request.candidate, request.existing
    reason_codes: list[str] = []

    candidate_email = str(candidate.get("email", "")).strip().lower()
    existing_email = str(existing.get("email", "")).strip().lower()
    if candidate_email and existing_email and candidate_email == existing_email:
        reason_codes.append("exact_email_match")
        return DedupeScoreResponse(
            entity_type=request.entity_type,
            match_probability=0.98,
            confidence_band="high",
            reason_codes=reason_codes,
            model_name=f"{request.entity_type}_dedupe",
        )

    candidate_phone = _digits_only(str(candidate.get("phone", "")))
    existing_phone = _digits_only(str(existing.get("phone", "")))
    if candidate_phone and existing_phone and len(candidate_phone) >= 7 and candidate_phone == existing_phone:
        reason_codes.append("exact_phone_match")
        return DedupeScoreResponse(
            entity_type=request.entity_type,
            match_probability=0.9,
            confidence_band="high",
            reason_codes=reason_codes,
            model_name=f"{request.entity_type}_dedupe",
        )

    name_similarity = _similarity(_normalize_text(_entity_name(candidate)), _normalize_text(_entity_name(existing)))
    if name_similarity > 0:
        reason_codes.append(f"normalized_name_similarity_{name_similarity:.2f}")

    candidate_domain = _entity_domain(candidate)
    existing_domain = _entity_domain(existing)
    candidate_company = _normalize_text(str(candidate.get("company_name", "")))
    existing_company = _normalize_text(str(existing.get("company_name", "")))
    company_match = 0.0
    if candidate_domain and existing_domain and candidate_domain == existing_domain:
        company_match = 1.0
        reason_codes.append("domain_match")
    elif candidate_company and existing_company and candidate_company == existing_company:
        company_match = 1.0
        reason_codes.append("company_name_match")
    elif candidate_company and existing_company:
        company_similarity = _similarity(candidate_company, existing_company)
        if company_similarity >= 0.6:
            company_match = company_similarity
            reason_codes.append(f"company_name_similarity_{company_similarity:.2f}")

    candidate_location = _normalize_text(str(candidate.get("location", "")))
    existing_location = _normalize_text(str(existing.get("location", "")))
    location_match = 0.0
    if candidate_location and existing_location:
        if candidate_location == existing_location:
            location_match = 1.0
            reason_codes.append("location_match")
        else:
            location_similarity = _similarity(candidate_location, existing_location)
            if location_similarity >= 0.6:
                location_match = location_similarity
                reason_codes.append(f"location_similarity_{location_similarity:.2f}")

    # Weighted blend: name carries the most signal for contacts/profiles; company
    # (name/domain) and location act as corroborating evidence, not primary signals.
    match_probability = (name_similarity * 0.5) + (company_match * 0.3) + (location_match * 0.2)
    match_probability = round(min(match_probability, 0.97), 4)

    if match_probability >= 0.85:
        band = "high"
    elif match_probability >= 0.55:
        band = "medium"
    else:
        band = "low"

    if not reason_codes:
        reason_codes.append("no_significant_field_overlap")

    return DedupeScoreResponse(
        entity_type=request.entity_type,
        match_probability=match_probability,
        confidence_band=band,
        reason_codes=reason_codes,
        model_name=f"{request.entity_type}_dedupe",
    )
