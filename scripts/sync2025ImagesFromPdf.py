import json
import os
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional

import fitz  # pymupdf


QUESTION_REGEX = re.compile(r"QUEST[AÃ]O\s+(\d{1,3})", re.IGNORECASE)


def extract_question_images(pdf_path: Path) -> Dict[int, List[bytes]]:
    doc = fitz.open(pdf_path)
    by_question: Dict[int, List[bytes]] = {}

    carry_question: Optional[int] = None

    for page_index in range(len(doc)):
        page = doc[page_index]
        data = page.get_text("dict")
        blocks = data.get("blocks", [])

        markers = []
        images = []

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
                # Ignore tiny decorative images/logos
                width = float(block.get("width") or 0)
                height = float(block.get("height") or 0)
                if width * height < 15000:
                    continue
                image_bytes = block.get("image")
                if image_bytes:
                    images.append((y0, image_bytes))

        events = [(y, "q", qnum) for y, qnum in markers] + [(y, "img", img) for y, img in images]
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


def db_query_json(sql: str) -> List[dict]:
    # Use PostgREST SQL endpoint via service role key is not available;
    # fallback to local node helper by invoking `pnpm tsx` would be costly.
    # Instead, use pg connection string through psycopg-like unavailable libs.
    # We will call a small node inline script and parse JSON output.
    import subprocess

    js = (
        "require('dotenv').config();"
        "const postgres=require('postgres');"
        "const raw=process.env.DATABASE_URL||'';"
        "const url=raw.includes('sslmode=')?raw:(raw.includes('?')?raw+'&sslmode=require':raw+'?sslmode=require');"
        "const db=postgres(url,{max:1,prepare:false});"
        "(async()=>{"
        f"const rows=await db.unsafe({json.dumps(sql)});"
        "console.log(JSON.stringify(rows));"
        "await db.end({timeout:1});"
        "})().catch(async e=>{console.error(e); try{await db.end({timeout:1});}catch{} process.exit(1);});"
    )

    cmd = ["node", "-e", js]
    proc = subprocess.run(cmd, capture_output=True)
    if proc.returncode != 0:
        stderr = (proc.stderr or b"").decode("utf-8", errors="ignore")
        stdout = (proc.stdout or b"").decode("utf-8", errors="ignore")
        raise RuntimeError(f"DB query failed: {stderr or stdout}")
    out = (proc.stdout or b"").decode("utf-8", errors="ignore").strip()
    if not out:
        return []

    # Handle extra log lines (e.g. dotenv tips) before JSON payload.
    start_idx = -1
    for i, ch in enumerate(out):
        if ch in "[{":
            start_idx = i
            break
    if start_idx == -1:
        raise RuntimeError(f"Could not find JSON payload in output: {out}")

    payload = out[start_idx:]
    return json.loads(payload)


def db_exec(sql: str) -> None:
    import subprocess

    js = (
        "require('dotenv').config();"
        "const postgres=require('postgres');"
        "const raw=process.env.DATABASE_URL||'';"
        "const url=raw.includes('sslmode=')?raw:(raw.includes('?')?raw+'&sslmode=require':raw+'?sslmode=require');"
        "const db=postgres(url,{max:1,prepare:false});"
        "(async()=>{"
        f"await db.unsafe({json.dumps(sql)});"
        "await db.end({timeout:1});"
        "})().catch(async e=>{console.error(e); try{await db.end({timeout:1});}catch{} process.exit(1);});"
    )

    proc = subprocess.run(["node", "-e", js], capture_output=True)
    if proc.returncode != 0:
        stderr = (proc.stderr or b"").decode("utf-8", errors="ignore")
        stdout = (proc.stdout or b"").decode("utf-8", errors="ignore")
        raise RuntimeError(f"DB exec failed: {stderr or stdout}")


def main():
    if len(sys.argv) < 2:
        print("Usage: py scripts/sync2025ImagesFromPdf.py <pdf_path>")
        sys.exit(1)

    pdf_path = Path(sys.argv[1]).expanduser().resolve()
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    images_by_question = extract_question_images(pdf_path)
    public_dir = Path("client/public/questions/2025").resolve()
    public_dir.mkdir(parents=True, exist_ok=True)

    # Load 2025 questions and map question number -> db rows
    rows = db_query_json(
        """
        SELECT id, title, "imageUrl"
        FROM questions
        WHERE year = 2025
        ORDER BY id ASC
        """
    )

    number_to_ids: Dict[int, List[int]] = {}
    for row in rows:
        title = str(row.get("title") or "")
        m = re.search(r"Quest[aã]o\s+(\d+)", title, flags=re.IGNORECASE)
        if not m:
            continue
        qnum = int(m.group(1))
        number_to_ids.setdefault(qnum, []).append(int(row["id"]))

    written_files = 0
    updated = 0
    touched_questions = 0

    for qnum, image_list in sorted(images_by_question.items()):
        if qnum not in number_to_ids:
            continue
        if not image_list:
            continue

        # Use first relevant image as primary question imageUrl
        primary = image_list[0]
        name = f"q{qnum}.png"
        local_path = public_dir / name
        local_path.write_bytes(primary)
        public_url = f"/questions/2025/{name}"
        written_files += 1

        for qid in number_to_ids[qnum]:
            db_exec(
                f"UPDATE questions SET \"imageUrl\" = '{public_url.replace("'", "''")}', \"updatedAt\" = NOW() WHERE id = {qid}"
            )
            updated += 1

        touched_questions += 1

    print(
        json.dumps(
            {
                "pdf": str(pdf_path),
                "dbQuestions2025": len(rows),
                "questionNumbersWithExtractedImages": len(images_by_question),
                "questionNumbersUpdated": touched_questions,
                    "imagesWritten": written_files,
                "rowsUpdated": updated,
                    "publicImagesDir": str(public_dir),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
