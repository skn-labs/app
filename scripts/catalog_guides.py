#!/usr/bin/env python3
"""Generate and validate neutral per-product catalog guides.

The script deliberately keeps the AI outside the database transaction.  Every
selected product receives either a validated AI guide or the same contract
filled by the deterministic editorial category rule.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import json
import os
import random
import re
import sqlite3
import sys
import tempfile
import time
import urllib.error
import urllib.request
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence, Tuple


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB = ROOT / "backend/data/skn.db"
DEFAULT_RULES = ROOT / "scripts/catalog-guide-rules.json"
DEFAULT_ARTIFACTS = ROOT / "backend/data/catalog-guides"
OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"
GUIDE_KEYS = {
    "summary",
    "routineStep",
    "usageType",
    "usageTiming",
    "usageInstructions",
    "highlights",
    "origin",
    "generatedAt",
}
FORBIDDEN_GUIDE_LANGUAGE_PATTERNS = (r"기록", r"비교", r"관찰", r"느낌", r"남기")
FORBIDDEN_SUMMARY_PATTERNS = (
    r"추천",
    r"잘\s*맞",
    r"적합",
    r"안전",
    r"무해",
    r"치료",
    r"예방",
    r"보장",
    r"알레르기",
    r"임산부",
    r"유해",
    r"독성",
    r"강한\s*세정력",
)
CATALOG_BOUND_PATTERNS = (
    r"저자극",
    r"순한",
    r"효과",
    r"효능",
    r"개선",
    r"진정",
    r"미백",
    r"주름",
    r"장벽",
    r"트러블",
    r"여드름",
    r"약산성",
    r"\bpH\b",
    r"\bSPF\s*\d+",
    r"\bPA\s*\+",
    r"\d+(?:\.\d+)?\s*%",
)
DISTINCTIVE_STOPWORDS = {
    "제품", "제형", "사용", "사용하는", "안내", "표시", "등록", "피부", "얼굴",
    "아침", "저녁", "단계", "카테고리", "스킨케어", "데일리", "타입", "함유",
}


class CatalogGuideError(RuntimeError):
    pass


class GuideValidationError(CatalogGuideError):
    pass


@dataclass(frozen=True)
class Product:
    id: int
    brand: str
    name: str
    category: str
    texture: str
    description: str = ""
    catalog_facts: Tuple[str, ...] = ()


@dataclass(frozen=True)
class ResolvedGuide:
    product: Product
    input_hash: str
    guide: Dict[str, Any]
    source: str
    attempts: int = 0


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def atomic_write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(value, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
        os.replace(tmp_name, path)
    except Exception:
        try:
            os.unlink(tmp_name)
        except FileNotFoundError:
            pass
        raise


def load_env_file(path: Path) -> None:
    """Load only missing values from a small dotenv file without echoing secrets."""
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if value and value[0:1] == value[-1:] and value.startswith(("'", '"')):
            value = value[1:-1]
        if key in {"OPENAI_API_KEY", "OPENAI_MODEL", "OPENAI_REASONING_EFFORT"} and key not in os.environ:
            os.environ[key] = value


def load_rules(path: Path) -> Dict[str, Any]:
    try:
        rules = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise CatalogGuideError(f"규칙 파일을 읽을 수 없습니다: {path}") from exc
    required = {
        "schemaVersion",
        "promptVersion",
        "aiOrigin",
        "editorialOrigin",
        "usageInstructions",
        "highlightVocabulary",
        "families",
    }
    if set(rules) != required:
        raise CatalogGuideError(f"규칙 파일 최상위 키가 계약과 다릅니다: {sorted(set(rules) ^ required)}")
    if rules["aiOrigin"] != "AI_GENERATED" or rules["editorialOrigin"] != "EDITORIAL":
        raise CatalogGuideError("origin은 DB 계약인 AI_GENERATED/EDITORIAL이어야 합니다.")
    if not isinstance(rules["families"], list) or not rules["families"]:
        raise CatalogGuideError("카테고리 family 규칙이 비어 있습니다.")
    return rules


def family_index(rules: Mapping[str, Any]) -> Tuple[Dict[str, Mapping[str, Any]], List[str]]:
    index: Dict[str, Mapping[str, Any]] = {}
    duplicates: List[str] = []
    for family in rules["families"]:
        for category in family["categories"]:
            if category in index:
                duplicates.append(category)
            else:
                index[category] = family
    return index, sorted(set(duplicates))


def connect_readonly(db_path: Path) -> sqlite3.Connection:
    if not db_path.exists():
        raise CatalogGuideError(f"SQLite DB가 없습니다: {db_path}")
    uri = f"file:{db_path.resolve()}?mode=ro"
    connection = sqlite3.connect(uri, uri=True)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def load_products(db_path: Path) -> List[Product]:
    with connect_readonly(db_path) as connection:
        try:
            rows = connection.execute(
                "SELECT id, brand, name, category, COALESCE(texture, '') AS texture, "
                "COALESCE(description, '') AS description, COALESCE(facts_json, '[]') AS facts_json "
                "FROM product ORDER BY id"
            ).fetchall()
        except sqlite3.DatabaseError as exc:
            raise CatalogGuideError("product 테이블에서 카탈로그를 읽을 수 없습니다.") from exc
    products = []
    for row in rows:
        try:
            raw_facts = json.loads(str(row["facts_json"] or "[]"))
        except json.JSONDecodeError:
            raw_facts = []
        facts = tuple(
            str(value).strip()
            for value in raw_facts
            if isinstance(value, str) and str(value).strip()
        )
        products.append(Product(
            id=int(row["id"]),
            brand=str(row["brand"] or "").strip(),
            name=str(row["name"] or "").strip(),
            category=str(row["category"] or "").strip(),
            texture=str(row["texture"] or "").strip(),
            description=str(row["description"] or "").strip(),
            catalog_facts=facts,
        ))
    if not products:
        raise CatalogGuideError("product 테이블이 비어 있습니다.")
    duplicate_ids = [item for item, count in Counter(p.id for p in products).items() if count != 1]
    if duplicate_ids:
        raise CatalogGuideError(f"중복 product ID가 있습니다: {duplicate_ids[:10]}")
    return products


def validate_category_mapping(
    products: Sequence[Product], rules: Mapping[str, Any]
) -> Dict[str, Any]:
    index, duplicates = family_index(rules)
    category_counts = Counter(product.category for product in products)
    database_categories = set(category_counts)
    mapped_categories = set(index)
    missing = sorted(database_categories - mapped_categories)
    extra = sorted(mapped_categories - database_categories)
    missing_texture_ids = [product.id for product in products if not product.texture]
    complete = not missing and not extra and not duplicates and not missing_texture_ids
    report = {
        "schemaVersion": rules["schemaVersion"],
        "checkedAt": utc_now(),
        "productCount": len(products),
        "databaseCategoryCount": len(database_categories),
        "mappedCategoryCount": len(mapped_categories),
        "mappingComplete": complete,
        "missingCategories": missing,
        "extraCategories": extra,
        "duplicateCategories": duplicates,
        "missingTextureProductIds": missing_texture_ids,
        "categories": [
            {
                "category": category,
                "productCount": category_counts.get(category, 0),
                "family": index[category]["name"] if category in index else None,
            }
            for category in sorted(database_categories | mapped_categories)
        ],
    }
    if len(database_categories) != 46 or len(mapped_categories) != 46 or not complete:
        raise CatalogGuideError(
            "카테고리 매핑이 46/46이 아닙니다. "
            f"DB={len(database_categories)}, 규칙={len(mapped_categories)}, "
            f"누락={missing}, 초과={extra}, 중복={duplicates}, "
            f"제형누락={missing_texture_ids[:20]}"
        )
    return report


def rule_for(product: Product, rules: Mapping[str, Any]) -> Mapping[str, Any]:
    index, _ = family_index(rules)
    try:
        return index[product.category]
    except KeyError as exc:
        raise CatalogGuideError(f"매핑되지 않은 카테고리입니다: {product.category}") from exc


def rendered_highlights(
    product: Product, family: Mapping[str, Any], rules: Mapping[str, Any]
) -> List[Dict[str, str]]:
    keys = ["texture", *family["highlightKeys"]]
    return [
        {
            "title": rules["highlightVocabulary"][key]["title"].format(
                name=product.name, category=product.category, texture=product.texture
            ),
            "detail": rules["highlightVocabulary"][key]["detail"].format(
                name=product.name, category=product.category, texture=product.texture
            ),
        }
        for key in keys
    ]


def guide_input_hash(product: Product, family: Mapping[str, Any], rules: Mapping[str, Any], model: str) -> str:
    payload = {
        "product": {
            "id": product.id,
            "brand": product.brand,
            "name": product.name,
            "category": product.category,
            "texture": product.texture,
            "description": product.description,
            "catalogFacts": product.catalog_facts,
        },
        "family": family,
        "rulesSchemaVersion": rules["schemaVersion"],
        "promptVersion": rules["promptVersion"],
        "model": model,
        "reasoningEffort": os.environ.get("OPENAI_REASONING_EFFORT", "low").strip() or "low",
    }
    return hashlib.sha256(canonical_json(payload).encode("utf-8")).hexdigest()


def editorial_summary(product: Product, family: Mapping[str, Any]) -> str:
    description = product.description.strip().rstrip(".。!? ")
    if description.endswith(("표시", "안내")):
        lead = f"{description}된 제품이에요."
    elif description:
        lead = f"{description} 제품이에요."
    else:
        lead = family["summaryTemplate"].format(
            name=product.name, category=product.category, texture=product.texture
        )
    classification = f"{product.texture} 제형의 {product.category}로 분류돼요."
    summary = f"{lead} {classification}"
    if product.catalog_facts:
        facts = " · ".join(product.catalog_facts[:2])
        candidate = f"{summary} 등록된 특징은 {facts}예요."
        if len(candidate) <= 220:
            summary = candidate
    return summary


def editorial_guide(
    product: Product, family: Mapping[str, Any], rules: Mapping[str, Any], generated_at: str
) -> Dict[str, Any]:
    guide = {
        "summary": editorial_summary(product, family),
        "routineStep": family["routineStep"],
        "usageType": family["usageType"],
        "usageTiming": list(family["usageTiming"]),
        "usageInstructions": [
            rules["usageInstructions"][key] for key in family["usageInstructionKeys"][:3]
        ],
        "highlights": rendered_highlights(product, family, rules)[:4],
        "origin": rules["editorialOrigin"],
        "generatedAt": generated_at,
    }
    validate_guide(guide, product, family, rules)
    return guide


def _without_identity(summary: str, product: Product) -> str:
    scrubbed = summary
    for value in sorted(
        {product.brand, product.name, product.category, product.texture}, key=len, reverse=True
    ):
        if value:
            scrubbed = scrubbed.replace(value, "")
    return scrubbed


def distinctive_terms(product: Product) -> set[str]:
    text = " ".join((product.description, *product.catalog_facts))
    return {
        token
        for token in re.findall(r"[가-힣A-Za-z0-9+]+", text)
        if len(token) >= 2 and token not in DISTINCTIVE_STOPWORDS
    }


def validate_guide(
    guide: Any, product: Product, family: Mapping[str, Any], rules: Mapping[str, Any]
) -> None:
    if not isinstance(guide, dict) or set(guide) != GUIDE_KEYS:
        actual = set(guide) if isinstance(guide, dict) else set()
        raise GuideValidationError(f"가이드 키 불일치: {sorted(actual ^ GUIDE_KEYS)}")
    summary = guide["summary"]
    if not isinstance(summary, str) or not summary.strip() or len(summary.strip()) > 220:
        raise GuideValidationError("summary는 1~220자의 문자열이어야 합니다.")
    if re.match(rf"^{re.escape(product.name)}\s*[:：\-–—]", summary):
        raise GuideValidationError("summary는 상세 상단의 제품명을 반복하지 않아야 합니다.")
    if product.category not in summary:
        raise GuideValidationError("summary는 제품 종류를 설명하도록 정확한 카테고리를 포함해야 합니다.")
    if not product.texture or product.texture not in summary:
        raise GuideValidationError("summary는 확인된 제형을 포함해야 합니다.")
    scrubbed_sentence = _without_identity(summary, product).strip()
    sentence_count = len(re.findall(r"[.!?](?=\s|$)", scrubbed_sentence))
    if not scrubbed_sentence.endswith((".", "!", "?")) or not 1 <= sentence_count <= 3:
        raise GuideValidationError("summary는 1~3문장이어야 합니다.")
    if guide["routineStep"] != family["routineStep"]:
        raise GuideValidationError("routineStep이 카테고리 규칙과 다릅니다.")
    if guide["usageType"] != family["usageType"]:
        raise GuideValidationError("usageType이 카테고리 규칙과 다릅니다.")
    if guide["usageTiming"] != list(family["usageTiming"]):
        raise GuideValidationError("usageTiming이 카테고리 규칙과 다릅니다.")

    allowed_instructions = {
        rules["usageInstructions"][key] for key in family["usageInstructionKeys"]
    }
    instructions = guide["usageInstructions"]
    if (
        not isinstance(instructions, list)
        or not 1 <= len(instructions) <= 3
        or len(set(instructions)) != len(instructions)
        or any(
            not isinstance(instruction, str) or instruction not in allowed_instructions
            for instruction in instructions
        )
    ):
        raise GuideValidationError("usageInstructions가 허용된 카테고리 일반 사용법과 다릅니다.")

    allowed_highlights = {
        (highlight["title"], highlight["detail"])
        for highlight in rendered_highlights(product, family, rules)
    }
    highlights = guide["highlights"]
    if not isinstance(highlights, list) or not 2 <= len(highlights) <= 4:
        raise GuideValidationError("highlights는 2~4개여야 합니다.")
    highlight_pairs: List[Tuple[str, str]] = []
    for highlight in highlights:
        if not isinstance(highlight, dict) or set(highlight) != {"title", "detail"}:
            raise GuideValidationError("highlight 계약이 잘못됐습니다.")
        pair = (highlight["title"], highlight["detail"])
        if pair not in allowed_highlights:
            raise GuideValidationError("highlight가 허용된 카테고리 설명과 다릅니다.")
        highlight_pairs.append(pair)
    if len(set(highlight_pairs)) != len(highlight_pairs):
        raise GuideValidationError("highlight가 중복됐습니다.")

    visible_texts = [summary, *instructions]
    visible_texts.extend(value for highlight in highlights for value in highlight.values())
    forbidden_language = [
        pattern
        for pattern in FORBIDDEN_GUIDE_LANGUAGE_PATTERNS
        if any(re.search(pattern, text, re.IGNORECASE) for text in visible_texts)
    ]
    if forbidden_language:
        raise GuideValidationError(f"가이드 목적과 맞지 않는 금지 표현 감지: {forbidden_language}")

    if guide["origin"] not in {rules["aiOrigin"], rules["editorialOrigin"]}:
        raise GuideValidationError("origin이 허용된 값이 아닙니다.")
    generated_at = guide["generatedAt"]
    if not isinstance(generated_at, str):
        raise GuideValidationError("generatedAt은 UTC ISO-8601 문자열이어야 합니다.")
    try:
        datetime.fromisoformat(generated_at.replace("Z", "+00:00"))
    except ValueError as exc:
        raise GuideValidationError("generatedAt 형식이 잘못됐습니다.") from exc

    if guide["origin"] == rules["aiOrigin"]:
        scrubbed = _without_identity(summary, product)
        hits = [pattern for pattern in FORBIDDEN_SUMMARY_PATTERNS if re.search(pattern, scrubbed, re.IGNORECASE)]
        if hits:
            raise GuideValidationError(f"summary 금지 표현 감지: {hits}")
        catalog_text = " ".join((product.description, *product.catalog_facts))
        unsupported = [
            pattern
            for pattern in CATALOG_BOUND_PATTERNS
            if re.search(pattern, summary, re.IGNORECASE)
            and not re.search(pattern, catalog_text, re.IGNORECASE)
        ]
        if unsupported:
            raise GuideValidationError(f"카탈로그 입력에 없는 주장 감지: {unsupported}")
        terms = distinctive_terms(product)
        if terms and not any(term in summary for term in terms):
            raise GuideValidationError("summary가 제품별 카탈로그 특징을 사용하지 않았습니다.")


def artifact_path(artifacts_dir: Path, product_id: int) -> Path:
    return artifacts_dir / "products" / f"{product_id}.json"


def write_artifact(
    artifacts_dir: Path,
    resolved: ResolvedGuide,
    rules: Mapping[str, Any],
    model: str,
) -> None:
    payload = {
        "artifactSchemaVersion": "2.0.0",
        "productId": resolved.product.id,
        "inputHash": resolved.input_hash,
        "model": model,
        "promptVersion": rules["promptVersion"],
        "source": resolved.source,
        "attempts": resolved.attempts,
        "guide": resolved.guide,
    }
    atomic_write_json(artifact_path(artifacts_dir, resolved.product.id), payload)


def load_cached_artifact(
    artifacts_dir: Path,
    product: Product,
    expected_hash: str,
    family: Mapping[str, Any],
    rules: Mapping[str, Any],
) -> Optional[ResolvedGuide]:
    path = artifact_path(artifacts_dir, product.id)
    if not path.exists():
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
        if payload.get("productId") != product.id or payload.get("inputHash") != expected_hash:
            return None
        guide = payload["guide"]
        validate_guide(guide, product, family, rules)
        return ResolvedGuide(product, expected_hash, guide, "CACHED", int(payload.get("attempts", 0)))
    except (OSError, json.JSONDecodeError, KeyError, TypeError, ValueError, GuideValidationError):
        return None


def reusable_cached_guide(
    cached: Optional[ResolvedGuide], mode: str, rules: Mapping[str, Any]
) -> bool:
    if cached is None:
        return False
    if mode in {"generate", "generate-upsert"}:
        return cached.guide["origin"] == rules["aiOrigin"]
    return True


def chunks(items: Sequence[Product], size: int) -> Iterable[Sequence[Product]]:
    for index in range(0, len(items), size):
        yield items[index : index + size]


def cancel_pending_futures(futures: Iterable[concurrent.futures.Future]) -> int:
    return sum(1 for future in futures if future.cancel())


def guide_schema(products: Sequence[Product], rules: Mapping[str, Any], generated_at: str) -> Dict[str, Any]:
    families = [rule_for(product, rules) for product in products]
    routine_steps = sorted({family["routineStep"] for family in families})
    usage_types = sorted({family["usageType"] for family in families})
    timings = sorted({value for family in families for value in family["usageTiming"]})
    instructions = sorted(
        {
            rules["usageInstructions"][key]
            for family in families
            for key in family["usageInstructionKeys"]
        }
    )
    highlight_titles = sorted(
        {
            highlight["title"]
            for product, family in zip(products, families)
            for highlight in rendered_highlights(product, family, rules)
        }
    )
    highlight_details = sorted(
        {
            highlight["detail"]
            for product, family in zip(products, families)
            for highlight in rendered_highlights(product, family, rules)
        }
    )
    guide = {
        "type": "object",
        "properties": {
            "summary": {"type": "string"},
            "routineStep": {"type": "string", "enum": routine_steps},
            "usageType": {"type": "string", "enum": usage_types},
            "usageTiming": {"type": "array", "items": {"type": "string", "enum": timings}},
            "usageInstructions": {
                "type": "array",
                "items": {"type": "string", "enum": instructions},
            },
            "highlights": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string", "enum": highlight_titles},
                        "detail": {"type": "string", "enum": highlight_details},
                    },
                    "required": ["title", "detail"],
                    "additionalProperties": False,
                },
            },
            "origin": {"type": "string", "enum": [rules["aiOrigin"]]},
            "generatedAt": {"type": "string", "enum": [generated_at]},
        },
        "required": [
            "summary",
            "routineStep",
            "usageType",
            "usageTiming",
            "usageInstructions",
            "highlights",
            "origin",
            "generatedAt",
        ],
        "additionalProperties": False,
    }
    return {
        "type": "object",
        "properties": {
            "items": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "productId": {"type": "integer", "enum": [product.id for product in products]},
                        "guide": guide,
                    },
                    "required": ["productId", "guide"],
                    "additionalProperties": False,
                },
            }
        },
        "required": ["items"],
        "additionalProperties": False,
    }


def batch_prompt(products: Sequence[Product], rules: Mapping[str, Any], generated_at: str) -> str:
    items = []
    for product in products:
        family = rule_for(product, rules)
        items.append(
            {
                "productId": product.id,
                "identity": {
                    "brand": product.brand,
                    "name": product.name,
                    "category": product.category,
                    "texture": product.texture,
                },
                "catalogInput": {
                    "description": product.description,
                    "facts": list(product.catalog_facts),
                },
                "required": {
                    "routineStep": family["routineStep"],
                    "usageType": family["usageType"],
                    "usageTiming": family["usageTiming"],
                    "allowedUsageInstructions": [
                        rules["usageInstructions"][key] for key in family["usageInstructionKeys"]
                    ],
                    "allowedHighlights": rendered_highlights(product, family, rules),
                    "origin": rules["aiOrigin"],
                    "generatedAt": generated_at,
                },
            }
        )
    return (
        "아래 제품마다 정확히 한 개의 한국어 제품 사용 가이드를 만드세요. "
        "identity와 catalogInput에 있는 정보만 사용하고 제품 사실을 새로 추정하지 마세요. "
        "성분, 효능, 안전성, 피부 적합성, 의학적 판단, 수치, 공식 주장을 새로 만들지 마세요. "
        "summary는 상세 상단에 이미 보이는 제품명을 반복하지 말고 1~3문장으로 작성하세요. "
        "정확한 카테고리와 제형을 포함하고, catalogInput의 제품별 설명이나 특징을 최소 하나 사용해 "
        "같은 카테고리의 다른 제품과 구분되는 내용을 먼저 설명하세요. catalogInput 문장을 그대로 나열하지 말고 자연스럽게 정리하세요. "
        "기록, 비교, 관찰, 느낌, 남기기와 관련된 표현은 어느 필드에도 쓰지 마세요. "
        "routineStep, usageType, usageTiming은 required 값을 그대로 복사하세요. "
        "usageInstructions는 allowedUsageInstructions에서 중복 없이 1~3개 선택하세요. "
        "highlights는 allowedHighlights의 title/detail 쌍을 바꾸지 말고 중복 없이 2~4개 선택하세요. "
        "productId를 빠뜨리거나 중복하거나 추가하지 마세요.\n\n"
        + canonical_json({"products": items})
    )


def responses_output_text(response: Mapping[str, Any]) -> str:
    if response.get("status") != "completed":
        raise CatalogGuideError(f"Responses 상태가 completed가 아닙니다: {response.get('status')}")
    texts: List[str] = []
    for output in response.get("output", []):
        for content in output.get("content", []):
            if content.get("type") == "refusal":
                raise CatalogGuideError("모델이 요청을 거절했습니다.")
            if content.get("type") == "output_text" and isinstance(content.get("text"), str):
                texts.append(content["text"])
    if not texts:
        raise CatalogGuideError("Responses 결과에 output_text가 없습니다.")
    return "".join(texts)


def retry_after_seconds(
    headers: Optional[Mapping[str, str]],
    attempt: int,
    now: Optional[datetime] = None,
) -> float:
    """Return Retry-After when valid, otherwise the 429 fallback schedule."""
    value = headers.get("Retry-After") if headers else None
    if value:
        stripped = value.strip()
        try:
            seconds = float(stripped)
            if seconds >= 0:
                return seconds
        except ValueError:
            try:
                retry_at = parsedate_to_datetime(stripped)
                if retry_at.tzinfo is None:
                    retry_at = retry_at.replace(tzinfo=timezone.utc)
                reference = now or datetime.now(timezone.utc)
                if reference.tzinfo is None:
                    reference = reference.replace(tzinfo=timezone.utc)
                return max(0.0, (retry_at - reference).total_seconds())
            except (TypeError, ValueError, OverflowError):
                pass
    return float((15, 30, 60)[min(max(attempt, 0), 2)])


def call_openai_batch(
    products: Sequence[Product],
    rules: Mapping[str, Any],
    generated_at: str,
    api_key: str,
    model: str,
    max_retries: int,
) -> Tuple[Dict[str, Any], int]:
    reasoning_effort = os.environ.get("OPENAI_REASONING_EFFORT", "low").strip() or "low"
    if reasoning_effort not in {"none", "minimal", "low", "medium", "high", "xhigh"}:
        raise CatalogGuideError(
            "OPENAI_REASONING_EFFORT는 none|minimal|low|medium|high|xhigh 중 하나여야 합니다."
        )
    payload = {
        "model": model,
        "reasoning": {"effort": reasoning_effort},
        "store": False,
        "instructions": (
            "당신은 화장품의 효능을 추정하는 상담사가 아니라, 제공된 제품별 카탈로그 설명과 "
            "특징을 자연스럽고 구체적인 한국어로 정리하는 카탈로그 에디터입니다. "
            "입력에 없는 사실은 추가하지 않습니다."
        ),
        "input": batch_prompt(products, rules, generated_at),
        "text": {
            "format": {
                "type": "json_schema",
                "name": "catalog_guides",
                "strict": True,
                "schema": guide_schema(products, rules, generated_at),
            }
        },
        "max_output_tokens": max(3000, len(products) * 400),
    }
    body = canonical_json(payload).encode("utf-8")
    attempts = 0
    for attempt in range(max_retries + 1):
        attempts += 1
        request = urllib.request.Request(
            OPENAI_RESPONSES_URL,
            data=body,
            method="POST",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                parsed = json.loads(response.read().decode("utf-8"))
            return json.loads(responses_output_text(parsed)), attempts
        except urllib.error.HTTPError as exc:
            retryable = exc.code == 429 or 500 <= exc.code < 600
            if exc.code == 429:
                retry_delay = retry_after_seconds(exc.headers, attempt)
            else:
                retry_delay = min(20.0, (2**attempt) + random.random())
            print(
                f"[catalog-guides] OpenAI HTTP {exc.code}; attempt={attempts}; "
                f"retry={retryable and attempt < max_retries}; wait={retry_delay:.1f}s",
                file=sys.stderr,
            )
            if not retryable or attempt >= max_retries:
                raise CatalogGuideError(f"OpenAI HTTP {exc.code}") from exc
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, CatalogGuideError) as exc:
            retry_delay = min(20.0, (2**attempt) + random.random())
            print(
                f"[catalog-guides] OpenAI {type(exc).__name__}; attempt={attempts}; "
                f"retry={attempt < max_retries}; wait={retry_delay:.1f}s",
                file=sys.stderr,
            )
            if attempt >= max_retries:
                raise CatalogGuideError(f"OpenAI 응답 실패: {type(exc).__name__}") from exc
        time.sleep(retry_delay)
    raise AssertionError("retry loop should return or raise")


def resolve_batch_items(
    products: Sequence[Product],
    payload: Any,
    rules: Mapping[str, Any],
    generated_at: str,
    model: str,
    attempts: int,
) -> Tuple[List[ResolvedGuide], Dict[str, List[int]]]:
    expected = {product.id: product for product in products}
    raw_items = payload.get("items", []) if isinstance(payload, dict) else []
    counts = Counter(
        item.get("productId")
        for item in raw_items
        if isinstance(item, dict) and isinstance(item.get("productId"), int)
    )
    extras = sorted(product_id for product_id in counts if product_id not in expected)
    duplicates = sorted(product_id for product_id, count in counts.items() if product_id in expected and count != 1)
    missing = sorted(product_id for product_id in expected if counts.get(product_id, 0) == 0)
    by_id = {
        item["productId"]: item
        for item in raw_items
        if isinstance(item, dict)
        and item.get("productId") in expected
        and counts.get(item.get("productId")) == 1
    }
    invalid: List[int] = []
    resolved: List[ResolvedGuide] = []
    for product in products:
        family = rule_for(product, rules)
        input_hash = guide_input_hash(product, family, rules, model)
        item = by_id.get(product.id)
        guide: Dict[str, Any]
        source = "AI"
        if item is not None:
            try:
                guide = item["guide"]
                validate_guide(guide, product, family, rules)
            except (KeyError, TypeError, GuideValidationError):
                invalid.append(product.id)
                guide = editorial_guide(product, family, rules, generated_at)
                source = "EDITORIAL"
        else:
            guide = editorial_guide(product, family, rules, generated_at)
            source = "EDITORIAL"
        resolved.append(ResolvedGuide(product, input_hash, guide, source, attempts))
    return resolved, {
        "missing": missing,
        "duplicates": duplicates,
        "extras": extras,
        "invalid": sorted(invalid),
    }


def generate_batch(
    products: Sequence[Product],
    rules: Mapping[str, Any],
    generated_at: str,
    api_key: str,
    model: str,
    max_retries: int,
) -> Tuple[List[ResolvedGuide], Dict[str, List[int]]]:
    try:
        payload, attempts = call_openai_batch(
            products, rules, generated_at, api_key, model, max_retries
        )
        return resolve_batch_items(products, payload, rules, generated_at, model, attempts)
    except CatalogGuideError:
        fallback = []
        for product in products:
            family = rule_for(product, rules)
            fallback.append(
                ResolvedGuide(
                    product,
                    guide_input_hash(product, family, rules, model),
                    editorial_guide(product, family, rules, generated_at),
                    "EDITORIAL",
                    max_retries + 1,
                )
            )
        return fallback, {
            "missing": [product.id for product in products],
            "duplicates": [],
            "extras": [],
            "invalid": [],
        }


def select_products(products: Sequence[Product], ids: Optional[Sequence[int]], limit: Optional[int]) -> List[Product]:
    if ids:
        requested = list(dict.fromkeys(ids))
        by_id = {product.id: product for product in products}
        missing = [product_id for product_id in requested if product_id not in by_id]
        if missing:
            raise CatalogGuideError(f"DB에 없는 product ID입니다: {missing}")
        selected = [by_id[product_id] for product_id in requested]
    else:
        selected = list(products)
    if limit is not None:
        selected = selected[:limit]
    if not selected:
        raise CatalogGuideError("선택된 제품이 없습니다.")
    return selected


def ensure_selected_coverage(
    selected: Sequence[Product], resolved: Sequence[ResolvedGuide], rules: Mapping[str, Any]
) -> None:
    expected = Counter(product.id for product in selected)
    actual = Counter(item.product.id for item in resolved)
    if expected != actual:
        missing = sorted((expected - actual).elements())
        extra = sorted((actual - expected).elements())
        raise CatalogGuideError(f"결과 ID 범위가 다릅니다. missing={missing}, extra={extra}")
    for item in resolved:
        validate_guide(item.guide, item.product, rule_for(item.product, rules), rules)


def generate_guides(
    selected: Sequence[Product],
    rules: Mapping[str, Any],
    artifacts_dir: Path,
    mode: str,
    model: str,
    api_key: Optional[str],
    batch_size: int,
    workers: int,
    max_retries: int,
    force: bool,
) -> List[ResolvedGuide]:
    generated_at = utc_now()
    resolved: List[ResolvedGuide] = []
    pending: List[Product] = []
    for product in selected:
        family = rule_for(product, rules)
        input_hash = guide_input_hash(product, family, rules, model)
        cached = None if force else load_cached_artifact(
            artifacts_dir, product, input_hash, family, rules
        )
        if reusable_cached_guide(cached, mode, rules):
            resolved.append(cached)
        else:
            pending.append(product)

    if mode == "dry-run" or mode == "upsert":
        for product in pending:
            family = rule_for(product, rules)
            item = ResolvedGuide(
                product,
                guide_input_hash(product, family, rules, model),
                editorial_guide(product, family, rules, generated_at),
                "EDITORIAL",
                0,
            )
            resolved.append(item)
            if mode == "upsert":
                write_artifact(artifacts_dir, item, rules, model)
    else:
        if pending and not api_key:
            raise CatalogGuideError("generate 모드에는 OPENAI_API_KEY가 필요합니다.")
        batches = list(chunks(pending, batch_size))
        executor = concurrent.futures.ThreadPoolExecutor(max_workers=workers)
        futures: Dict[concurrent.futures.Future, Sequence[Product]] = {}
        try:
            for batch in batches:
                future = executor.submit(
                    generate_batch,
                    batch,
                    rules,
                    generated_at,
                    api_key,
                    model,
                    max_retries,
                )
                futures[future] = batch
            for future in concurrent.futures.as_completed(futures):
                batch_resolved, diagnostics = future.result()
                if any(diagnostics.values()):
                    print(
                        "[catalog-guides] batch fallback diagnostics " + canonical_json(diagnostics),
                        file=sys.stderr,
                    )
                for item in batch_resolved:
                    write_artifact(artifacts_dir, item, rules, model)
                resolved.extend(batch_resolved)
        except KeyboardInterrupt:
            cancelled = cancel_pending_futures(futures)
            executor.shutdown(wait=False, cancel_futures=True)
            print(
                f"[catalog-guides] interrupted; cancelled_pending_batches={cancelled}",
                file=sys.stderr,
            )
            raise
        except BaseException:
            cancel_pending_futures(futures)
            executor.shutdown(wait=False, cancel_futures=True)
            raise
        else:
            executor.shutdown(wait=True)

    resolved.sort(key=lambda item: item.product.id)
    ensure_selected_coverage(selected, resolved, rules)
    return resolved


def validate_upsert_table(connection: sqlite3.Connection, table: str) -> None:
    if table != "product_catalog_content":
        raise CatalogGuideError("쓰기 대상은 product_catalog_content만 허용합니다.")
    rows = connection.execute(f"PRAGMA table_info({table})").fetchall()
    columns = {row[1] for row in rows}
    required = {
        "product_id",
        "summary",
        "routine_step",
        "usage_type",
        "usage_timing_json",
        "usage_tips_json",
        "observation_points_json",
        "origin",
        "generated_at",
    }
    if not rows or not required.issubset(columns):
        raise CatalogGuideError(
            f"{table} 테이블 계약이 준비되지 않았습니다. missing={sorted(required - columns)}"
        )


def upsert_guides(db_path: Path, resolved: Sequence[ResolvedGuide], table: str) -> None:
    connection = sqlite3.connect(db_path)
    try:
        connection.execute("PRAGMA foreign_keys = ON")
        validate_upsert_table(connection, table)
        sql = f"""
            INSERT INTO {table}(
                product_id, summary, routine_step, usage_type,
                usage_timing_json, usage_tips_json, observation_points_json,
                origin, generated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(product_id) DO UPDATE SET
                summary = excluded.summary,
                routine_step = excluded.routine_step,
                usage_type = excluded.usage_type,
                usage_timing_json = excluded.usage_timing_json,
                usage_tips_json = excluded.usage_tips_json,
                observation_points_json = excluded.observation_points_json,
                origin = excluded.origin,
                generated_at = excluded.generated_at
        """
        with connection:
            connection.executemany(
                sql,
                [
                    (
                        item.product.id,
                        item.guide["summary"],
                        item.guide["routineStep"],
                        item.guide["usageType"],
                        canonical_json(item.guide["usageTiming"]),
                        canonical_json(item.guide["usageInstructions"]),
                        canonical_json(item.guide["highlights"]),
                        item.guide["origin"],
                        item.guide["generatedAt"],
                    )
                    for item in resolved
                ],
            )
    finally:
        connection.close()


def parse_ids(value: Optional[str]) -> Optional[List[int]]:
    if not value:
        return None
    try:
        return [int(item.strip()) for item in value.split(",") if item.strip()]
    except ValueError as exc:
        raise argparse.ArgumentTypeError("--ids는 쉼표로 구분한 정수여야 합니다.") from exc


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--mode",
        choices=("dry-run", "generate", "upsert", "generate-upsert"),
        default="dry-run",
    )
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    parser.add_argument("--rules", type=Path, default=DEFAULT_RULES)
    parser.add_argument("--artifacts", type=Path, default=DEFAULT_ARTIFACTS)
    parser.add_argument("--env-file", type=Path, default=ROOT / ".env")
    parser.add_argument("--ids", type=parse_ids)
    parser.add_argument("--limit", type=int)
    parser.add_argument("--batch-size", type=int, default=15)
    parser.add_argument("--workers", type=int, default=2)
    parser.add_argument("--max-retries", type=int, default=3)
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--table", default="product_catalog_content")
    return parser


def run(args: argparse.Namespace) -> int:
    if args.limit is not None and args.limit <= 0:
        raise CatalogGuideError("--limit은 양수여야 합니다.")
    if not 10 <= args.batch_size <= 20:
        raise CatalogGuideError("--batch-size는 10~20이어야 합니다.")
    if not 1 <= args.workers <= 4:
        raise CatalogGuideError("--workers는 1~4이어야 합니다.")
    if not 0 <= args.max_retries <= 6:
        raise CatalogGuideError("--max-retries는 0~6이어야 합니다.")

    load_env_file(args.env_file)
    rules = load_rules(args.rules)
    products = load_products(args.db)
    try:
        report = validate_category_mapping(products, rules)
    except CatalogGuideError:
        # Even a failed mapping audit leaves a useful report when its structure can be computed.
        index, duplicates = family_index(rules)
        counts = Counter(product.category for product in products)
        report = {
            "checkedAt": utc_now(),
            "productCount": len(products),
            "databaseCategoryCount": len(counts),
            "mappedCategoryCount": len(index),
            "mappingComplete": False,
            "missingCategories": sorted(set(counts) - set(index)),
            "extraCategories": sorted(set(index) - set(counts)),
            "duplicateCategories": duplicates,
            "missingTextureProductIds": [product.id for product in products if not product.texture],
        }
        atomic_write_json(args.artifacts / "mapping-report.json", report)
        raise
    atomic_write_json(args.artifacts / "mapping-report.json", report)

    selected = select_products(products, args.ids, args.limit)
    model = os.environ.get("OPENAI_MODEL", "").strip() or "gpt-5.6-terra"
    api_key = os.environ.get("OPENAI_API_KEY", "").strip() or None
    resolved = generate_guides(
        selected=selected,
        rules=rules,
        artifacts_dir=args.artifacts,
        mode=args.mode,
        model=model,
        api_key=api_key,
        batch_size=args.batch_size,
        workers=args.workers,
        max_retries=args.max_retries,
        force=args.force,
    )
    if args.mode in {"upsert", "generate-upsert"}:
        upsert_guides(args.db, resolved, args.table)

    counts = Counter(item.source for item in resolved)
    coverage = f"{len(resolved)}/{len(selected)}"
    print(
        "[catalog-guides] "
        f"selected={len(selected)} ai={counts['AI']} editorial={counts['EDITORIAL']} "
        f"cached={counts['CACHED']} failed=0 coverage={coverage}"
    )
    return 0


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    try:
        return run(args)
    except CatalogGuideError as exc:
        print(f"[catalog-guides] ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
