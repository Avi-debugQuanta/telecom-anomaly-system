# backend/pipeline.py
"""
Data preprocessing, synthetic anomaly injection,
and ML model training (RandomForest, XGBoost, IsolationForest).
"""
import os
import json
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from xgboost import XGBClassifier
import joblib

# ----------------------------------------------------------------------
# Helper: generate a synthetic dataset if the original CSV is missing
# ----------------------------------------------------------------------
def generate_synthetic_telecom(n_rows: int = 3333) -> pd.DataFrame:
    rng = np.random.default_rng(42)
    data = {
        "customerID": [f"C{1000+i}" for i in range(n_rows)],
        "State": rng.choice(["CA", "NY", "TX", "FL", "IL", "PA", "OH", "GA", "NC", "MI"], size=n_rows),
        "gender": rng.choice(["Male", "Female"], size=n_rows),
        "SeniorCitizen": rng.choice([0, 1], size=n_rows, p=[0.8, 0.2]),
        "Partner": rng.choice(["Yes", "No"], size=n_rows),
        "Dependents": rng.choice(["Yes", "No"], size=n_rows),
        "tenure": rng.integers(0, 72, size=n_rows),
        "PhoneService": rng.choice(["Yes", "No"], size=n_rows, p=[0.9, 0.1]),
        "MultipleLines": rng.choice(["Yes", "No", "No phone service"], size=n_rows),
        "InternetService": rng.choice(["DSL", "Fiber optic", "No"], size=n_rows, p=[0.3, 0.3, 0.4]),
        "OnlineSecurity": rng.choice(["Yes", "No", "No internet service"], size=n_rows),
        "OnlineBackup": rng.choice(["Yes", "No", "No internet service"], size=n_rows),
        "DeviceProtection": rng.choice(["Yes", "No", "No internet service"], size=n_rows),
        "TechSupport": rng.choice(["Yes", "No", "No internet service"], size=n_rows),
        "StreamingTV": rng.choice(["Yes", "No", "No internet service"], size=n_rows),
        "StreamingMovies": rng.choice(["Yes", "No", "No internet service"], size=n_rows),
        "Contract": rng.choice(["Month-to-month", "One year", "Two year"], size=n_rows, p=[0.55, 0.3, 0.15]),
        "PaperlessBilling": rng.choice(["Yes", "No"], size=n_rows),
        "PaymentMethod": rng.choice(
            ["Electronic check", "Mailed check", "Bank transfer (automatic)", "Credit card (automatic)"],
            size=n_rows,
        ),
        "MonthlyCharges": rng.uniform(18.0, 120.0, size=n_rows).round(2),
        "TotalCharges": lambda df: (df["tenure"] * df["MonthlyCharges"]).round(2),
    }
    df = pd.DataFrame(data)
    # Compute TotalCharges after MonthlyCharges known
    df["TotalCharges"] = (df["tenure"] * df["MonthlyCharges"]).round(2)
    # Add a churn label (binary) roughly 26% churn
    df["Churn"] = rng.choice(["Yes", "No"], size=n_rows, p=[0.26, 0.74])
    return df


