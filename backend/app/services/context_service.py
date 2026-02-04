import tiktoken

from app.services.pdf_service import get_full_text

_text_cache: dict[str, str] = {}

TOKEN_THRESHOLD = 30_000


def count_tokens(text: str) -> int:
    enc = tiktoken.encoding_for_model("gpt-4o")
    return len(enc.encode(text))


def get_paper_text(pdf_path: str) -> str:
    if pdf_path not in _text_cache:
        _text_cache[pdf_path] = get_full_text(pdf_path)
    return _text_cache[pdf_path]


def prepare_paper_context(pdf_path: str, question: str | None = None) -> str:
    full_text = get_paper_text(pdf_path)
    token_count = count_tokens(full_text)

    if token_count < TOKEN_THRESHOLD:
        return full_text

    return _retrieve_relevant_chunks(full_text, question or "", top_k=15)


def _retrieve_relevant_chunks(text: str, query: str, top_k: int = 15) -> str:
    chunks = _split_into_chunks(text, chunk_size=1000)
    if not query:
        return "\n\n".join(chunks[:top_k])

    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity

    corpus = chunks + [query]
    vectorizer = TfidfVectorizer(stop_words="english")
    tfidf_matrix = vectorizer.fit_transform(corpus)

    query_vec = tfidf_matrix[-1]
    chunk_vecs = tfidf_matrix[:-1]
    similarities = cosine_similarity(query_vec, chunk_vecs).flatten()

    top_indices = similarities.argsort()[-top_k:][::-1]
    top_indices = sorted(top_indices)

    return "\n\n".join(chunks[i] for i in top_indices)


def _split_into_chunks(text: str, chunk_size: int = 1000) -> list[str]:
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size):
        chunk = " ".join(words[i : i + chunk_size])
        if chunk.strip():
            chunks.append(chunk)
    return chunks


MATH_FORMATTING_INSTRUCTIONS = """
When writing mathematical expressions:
- Use $...$ for inline math (e.g. $E = mc^2$, $\\alpha + \\beta$)
- Use $$...$$ for display/block equations
- Always use LaTeX notation for formulas, Greek letters, subscripts, superscripts, fractions, etc.
- Write equations clearly using proper LaTeX commands (\\frac, \\sqrt, \\int, \\sum, \\partial, etc.)
- Never write raw math symbols like "sigma" — always use LaTeX notation instead.
Use markdown formatting for everything else."""

_PAPER_TEMPLATE = (
    "You are an expert research paper assistant. Below is the content of a research paper.\n"
    "Answer questions about it accurately and cite specific sections when possible.\n"
    "Be concise but thorough.\n"
    + MATH_FORMATTING_INSTRUCTIONS
    + "\n\n--- PAPER CONTENT ---\n{paper_text}\n--- END PAPER CONTENT ---"
)

_ASK_TEMPLATE = (
    "You are an expert research paper assistant.\n"
    "The user has selected a specific passage from a research paper and wants you to explain it.\n"
    "Provide a clear, helpful explanation. If the passage contains technical terms, define them.\n"
    "Use the surrounding paper context to give accurate explanations.\n"
    + MATH_FORMATTING_INSTRUCTIONS
    + "\n\n--- PAPER CONTEXT (surrounding pages) ---\n{paper_text}\n--- END PAPER CONTEXT ---"
)


def build_paper_prompt(paper_text: str) -> str:
    return _PAPER_TEMPLATE.replace("{paper_text}", paper_text)


def build_ask_prompt(paper_text: str) -> str:
    return _ASK_TEMPLATE.replace("{paper_text}", paper_text)
