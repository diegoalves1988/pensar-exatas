import json
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import fitz

QUESTION_REGEX = re.compile(r"QUEST[AÃ]O\s+(\d{1,3})", re.IGNORECASE)
DEFAULT_QUESTION_NUMBERS = [97, 104, 113, 118, 147, 151, 155, 159, 163, 168, 174, 177]


def parse_target_numbers(raw: Optional[str]) -> List[int]:
    if not raw:
        return DEFAULT_QUESTION_NUMBERS
    parts = [p.strip() for p in raw.split(",") if p.strip()]
    out: List[int] = []
    for p in parts:
        try:
            out.append(int(p))
        except ValueError:
            continue
    return sorted(set(out)) or DEFAULT_QUESTION_NUMBERS


def collect_question_markers(doc: fitz.Document) -> Dict[int, Tuple[int, float]]:
    markers: Dict[int, Tuple[int, float]] = {}
    for page_index in range(len(doc)):
        page = doc[page_index]
        data = page.get_text("dict")
        blocks = data.get("blocks", [])
        for block in blocks:
            if block.get("type") != 0:
                continue
            bbox = block.get("bbox") or [0, 0, 0, 0]
            y0 = float(bbox[1])
            text_parts: List[str] = []
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    text_parts.append(span.get("text", ""))
            text = " ".join(text_parts)
            for m in QUESTION_REGEX.finditer(text):
                qnum = int(m.group(1))
                if qnum not in markers:
                    markers[qnum] = (page_index, y0)
    return markers


def next_marker_y_same_page(markers: Dict[int, Tuple[int, float]], page_index: int, y0: float) -> Optional[float]:
    candidates = [y for (p, y) in markers.values() if p == page_index and y > y0]
    if not candidates:
        return None
    return min(candidates)


def build_crop_rect(page: fitz.Page, y0: float, next_y: Optional[float]) -> fitz.Rect:
    page_rect = page.rect
    left = 20
    right = max(left + 100, page_rect.width - 20)

    top = min(max(0, y0 + 20), max(0, page_rect.height - 120))
    if next_y is None:
        bottom = min(page_rect.height - 20, top + 900)
    else:
        bottom = min(page_rect.height - 20, next_y - 15)
        if bottom - top < 180:
            bottom = min(page_rect.height - 20, top + 500)

    if bottom <= top:
        bottom = min(page_rect.height - 20, top + 300)

    return fitz.Rect(left, top, right, bottom)


def main() -> None:
    if len(sys.argv) < 2:
        print(
            "Usage: py scripts/extractMissing2025ImagesFromPdf.py <pdf_path> [out_manifest] [question_numbers_csv]"
        )
        sys.exit(1)

    pdf_path = Path(sys.argv[1]).expanduser().resolve()
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    out_manifest = (
        Path(sys.argv[2]).resolve()
        if len(sys.argv) > 2
        else Path("data/pdf-2025-images-manifest-fallback.json").resolve()
    )
    targets = parse_target_numbers(sys.argv[3] if len(sys.argv) > 3 else None)

    out_dir = Path("client/public/questions/2025").resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    doc = fitz.open(pdf_path)
    markers = collect_question_markers(doc)

    manifest: List[dict] = []
    generated: List[int] = []
    missing: List[int] = []

    matrix = fitz.Matrix(2.0, 2.0)

    for qnum in targets:
        marker = markers.get(qnum)
        if not marker:
            missing.append(qnum)
            continue

        page_index, y0 = marker
        page = doc[page_index]
        ny = next_marker_y_same_page(markers, page_index, y0)
        rect = build_crop_rect(page, y0, ny)

        pix = page.get_pixmap(matrix=matrix, clip=rect, alpha=False)
        file_name = f"q{qnum}.png"
        target = out_dir / file_name
        pix.save(target)

        manifest.append(
            {
                "questionNumber": qnum,
                "imageUrl": f"/questions/2025/{file_name}",
                "localPath": str(target),
                "source": "fallback-crop",
            }
        )
        generated.append(qnum)

    out_manifest.parent.mkdir(parents=True, exist_ok=True)
    out_manifest.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    print(
        json.dumps(
            {
                "pdf": str(pdf_path),
                "targets": targets,
                "generatedCount": len(generated),
                "generatedQuestions": generated,
                "missingCount": len(missing),
                "missingQuestions": missing,
                "manifest": str(out_manifest),
                "imagesDir": str(out_dir),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
