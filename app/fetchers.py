import re
import tempfile
from dataclasses import dataclass

import arxiv
import fitz  # pymupdf
import httpx
import trafilatura

ARXIV_ID_RE = re.compile(r"(\d{4}\.\d{4,5}(v\d+)?)")


@dataclass
class FetchResult:
    text: str
    item_type: str  # "paper" | "article" | "blog"
    title: str | None = None

    def __post_init__(self):
        # Postgres text columns reject NUL bytes, which pymupdf occasionally
        # emits for malformed PDF fonts/glyphs.
        self.text = self.text.replace("\x00", "")
        if self.title:
            self.title = self.title.replace("\x00", "").strip() or None


def extract_arxiv_id(url_or_id: str) -> str | None:
    match = ARXIV_ID_RE.search(url_or_id)
    if match and ("arxiv.org" in url_or_id or url_or_id.strip() == match.group(1)):
        return match.group(1)
    return None


def fetch_arxiv(arxiv_id: str) -> FetchResult:
    search = arxiv.Search(id_list=[arxiv_id])
    result = next(search.results())

    with tempfile.TemporaryDirectory() as tmpdir:
        pdf_path = result.download_pdf(dirpath=tmpdir)
        doc = fitz.open(pdf_path)
        body_text = "\n".join(page.get_text() for page in doc)
        doc.close()

    header = f"Title: {result.title}\n\nAbstract: {result.summary}\n\n"
    return FetchResult(text=header + body_text, item_type="paper", title=result.title)


def fetch_pdf(url: str) -> FetchResult:
    resp = httpx.get(url, follow_redirects=True, timeout=30.0)
    resp.raise_for_status()
    doc = fitz.open(stream=resp.content, filetype="pdf")
    text = "\n".join(page.get_text() for page in doc)
    title = (doc.metadata or {}).get("title") or None
    doc.close()
    if not text.strip():
        raise ValueError("PDF contained no extractable text")
    return FetchResult(text=text, item_type="paper", title=title)


def fetch_html(url: str) -> FetchResult:
    downloaded = trafilatura.fetch_url(url)
    if downloaded is None:
        raise ValueError(f"Could not download URL: {url}")
    text = trafilatura.extract(downloaded)
    if not text or not text.strip():
        raise ValueError(f"Could not extract readable content from: {url}")
    metadata = trafilatura.extract_metadata(downloaded)
    title = metadata.title if metadata else None
    return FetchResult(text=text, item_type="article", title=title)


def is_pdf_url(url: str) -> bool:
    if url.lower().endswith(".pdf"):
        return True
    try:
        resp = httpx.head(url, follow_redirects=True, timeout=10.0)
        content_type = resp.headers.get("content-type", "")
        return "application/pdf" in content_type
    except httpx.HTTPError:
        return False


def fetch(url: str) -> FetchResult:
    arxiv_id = extract_arxiv_id(url)
    if arxiv_id:
        return fetch_arxiv(arxiv_id)
    if is_pdf_url(url):
        return fetch_pdf(url)
    return fetch_html(url)
