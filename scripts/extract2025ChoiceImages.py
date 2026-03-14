"""
Extract per-alternative images from the ENEM 2025 PDF for questions
whose choices are images (circuits, graphs, etc.).

Usage:
    py scripts/extract2025ChoiceImages.py "path/to/2025_PV_impresso_D2_CD5.pdf"

Outputs individual choice images to client/public/questions/2025/q{num}-{a-e}.png
and a JSON manifest to data/choice-images-manifest.json
"""

import json
import re
import sys
from pathlib import Path

import fitz  # PyMuPDF

# Questions whose alternatives are images
TARGETS = {
    101: {"page": 3},   # 0-indexed
    103: {"page": 4},
    113: {"page": 8},
    125: {"page": 11},
    144: {"page": 17},
    167: {"page": 26},
}

OUT_DIR = Path("client/public/questions/2025")
MANIFEST_PATH = Path("data/choice-images-manifest.json")
LETTERS = ["A", "B", "C", "D", "E"]
DPI = 200  # Higher DPI for readability


def find_choice_regions(page, qnum):
    """
    Find the Y coordinates of each choice marker (A, B, C, D, E) on the page.
    Returns list of (letter, y_top, y_bottom) tuples.
    """
    text_dict = page.get_text("dict")
    blocks = text_dict["blocks"]

    # Collect all text spans with their coordinates
    spans = []
    for block in blocks:
        if "lines" not in block:
            continue
        for line in block["lines"]:
            for span in line["spans"]:
                spans.append({
                    "text": span["text"].strip(),
                    "bbox": span["bbox"],  # (x0, y0, x1, y1)
                    "size": span["size"],
                })

    # Find the question header to know where to start looking
    q_header_y = 0
    for s in spans:
        if re.match(rf"QUEST[ÃA]O\s+{qnum}\b", s["text"], re.IGNORECASE):
            q_header_y = s["bbox"][1]
            break

    # Find choice markers: single letter A-E at the left margin
    choice_markers = []
    page_width = page.rect.width
    for s in spans:
        txt = s["text"].strip()
        if txt in LETTERS and s["bbox"][0] < page_width * 0.15 and s["bbox"][1] > q_header_y:
            choice_markers.append({
                "letter": txt,
                "y": s["bbox"][1],
                "x": s["bbox"][0],
                "bbox": s["bbox"],
            })

    # Sort by Y coordinate (top to bottom)
    choice_markers.sort(key=lambda m: m["y"])

    # Deduplicate: keep only the first occurrence of each letter in order
    seen = set()
    unique_markers = []
    for m in choice_markers:
        if m["letter"] not in seen:
            seen.add(m["letter"])
            unique_markers.append(m)

    if len(unique_markers) != 5:
        print(f"  WARNING Q{qnum}: Found {len(unique_markers)} choice markers: "
              f"{[m['letter'] for m in unique_markers]}")

    return unique_markers


def extract_choice_images(doc, page_idx, qnum):
    """Extract individual choice images from a PDF page."""
    page = doc[page_idx]
    markers = find_choice_regions(page, qnum)

    if len(markers) < 5:
        # Try to also check the next page
        print(f"  Q{qnum}: Only {len(markers)} markers on page {page_idx}, checking next page...")
        if page_idx + 1 < len(doc):
            next_page = doc[page_idx + 1]
            next_markers = find_choice_regions(next_page, qnum)
            # Add missing letters from next page
            existing_letters = {m["letter"] for m in markers}
            for nm in next_markers:
                if nm["letter"] not in existing_letters:
                    nm["page"] = page_idx + 1
                    markers.append(nm)
            markers.sort(key=lambda m: (m.get("page", page_idx), m["y"]))

    if len(markers) < 2:
        print(f"  ERROR Q{qnum}: Cannot find enough choice markers ({len(markers)} found)")
        return []

    results = []
    page_rect = page.rect
    left_margin = 30  # Pixels from left edge

    for i, marker in enumerate(markers):
        current_page_idx = marker.get("page", page_idx)
        current_page = doc[current_page_idx]
        current_rect = current_page.rect

        y_top = marker["y"] - 5  # Small padding above

        if i + 1 < len(markers):
            next_marker = markers[i + 1]
            next_page_idx = next_marker.get("page", page_idx)
            if next_page_idx == current_page_idx:
                y_bottom = next_marker["y"] - 2
            else:
                # Choice extends to bottom of current page
                y_bottom = current_rect.height - 40
        else:
            # Last choice: extend to next question header or page bottom
            # Look for "QUESTÃO" text below or page footer
            text_dict = current_page.get_text("dict")
            y_bottom = current_rect.height - 60  # Default: page bottom minus margin
            for block in text_dict["blocks"]:
                if "lines" not in block:
                    continue
                for line in block["lines"]:
                    for span in line["spans"]:
                        txt = span["text"].strip()
                        # Stop at next question or footer markers
                        if (re.match(r"QUEST[ÃA]O\s+\d+", txt, re.IGNORECASE)
                                and span["bbox"][1] > marker["y"] + 20):
                            y_bottom = min(y_bottom, span["bbox"][1] - 10)
                        if "ENEM2025" in txt and span["bbox"][1] > marker["y"]:
                            y_bottom = min(y_bottom, span["bbox"][1] - 10)

        # Crop rectangle: full width of the question area
        clip = fitz.Rect(left_margin, y_top, current_rect.width - 30, y_bottom)

        # Render at high DPI
        mat = fitz.Matrix(DPI / 72, DPI / 72)
        pix = current_page.get_pixmap(matrix=mat, clip=clip)

        letter = marker["letter"].lower()
        filename = f"q{qnum}-{letter}.png"
        filepath = OUT_DIR / filename
        pix.save(str(filepath))

        results.append({
            "questionNumber": qnum,
            "letter": marker["letter"],
            "file": filename,
            "path": f"/questions/2025/{filename}",
        })
        print(f"  ✅ Q{qnum} {marker['letter']}: {filepath} ({pix.width}x{pix.height})")

    return results


def main():
    if len(sys.argv) < 2:
        print("Usage: py scripts/extract2025ChoiceImages.py <pdf_path>")
        sys.exit(1)

    pdf_path = Path(sys.argv[1]).expanduser().resolve()
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    doc = fitz.open(pdf_path)
    manifest = []

    for qnum, info in sorted(TARGETS.items()):
        print(f"\n--- Extracting Q{qnum} from page {info['page']} ---")
        results = extract_choice_images(doc, info["page"], qnum)
        manifest.extend(results)

    doc.close()

    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"\n{'='*50}")
    print(f"Total extracted: {len(manifest)} choice images")
    print(f"Manifest: {MANIFEST_PATH}")


if __name__ == "__main__":
    main()
