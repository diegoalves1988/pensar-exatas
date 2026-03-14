import json
import re
import sys
from pathlib import Path

import fitz


def normalize_spaces(text: str) -> str:
    text = text.replace("\r", "\n")
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    return text.strip()


def parse_questions(text: str):
    pattern = re.compile(r"QUEST[AÃ]O\s+(\d{1,3})", re.IGNORECASE)
    matches = list(pattern.finditer(text))
    questions = []
    for i, m in enumerate(matches):
        qnum = int(m.group(1))
        start = m.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        block = text[start:end].strip()
        questions.append((qnum, block))
    return questions


def extract_choices(block: str):
    # Try common ENEM alternatives markers A) ... E)
    choice_pattern = re.compile(r"(?:^|\n)\s*([A-E])[\)\.\-]\s*(.*?)\s*(?=(?:\n\s*[A-E][\)\.\-]\s)|$)", re.DOTALL)
    found = choice_pattern.findall(block)
    if not found:
        return None
    by_letter = {letter: normalize_spaces(content) for letter, content in found}
    letters = ["A", "B", "C", "D", "E"]
    if not all(letter in by_letter for letter in letters):
        return None
    return [by_letter[letter] for letter in letters]


def remove_choices_from_block(block: str):
    # Keep statement up to first alternative marker
    m = re.search(r"\n\s*[A-E][\)\.\-]\s", block)
    if not m:
        return block
    return block[: m.start()].strip()


def main():
    if len(sys.argv) < 2:
        print("Usage: py scripts/extractQuestionsFromPdf.py <pdf_path> [out_json]")
        sys.exit(1)

    pdf_path = Path(sys.argv[1]).expanduser().resolve()
    out_path = Path(sys.argv[2]).resolve() if len(sys.argv) > 2 else Path("data/pdf-2025-extracted.json").resolve()

    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    doc = fitz.open(pdf_path)
    pages_text = []
    for page in doc:
        pages_text.append(page.get_text("text"))
    raw = "\n\n".join(pages_text)
    raw = normalize_spaces(raw)

    parsed = parse_questions(raw)
    items = []

    for qnum, block in parsed:
        statement_block = block
        choices = extract_choices(block)
        if choices:
            statement_block = remove_choices_from_block(block)

        statement_block = re.sub(r"^QUEST[AÃ]O\s+\d{1,3}\s*", "", statement_block, flags=re.IGNORECASE).strip()

        items.append(
            {
                "questionNumber": qnum,
                "title": f"Questão {qnum} - ENEM 2025",
                "statement": normalize_spaces(statement_block),
                "choices": choices or [],
            }
        )

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")

    print(json.dumps({"pdf": str(pdf_path), "output": str(out_path), "totalExtracted": len(items)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
