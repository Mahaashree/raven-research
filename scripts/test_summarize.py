"""Standalone test for the Groq summarization call.
Requires GROQ_API_KEY set in the environment.
Run: python -m scripts.test_summarize
"""

from app.summarize import summarize

SAMPLE_TEXT = """
Title: Attention Is All You Need

Abstract: The dominant sequence transduction models are based on complex recurrent or
convolutional neural networks that include an encoder and a decoder. We propose a new
simple network architecture, the Transformer, based solely on attention mechanisms,
dispensing with recurrence and convolutions entirely. Experiments on two machine
translation tasks show these models to be superior in quality while being more
parallelizable and requiring significantly less time to train.
"""

if __name__ == "__main__":
    result = summarize(SAMPLE_TEXT)
    print("summary:", result.summary)
    print("key_claims:", result.key_claims)
    print("method:", result.method)