# ----------------------------------------------------------------------
# Main pipeline
# ----------------------------------------------------------------------
def run_pipeline():
    DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "telecom_churn.csv")
    MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
    os.makedirs(MODEL_DIR, exist_ok=True)

    # 1️⃣ Load or generate dataset
    if os.path.exists(DATA_PATH):
        df = pd.read_csv(DATA_PATH)
        print(f"[INFO] Loaded existing dataset: {df.shape}")
    else:
        print("[WARN] Dataset not found – generating synthetic telecom churn data.")
        df = generate_synthetic_telecom()
        df.to_csv(DATA_PATH, index=False)
        print(f"[INFO] Saved synthetic dataset to {DATA_PATH}")

    # 2️⃣ Basic cleaning
    # Convert TotalCharges to numeric (some entries may be empty strings)
    df["TotalCharges"] = pd.to_numeric(df["TotalCharges"], errors="coerce")
    df["TotalCharges"].fillna(0, inplace=True)

    # Encode binary categoricals (Yes/No) -> 1/0
    binary_cols = [
        "gender",
        "Partner",
        "Dependents",
        "PhoneService",
        "PaperlessBilling",
    ]
    le = LabelEncoder()
    for col in binary_cols:
        df[col] = le.fit_transform(df[col])

    # One‑hot encode remaining categoricals (drop first to avoid multicollinearity)
    cat_cols = df.select_dtypes(include=["object"]).columns.tolist()
    if "customerID" in cat_cols:
        cat_cols.remove("customerID")
    df = pd.get_dummies(df, columns=cat_cols, drop_first=True)
    df.columns = df.columns.str.replace(" ", "_").str.replace("-", "_").str.replace("(", "").str.replace(")", "")

    # 3️⃣ Synthetic anomaly injection (5% of rows)
    rng = np.random.default_rng(123)
    n_anomaly = int(len(df) * 0.05)
    anomaly_idx = rng.choice(df.index, size=n_anomaly, replace=False)

    # Create a copy to avoid SettingWithCopyWarning
    df_loc = df.copy()
    df_loc["synthetic_anomaly"] = 0
    df_loc.loc[anomaly_idx, "synthetic_anomaly"] = 1

    # For anomaly rows: inflate minutes (use tenure as proxy) and zero out charges
    df_loc.loc[anomaly_idx, "MonthlyCharges"] = 0.0
    df_loc.loc[anomaly_idx, "tenure"] = df_loc.loc[anomaly_idx, "tenure"] * 5  # 5× minutes

    # Re‑compute TotalCharges after modification
    df_loc["TotalCharges"] = (df_loc["tenure"] * df_loc["MonthlyCharges"]).round(2)

    # 4️⃣ Features / target
    X = df_loc.drop(columns=["customerID", "Churn_Yes", "synthetic_anomaly"], errors="ignore")
    y_churn = df_loc["Churn_Yes"] if "Churn_Yes" in df_loc.columns else pd.Series(0, index=df_loc.index)
    y_anomaly = df_loc["synthetic_anomaly"]

    # Train‑test split (same split for all models)
    X_train, X_test, y_churn_train, y_churn_test, y_anom_train, y_anom_test = train_test_split(
        X, y_churn, y_anomaly, test_size=0.2, random_state=42, stratify=y_anomaly
    )

    # 5️⃣ Model definitions
    rf = RandomForestClassifier(n_estimators=200, max_depth=12, random_state=42, n_jobs=-1)
    xgb = XGBClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.9,
        colsample_bytree=0.9,
        objective="binary:logistic",
        eval_metric="logloss",
        random_state=42,
        n_jobs=-1,
    )
    iso = IsolationForest(contamination=0.05, random_state=42, n_jobs=-1)

    # 6️⃣ Fit
    rf.fit(X_train, y_churn_train)
    xgb.fit(X_train, y_churn_train)
    iso.fit(X_train)  # unsupervised – learns normal pattern

    # 7️⃣ Persist models
    joblib.dump(rf, os.path.join(MODEL_DIR, "rf_churn.pkl"))
    joblib.dump(xgb, os.path.join(MODEL_DIR, "xgb_churn.pkl"))
    joblib.dump(iso, os.path.join(MODEL_DIR, "iso_forest.pkl"))
    print("[INFO] ML models saved to", MODEL_DIR)

    # 8️⃣ Compute revenue leakage from synthetic anomalies
    # Expected revenue = tenure * normal monthly charge (we approximate normal charge as median of non‑anomaly rows)
    normal_median_charge = df_loc.loc[df_loc["synthetic_anomaly"] == 0, "MonthlyCharges"].median()
    expected_rev = (df_loc.loc[anomaly_idx, "tenure"] / 5) * normal_median_charge  # undo the 5× minute inflation
    actual_rev = df_loc.loc[anomaly_idx, "MonthlyCharges"] * df_loc.loc[anomaly_idx, "tenure"]
    leakage = (expected_rev - actual_rev).sum()
    print(f"[INFO] Estimated revenue leakage from injected anomalies: ${leakage:,.2f}")

    # 9️⃣ Save processed dataset with labels for downstream use
    processed_path = os.path.join(os.path.dirname(__file__), "data", "telecom_processed.db")
    # The actual SQLite ingestion is handled in db.py; we just keep the CSV for reference
    df_loc.to_csv(os.path.join(os.path.dirname(__file__), "data", "telecom_processed.csv"), index=False)
    print("[INFO] Processed CSV saved for DB ingestion.")


if __name__ == "__main__":
    run_pipeline()
