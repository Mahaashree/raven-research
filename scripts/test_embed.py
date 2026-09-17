"""Standalone test for the local embedding function. Run: python -m scripts.test_embed"""

from app.embed import embed

if __name__ == "__main__":
    vec = embed("Transformers use self-attention instead of recurrence.")
    print(f"dim={len(vec)}")
    print(vec[:5], "...")
