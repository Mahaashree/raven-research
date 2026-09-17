"""End-to-end demo against a running API (docker-compose up).
Run: python -m scripts.test_api
"""

import time

import requests

BASE_URL = "http://localhost:8000"

SEED_URLS = [
    "https://arxiv.org/abs/1706.03762",
    "https://arxiv.org/abs/2005.11401",
    "https://en.wikipedia.org/wiki/Retrieval-augmented_generation",
    "https://en.wikipedia.org/wiki/Large_language_model",
    "https://en.wikipedia.org/wiki/Vector_database",
]


def wait_for_item(item_id: str, timeout: int = 120) -> dict:
    start = time.time()
    while time.time() - start < timeout:
        resp = requests.get(f"{BASE_URL}/items/{item_id}")
        resp.raise_for_status()
        item = resp.json()
        if item["status"] in ("processed", "failed"):
            return item
        time.sleep(2)
    raise TimeoutError(f"Item {item_id} did not finish processing in {timeout}s")


def main():
    item_ids = []
    for url in SEED_URLS:
        resp = requests.post(f"{BASE_URL}/items", json={"url": url})
        resp.raise_for_status()
        item = resp.json()
        print(f"queued {url} -> {item['id']}")
        item_ids.append(item["id"])

    for item_id in item_ids:
        item = wait_for_item(item_id)
        print(f"\n{item_id}: status={item['status']}")
        if item["status"] == "processed":
            print(f"  summary: {item['summary_text'][:200]}")
        else:
            print(f"  error: {item['error_message']}")

    print("\n--- search: 'attention mechanism transformers' ---")
    resp = requests.get(f"{BASE_URL}/search", params={"q": "attention mechanism transformers"})
    resp.raise_for_status()
    for r in resp.json()["results"]:
        print(f"  [{r['similarity']:.3f}] {r['url']}")
        print(f"    {r['summary_text'][:150]}")


if __name__ == "__main__":
    main()
