# backend/app.py
"""
FastAPI server exposing:
 • GET /api/kpis      – dashboard KPIs
 • GET /api/customers – paginated customer list with filters
 • POST /api/chat     – agentic chat (returns answer + executed SQL)
 • POST /api/ticket/{phone} – generate & return markdown ticket
Also serves a simple health‑check.
"""
import os
import json
import math
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from backend.db import get_connection
from backend.agent import agent_executor, AgentState
from backend.pipeline import run_pipeline  # optional: allow re‑train via endpoint

app = FastAPI(title="Telecom Revenue Leakage & Anomaly Detection API")

# CORS – allow Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------------------------------------------------
# Startup: ensure DB & models exist
# ----------------------------------------------------------------------
@app.on_event("startup")
def startup_event():
    # Initialize DB (creates tables & ingests CSV if needed)
    from backend.db import init_sqlite
    init_sqlite()
    # Ensure FAISS index exists
    from backend.db import load_sop_index
    load_sop_index()
    # Optionally pretrain models if missing
    model_dir = os.path.join(os.path.dirname(__file__), "models")
    if not all(
        os.path.exists(os.path.join(model_dir, f))
        for f in ["rf_churn.pkl", "xgb_churn.pkl", "iso_forest.pkl"]
    ):
        print("[INFO] Training ML models (first‑run)…")
        run_pipeline()


# ----------------------------------------------------------------------
# Pydantic models
# ----------------------------------------------------------------------
class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    answer: str
    sql: Optional[str] = None
    sop: List[str] = []
    ticket_md: Optional[str] = None

class KPIResponse(BaseModel):
    total_customers: int
    anomaly_count: int
    anomaly_rate: float
    churn_rate: float
    total_leakage_usd: float
    avg_monthly_charge: float

class CustomerRow(BaseModel):
    customerID: str
    gender: str
    SeniorCitizen: int
    Partner: str
    Dependents: str
    tenure: int
    PhoneService: str
    MonthlyCharges: float
    TotalCharges: float
    Churn_Yes: int
    synthetic_anomaly: int

class TicketRow(BaseModel):
    id: int
    customer_id: str
    issue: str
    ticket_md: str
    status: str
    created_at: str

# ----------------------------------------------------------------------
# Helper: run SQL safely
# ----------------------------------------------------------------------
def execute_sql(sql: str) -> List[Dict]:
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(sql)
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]
    finally:
        conn.close()


# ----------------------------------------------------------------------
# Routes
# ----------------------------------------------------------------------
@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/kpis", response_model=KPIResponse)
def get_kpis():
    conn = get_connection()
    cur = conn.cursor()
    # total customers
    cur.execute("SELECT COUNT(*) FROM customers")
    total_customers = cur.fetchone()[0]

    # anomaly count
    cur.execute("SELECT SUM(synthetic_anomaly) FROM customers")
    anomaly_count = cur.fetchone()[0] or 0

    # churn count (Churn_Yes = 1)
    cur.execute("SELECT SUM(Churn_Yes) FROM customers")
    churn_count = cur.fetchone()[0] or 0

    # average monthly charge
    cur.execute("SELECT AVG(MonthlyCharges) FROM customers")
    avg_monthly_charge = cur.fetchone()[0] or 0.0

    # estimated leakage: sum of missing revenue for anomaly rows
    # Expected revenue = tenure * median monthly charge of non‑anomaly
    cur.execute(
        """
        SELECT
          SUM(
            CASE
              WHEN synthetic_anomaly = 1 THEN
                ((tenure / 5.0) * (SELECT AVG(MonthlyCharges) FROM customers WHERE synthetic_anomaly = 0))
                - (tenure * MonthlyCharges)
              ELSE 0
            END
          )
        FROM customers
        """
    )
    leakage = cur.fetchone()[0] or 0.0
    conn.close()

    return KPIResponse(
        total_customers=total_customers,
        anomaly_count=int(anomaly_count),
        anomaly_rate=round(anomaly_count / total_customers, 4) if total_customers else 0.0,
        churn_rate=round(churn_count / total_customers, 4) if total_customers else 0.0,
        total_leakage_usd=round(float(leakage), 2),
        avg_monthly_charge=round(float(avg_monthly_charge), 2),
    )


