import nbformat as nbf

def create_notebook():
    nb = nbf.v4.new_notebook()
    
    cells = []
    
    # Title
    cells.append(nbf.v4.new_markdown_cell("# AI-Based Telecom Revenue Leakage & Anomaly Detection\nThis notebook demonstrates how to fetch real-world telecom datasets from Kaggle and Hugging Face, inject synthetic anomalies to simulate revenue leakage, and train Machine Learning models (XGBoost & Isolation Forest) to detect them."))
    
    # Setup
    cells.append(nbf.v4.new_markdown_cell("## 1. Environment Setup\nInstall required libraries for dataset fetching and machine learning."))
    cells.append(nbf.v4.new_code_cell("!pip install kaggle datasets xgboost scikit-learn pandas numpy matplotlib seaborn -q"))
    
    # Fetch Data from Hugging Face
    cells.append(nbf.v4.new_markdown_cell("## 2. Fetching Telecom Dataset\nWe can fetch telecom churn datasets from Hugging Face or Kaggle. Below we show how to load a popular telecom dataset from Hugging Face."))
    cells.append(nbf.v4.new_code_cell("""from datasets import load_dataset
import pandas as pd

print("Fetching dataset from Hugging Face...")
# Loading a standard Telco Customer Churn dataset
dataset = load_dataset("scikit-learn/churn-prediction", split="train")
df = dataset.to_pandas()

# Basic preprocessing
df = df.dropna()
print(f"Dataset Loaded. Shape: {df.shape}")
display(df.head())"""))

    # Optional Kaggle
    cells.append(nbf.v4.new_markdown_cell("Alternatively, you can fetch datasets from Kaggle using the Kaggle API (requires kaggle.json token)."))
    cells.append(nbf.v4.new_code_cell("""import os

# NOTE: To use this, you must have your Kaggle API key at ~/.kaggle/kaggle.json
# !kaggle datasets download -d blastchar/telco-customer-churn --unzip
# df = pd.read_csv('WA_Fn-UseC_-Telco-Customer-Churn.csv')
"""))
    
    # Preprocessing
    cells.append(nbf.v4.new_markdown_cell("## 3. Data Preprocessing\nConvert categorical variables to numeric format for ML models."))
    cells.append(nbf.v4.new_code_cell("""from sklearn.preprocessing import LabelEncoder

# Encode target variable
if 'churn' in df.columns:
    df['Churn'] = df['churn'].apply(lambda x: 1 if x == 'Yes' or x == 1 else 0)
    df.drop('churn', axis=1, inplace=True)

# Encode categorical features
categorical_cols = df.select_dtypes(include=['object', 'category']).columns
le = LabelEncoder()
for col in categorical_cols:
    df[col] = le.fit_transform(df[col].astype(str))

# Ensure TotalCharges is numeric
if 'TotalCharges' in df.columns:
    df['TotalCharges'] = pd.to_numeric(df['TotalCharges'], errors='coerce').fillna(0)

print("Data Preprocessing Complete.")
"""))

    # Synthetic Anomaly Injection
    cells.append(nbf.v4.new_markdown_cell("## 4. Synthetic Anomaly Injection\nSince real fraud data is rare, we inject synthetic anomalies (representing 5% of the data) to simulate revenue leakage. Anomalous customers will have extremely high usage but zero/low charges."))
    cells.append(nbf.v4.new_code_cell("""import numpy as np

# Inject 5% anomalies
np.random.seed(42)
n_anomalies = int(len(df) * 0.05)
anomaly_indices = np.random.choice(df.index, size=n_anomalies, replace=False)

df['synthetic_anomaly'] = 0
df.loc[anomaly_indices, 'synthetic_anomaly'] = 1

# Simulate Fraud: High tenure/usage, but MonthlyCharges manipulated to 0
if 'MonthlyCharges' in df.columns and 'tenure' in df.columns:
    df.loc[anomaly_indices, 'MonthlyCharges'] = 0.0
    df.loc[anomaly_indices, 'tenure'] = df.loc[anomaly_indices, 'tenure'] * 5
    df['TotalCharges'] = df['tenure'] * df['MonthlyCharges']

print(f"Injected {n_anomalies} synthetic anomalies.")
print(df['synthetic_anomaly'].value_counts())
"""))

    # Train-Test Split
    cells.append(nbf.v4.new_markdown_cell("## 5. Model Training Setup\nWe will use the `synthetic_anomaly` column as our target to evaluate how well ML models can detect revenue leakage."))
    cells.append(nbf.v4.new_code_cell("""from sklearn.model_selection import train_test_split

# Features and Target
X = df.drop(columns=['synthetic_anomaly', 'Churn'], errors='ignore')
y = df['synthetic_anomaly']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
print(f"Training set: {X_train.shape}, Test set: {X_test.shape}")
"""))

    # XGBoost
    cells.append(nbf.v4.new_markdown_cell("## 6. Supervised ML: XGBoost\nXGBoost is trained on labeled anomaly data to explicitly classify fraud vs normal usage."))
    cells.append(nbf.v4.new_code_cell("""from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score, f1_score, classification_report, confusion_matrix
import seaborn as sns
import matplotlib.pyplot as plt

# Train XGBoost
xgb = XGBClassifier(n_estimators=200, max_depth=6, learning_rate=0.1, random_state=42)
xgb.fit(X_train, y_train)

# Evaluate XGBoost
y_pred_xgb = xgb.predict(X_test)
xgb_acc = accuracy_score(y_test, y_pred_xgb)
xgb_f1 = f1_score(y_test, y_pred_xgb)

print("--- XGBoost Performance ---")
print(f"Accuracy: {xgb_acc:.4f}")
print(f"F1 Score: {xgb_f1:.4f}")
print("\\nClassification Report:\\n", classification_report(y_test, y_pred_xgb))

# Plot Confusion Matrix
plt.figure(figsize=(6,4))
sns.heatmap(confusion_matrix(y_test, y_pred_xgb), annot=True, fmt='d', cmap='Blues')
plt.title("XGBoost Confusion Matrix")
plt.xlabel("Predicted")
plt.ylabel("Actual")
plt.show()
"""))

    # Feature Importance
    cells.append(nbf.v4.new_markdown_cell("### XGBoost Feature Importance\nLet's see which parameters/features were most important for detecting the anomalies."))
    cells.append(nbf.v4.new_code_cell("""# Plot Feature Importances
importances = xgb.feature_importances_
indices = np.argsort(importances)[::-1]

plt.figure(figsize=(10, 5))
plt.title("Feature Importances (XGBoost)")
plt.bar(range(X_train.shape[1]), importances[indices], align="center")
plt.xticks(range(X_train.shape[1]), X_train.columns[indices], rotation=90)
plt.xlim([-1, X_train.shape[1]])
plt.tight_layout()
plt.show()
"""))

    # Isolation Forest
    cells.append(nbf.v4.new_markdown_cell("## 7. Unsupervised ML: Isolation Forest\nIsolation forest tries to detect anomalies without using labels, looking only for statistical outliers."))
    cells.append(nbf.v4.new_code_cell("""from sklearn.ensemble import IsolationForest

# Train Isolation Forest (no labels used in training)
iso = IsolationForest(contamination=0.05, random_state=42)
iso.fit(X_train)

# Predict (-1 is anomaly, 1 is normal)
y_pred_iso_raw = iso.predict(X_test)
# Map to 1 (anomaly) and 0 (normal)
y_pred_iso = np.where(y_pred_iso_raw == -1, 1, 0)

iso_acc = accuracy_score(y_test, y_pred_iso)
iso_f1 = f1_score(y_test, y_pred_iso)

print("--- Isolation Forest Performance ---")
print(f"Accuracy: {iso_acc:.4f}")
print(f"F1 Score: {iso_f1:.4f}")
print("\\nClassification Report:\\n", classification_report(y_test, y_pred_iso))

# Plot Confusion Matrix
plt.figure(figsize=(6,4))
sns.heatmap(confusion_matrix(y_test, y_pred_iso), annot=True, fmt='d', cmap='Oranges')
plt.title("Isolation Forest Confusion Matrix")
plt.xlabel("Predicted")
plt.ylabel("Actual")
plt.show()
"""))

    nb.cells = cells
    
    with open('Telecom_Anomaly_Detection.ipynb', 'w') as f:
        nbf.write(nb, f)
    
    print("Notebook created successfully.")

if __name__ == "__main__":
    create_notebook()
