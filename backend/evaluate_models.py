import os
import pandas as pd
import numpy as np
from sklearn.metrics import accuracy_score, f1_score, classification_report
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier
from sklearn.ensemble import IsolationForest

def evaluate():
    print("Loading data...")
    DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "telecom_processed.csv")
    df = pd.read_csv(DATA_PATH)
    
    X = df.drop(columns=["customerID", "Churn_Yes", "synthetic_anomaly"], errors="ignore")
    y_anomaly = df["synthetic_anomaly"]

    X_train, X_test, y_anom_train, y_anom_test = train_test_split(
        X, y_anomaly, test_size=0.2, random_state=42, stratify=y_anomaly
    )

    print("\n--- Training XGBoost (Supervised Anomaly Detection) ---")
    xgb = XGBClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        random_state=42,
        n_jobs=-1
    )
    xgb.fit(X_train, y_anom_train)
    
    xgb_preds = xgb.predict(X_test)
    xgb_acc = accuracy_score(y_anom_test, xgb_preds)
    xgb_f1 = f1_score(y_anom_test, xgb_preds)
    print(f"XGBoost Accuracy: {xgb_acc:.4f}")
    print(f"XGBoost F1 Score: {xgb_f1:.4f}")

    print("\n--- Training Isolation Forest (Unsupervised Anomaly Detection) ---")
    # Isolation forest doesn't use labels for training
    iso = IsolationForest(contamination=0.05, random_state=42, n_jobs=-1)
    iso.fit(X_train)
    
    # Predict returns -1 for outlier, 1 for inlier
    iso_preds_raw = iso.predict(X_test)
    iso_preds = np.where(iso_preds_raw == -1, 1, 0)
    
    iso_acc = accuracy_score(y_anom_test, iso_preds)
    iso_f1 = f1_score(y_anom_test, iso_preds)
    print(f"Isolation Forest Accuracy: {iso_acc:.4f}")
    print(f"Isolation Forest F1 Score: {iso_f1:.4f}")

    print("\n--- Conclusion ---")
    if xgb_f1 > iso_f1:
        print("XGBoost performed better, but requires labeled fraud data (Supervised).")
    else:
        print("Isolation Forest performed better and does not require labeled data (Unsupervised).")

if __name__ == "__main__":
    evaluate()