@app.get("/api/customers", response_model=List[CustomerRow])
def get_customers(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    anomaly: Optional[int] = Query(None, ge=0, le=1),
    churn: Optional[int] = Query(None, ge=0, le=1),
    search: Optional[str] = None,
):
    conn = get_connection()
    cur = conn.cursor()
    where = []
    params = []
    if anomaly is not None:
        where.append("synthetic_anomaly = ?")
        params.append(anomaly)
    if churn is not None:
        where.append("Churn_Yes = ?")
        params.append(churn)
    if search:
        where.append("(customerID LIKE ?)")
        params.append(f"%{search}%")
    where_clause = "WHERE " + " AND ".join(where) if where else ""
    sql = f"""
        SELECT
          customerID,
          CASE gender WHEN 1 THEN 'Male' ELSE 'Female' END as gender,
          SeniorCitizen,
          CASE Partner WHEN 1 THEN 'Yes' ELSE 'No' END as Partner,
          CASE Dependents WHEN 1 THEN 'Yes' ELSE 'No' END as Dependents,
          tenure,
          CASE PhoneService WHEN 1 THEN 'Yes' ELSE 'No' END as PhoneService,
          MonthlyCharges,
          TotalCharges,
          Churn_Yes,
          synthetic_anomaly
        FROM customers
        {where_clause}
        ORDER BY customerID
        LIMIT ? OFFSET ?
    """
    params.extend([limit, offset])
    cur.execute(sql, params)
    cols = [d[0] for d in cur.description]
    rows = [dict(zip(cols, row)) for row in cur.fetchall()]
    conn.close()
    return rows


@app.post("/api/chat", response_model=ChatResponse)
def chat_endpoint(req: ChatRequest):
    """
    Invokes the LangGraph agent. Returns the final answer plus intermediate
    artefacts (SQL, SOPs, ticket markdown) for UI rendering.
    """
    # Initialize state
    init_state: AgentState = {
        "input": req.message,
        "sql_result": [],
        "sop_result": [],
        "ticket_md": "",
        "final_answer": "",
    }
    final_state = agent_executor.invoke(init_state)
    # Pull out the SQL that was run (last query from sql_result)
    sql_used = None
    if final_state.get("sql_result"):
        # attempt to reverse‑engineer SQL – not perfect but fine for demo
        sql_used = final_state["sql_result"][0].get("_sql")  # placeholder
    return ChatResponse(
        answer=final_state["final_answer"],
        sql=sql_used,
        sop=final_state.get("sop_result", []),
        ticket_md=final_state.get("ticket_md"),
    )


@app.post("/api/ticket/{phone}")
def generate_ticket(phone: str, req: ChatRequest):
    """
    Generates a markdown ticket for a specific customerID (phone) using the
    supplied message as the issue summary, and saves it to the database.
    """
    payload = {
        "phone": phone,
        "summary": req.message,
        "steps": [],  # could be extracted from agent but keep simple
    }
    from backend.agent import generate_ticket_tool
    md = generate_ticket_tool.func(json.dumps(payload))
    
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO tickets (customer_id, issue, ticket_md, status) VALUES (?, ?, ?, ?)",
        (phone, req.message, md, "Open")
    )
    conn.commit()
    conn.close()
    
    return {"ticket_md": md, "filename": f"ticket_{phone}.md"}


@app.get("/api/tickets", response_model=List[TicketRow])
def get_tickets():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, customer_id, issue, ticket_md, status, created_at FROM tickets ORDER BY created_at DESC")
    cols = [d[0] for d in cur.description]
    rows = [dict(zip(cols, row)) for row in cur.fetchall()]
    conn.close()
    return rows


# Optional endpoint to force retraining (useful during dev)
@app.post("/admin/retrain")
def retrain():
    run_pipeline()
    return {"msg": "Pipeline re‑executed. Models and DB refreshed."}
