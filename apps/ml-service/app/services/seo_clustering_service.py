"""Domain 02 SEO topic clustering (spec section 47/57).

Real unsupervised clustering over currently-published CMS/resource/help
content: TF-IDF vectorisation + KMeans (scikit-learn). Deliberately simple —
the dataset is small (a few dozen documents at most today), so a heavier
embedding model or HDBSCAN would be overfitting the current data volume.
Recompute periodically as content grows; this module is versioned
(MODEL_VERSION) so a future switch to sentence embeddings is a version bump,
not a breaking change for consumers of content_topic_clusters.

Never runs unsupervised over private/unpublished content, and never
auto-publishes results anywhere — callers are responsible for editorial
review before acting on cluster labels (spec: "Do not automatically alter
public content without editorial approval").
"""

import hashlib
from datetime import datetime, timezone

from sklearn.cluster import KMeans
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import silhouette_score
from sqlalchemy import text

MODEL_NAME = "seo_topic_clusterer"
MODEL_VERSION = "v0-tfidf-kmeans"
EMBEDDING_MODEL = "tfidf-english-1gram-2gram"
CLUSTER_VERSION = 1


def _content_hash(text_value: str) -> str:
    return hashlib.sha256(text_value.encode("utf-8")).hexdigest()[:16]


def _fetch_documents(db):
    """Only ever pulls PUBLISHED content — never drafts/unpublished rows."""
    resources = db.execute(
        text(
            "SELECT id, title, summary, body FROM resource_articles WHERE status = 'published'"
        )
    ).fetchall()
    help_articles = db.execute(
        text("SELECT id, title, summary, body FROM help_articles WHERE status = 'published'")
    ).fetchall()

    docs = []
    for row in resources:
        docs.append(
            {
                "content_type": "resource_article",
                "content_id": str(row.id),
                "text": f"{row.title}. {row.summary or ''} {row.body or ''}",
            }
        )
    for row in help_articles:
        docs.append(
            {
                "content_type": "help_article",
                "content_id": str(row.id),
                "text": f"{row.title}. {row.summary or ''} {row.body or ''}",
            }
        )
    return docs


def run_clustering(db, num_clusters: int | None = None) -> dict:
    """Runs TF-IDF + KMeans over published content and upserts cluster
    assignments into content_topic_clusters. Returns a metrics summary —
    caller decides whether/how to surface it (e.g. an admin/editor tool),
    per spec: results require editorial review, not auto-publication."""

    docs = _fetch_documents(db)
    if len(docs) < 4:
        return {
            "status": "skipped",
            "reason": "insufficient_documents",
            "document_count": len(docs),
        }

    texts = [d["text"] for d in docs]
    vectorizer = TfidfVectorizer(max_features=500, stop_words="english", ngram_range=(1, 2))
    matrix = vectorizer.fit_transform(texts)

    # Heuristic cluster count: roughly one cluster per ~4 documents, bounded
    # to a sane range — this is a rule, not a tuned hyperparameter, because
    # there isn't enough data yet to validate a chosen k against ground truth.
    k = num_clusters or max(2, min(8, len(docs) // 4))
    k = min(k, len(docs) - 1)

    model = KMeans(n_clusters=k, random_state=42, n_init=10)
    labels = model.fit_predict(matrix)

    try:
        silhouette = float(silhouette_score(matrix, labels)) if k > 1 else None
    except ValueError:
        silhouette = None

    feature_names = vectorizer.get_feature_names_out()
    cluster_top_terms: dict[int, list[str]] = {}
    for cluster_id in range(k):
        centroid = model.cluster_centers_[cluster_id]
        top_indices = centroid.argsort()[-5:][::-1]
        cluster_top_terms[cluster_id] = [feature_names[i] for i in top_indices]

    now = datetime.now(timezone.utc)
    upserts = 0
    for doc, label in zip(docs, labels):
        content_hash = _content_hash(doc["text"])
        generated_label = ", ".join(cluster_top_terms[int(label)][:3])
        db.execute(
            text(
                """
                INSERT INTO content_topic_clusters
                    (id, content_type, content_id, content_hash, cluster_id, generated_label,
                     confidence, model_name, model_version, embedding_model, cluster_version,
                     created_at, updated_at)
                VALUES
                    (gen_random_uuid(), :content_type, :content_id, :content_hash, :cluster_id, :generated_label,
                     :confidence, :model_name, :model_version, :embedding_model, :cluster_version,
                     :now, :now)
                ON CONFLICT (content_type, content_id, cluster_version)
                DO UPDATE SET
                    content_hash = EXCLUDED.content_hash,
                    cluster_id = EXCLUDED.cluster_id,
                    generated_label = EXCLUDED.generated_label,
                    confidence = EXCLUDED.confidence,
                    updated_at = EXCLUDED.updated_at
                """
            ),
            {
                "content_type": doc["content_type"],
                "content_id": doc["content_id"],
                "content_hash": content_hash,
                "cluster_id": int(label),
                "generated_label": generated_label,
                "confidence": silhouette,
                "model_name": MODEL_NAME,
                "model_version": MODEL_VERSION,
                "embedding_model": EMBEDDING_MODEL,
                "cluster_version": CLUSTER_VERSION,
                "now": now,
            },
        )
        upserts += 1
    db.commit()

    return {
        "status": "completed",
        "model_name": MODEL_NAME,
        "model_version": MODEL_VERSION,
        "cluster_version": CLUSTER_VERSION,
        "document_count": len(docs),
        "cluster_count": k,
        "silhouette_score": silhouette,
        "clusters": [
            {"cluster_id": cid, "top_terms": terms, "document_count": int((labels == cid).sum())}
            for cid, terms in cluster_top_terms.items()
        ],
    }
