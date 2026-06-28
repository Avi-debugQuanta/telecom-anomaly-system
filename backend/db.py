# backend/db.py
"""
SQLite schema, initialization, and FAISS vector store for SOP retrieval.
"""
import os
import sqlite3
import pandas as pd
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
import json

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "telecom.db")
SOP_PATH = os.path.join(os.path.dirname(__file__), "data", "policy_sops.txt")
MODEL_NAME = "all-MiniLM-L6-v2"  # lightweight, good for short SOPs


def init_sqlite():
    """Create tables and ingest the processed CSV if not already present."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    
    # Check if table has data
    cur = conn.cursor()
    cur.execute("SELECT count(name) FROM sqlite_master WHERE type='table' AND name='customers'")
    if cur.fetchone()[0] == 0:
        processed_csv = os.path.join(os.path.dirname(__file__), "data", "telecom_processed.csv")
        if not os.path.exists(processed_csv):
            raise FileNotFoundError(
                f"Processed CSV not found at {processed_csv}. Run pipeline.py first."
            )
        df = pd.read_csv(processed_csv)
        df.to_sql("customers", conn, if_exists="replace", index=False)
        print(f"[INFO] Ingested {len(df)} rows into SQLite and created customers table.")
    
    # Create tickets table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS tickets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id TEXT,
            issue TEXT,
            ticket_md TEXT,
            status TEXT DEFAULT 'Open',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()


def get_connection():
    return sqlite3.connect(DB_PATH)


# ----------------------------------------------------------------------
# FAISS SOP index
# ----------------------------------------------------------------------
def build_sop_index():
    """Read policy_sops.txt, embed each SOP, and store in FAISS."""
    with open(SOP_PATH, "r", encoding="utf-8") as f:
        raw = f.read()

    # Split by double newline or lines starting with SOP-
    sop_blocks = [blk.strip() for blk in raw.split("\n\n") if blk.strip()]
    if not sop_blocks:
        # fallback: treat each line as an SOP
        sop_blocks = [line.strip() for line in raw.splitlines() if line.strip()]

    model = SentenceTransformer(MODEL_NAME)
    embeddings = model.encode(sop_blocks, normalize_embeddings=True)

    dim = embeddings.shape[1]
    index = faiss.IndexFlatIP(dim)  # inner product = cosine (since normalized)
    index.add(np.array(embeddings, dtype="float32"))

    # Persist index + metadata
    faiss.write_index(index, os.path.join(os.path.dirname(__file__), "data", "sop_faiss.index"))
    with open(os.path.join(os.path.dirname(__file__), "data", "sop_metadata.json"), "w", encoding="utf-8") as f:
        json.dump(sop_blocks, f, ensure_ascii=False, indent=2)

    print(f"[INFO] FAISS SOP index built with {len(sop_blocks)} entries.")
    return index, sop_blocks


def load_sop_index():
    index_path = os.path.join(os.path.dirname(__file__), "data", "sop_faiss.index")
    meta_path = os.path.join(os.path.dirname(__file__), "data", "sop_metadata.json")
    if not (os.path.exists(index_path) and os.path.exists(meta_path)):
        return build_sop_index()
    index = faiss.read_index(index_path)
    with open(meta_path, "r", encoding="utf-8") as f:
        sop_blocks = json.load(f)
    return index, sop_blocks


def search_sops(query: str, top_k: int = 3):
    """Return top‑k SOP strings relevant to the query."""
    index, sop_blocks = load_sop_index()
    model = SentenceTransformer(MODEL_NAME)
    q_emb = model.encode([query], normalize_embeddings=True)
    D, I = index.search(np.array(q_emb, dtype="float32"), top_k)
    results = [sop_blocks[i] for i in I[0] if i < len(sop_blocks)]
    return results


if __name__ == "__main__":
    init_sqlite()
    build_sop_index()
