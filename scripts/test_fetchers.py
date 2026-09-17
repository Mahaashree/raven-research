"""Standalone test for the fetcher functions. Run: python -m scripts.test_fetchers"""

from app.fetchers import fetch

TEST_URLS = [
    "https://arxiv.org/abs/1706.03762",  # arXiv paper (Attention Is All You Need)
    "https://en.wikipedia.org/wiki/Retrieval-augmented_generation",  # HTML article
]

if __name__ == "__main__":
    for url in TEST_URLS:
        print(f"\n--- {url} ---")
        result = fetch(url)
        print(f"type={result.item_type} len={len(result.text)}")
        print(result.text[:300])
