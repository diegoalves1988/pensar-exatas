import json
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import fitz

QUESTION_REGEX = re.compile(r"QUEST[AÃ]O\s+(\d{1,3})", re.IGNORECASE)


def extract_question_images(pdf_path: Path) -> Dict[int, List[Tuple[float, bytes]]]:
    doc = fitz.open(pdf_path)
    by_question: Dict[int, List[Tuple[float, bytes]]] = {}

    carry_question: Optional[int] = None

    for page_index in range(len(doc)):
        page = doc[page_index]
        data = page.get_text("dict")
        blocks = data.get("blocks", [])

        markers: List[Tuple[float, int]] = []
        images: List[Tuple[float, float, bytes]] = []

        for block in blocks:
            btype = block.get("type")
            bbox = block.get("bbox") or [0, 0, 0, 0]
            y0 = float(bbox[1])

            if btype == 0:
                text_parts = []
                for line in block.get("lines", []):
                    for span in line.get("spans", []):
                        text_parts.append(span.get("text", ""))
                text = " ".join(text_parts)
                for m in QUESTION_REGEX.finditer(text):
                    markers.append((y0, int(m.group(1))))
            elif btype == 1:
                width = float(block.get("width") or 0)
                height = float(block.get("height") or 0)
                # Ignore tiny decorative images/watermarks
                area = width * height
                if area < 4000:
                    continue
                image_bytes = block.get("image")
                if image_bytes:
                    images.append((y0, area, image_bytes))

        events = [(y, "q", qnum) for y, qnum in markers] + [
            (y, "img", (area, img)) for y, area, img in images
        ]
        events.sort(key=lambda x: x[0])

        active = carry_question
        for _y, etype, payload in events:
            if etype == "q":
                active = int(payload)
            else:
                if active is None:
                    continue
                by_question.setdefault(active, []).append(payload)

        carry_question = active

    return by_question


def main():
    if len(sys.argv) < 2:
        print("Usage: py scripts/extract2025ImagesFromPdf.py <pdf_path> [output_manifest]")
        sys.exit(1)

    pdf_path = Path(sys.argv[1]).expanduser().resolve()
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    out_manifest = (
        Path(sys.argv[2]).resolve()
        if len(sys.argv) > 2
        else Path("data/pdf-2025-images-manifest.json").resolve()
    )

    out_dir = Path("client/public/questions/2025").resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    by_question = extract_question_images(pdf_path)

    manifest = []
    written = 0

    for qnum in sorted(by_question.keys()):
        imgs = by_question[qnum]
        if not imgs:
            continue
        # Keep the largest image detected for the question as primary.
        imgs.sort(key=lambda x: x[0], reverse=True)
        selected = imgs[0][1]
        file_name = f"q{qnum}.png"
        target = out_dir / file_name
        target.write_bytes(selected)
        written += 1

        manifest.append(
            {
                "questionNumber": qnum,
                "imageUrl": f"/questions/2025/{file_name}",
                "localPath": str(target),
            }
        )

    out_manifest.parent.mkdir(parents=True, exist_ok=True)
    out_manifest.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    print(
        json.dumps(
            {
                "pdf": str(pdf_path),
                "questionsWithExtractedImage": len(manifest),
                "imagesWritten": written,
                "manifest": str(out_manifest),
                "imagesDir": str(out_dir),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
