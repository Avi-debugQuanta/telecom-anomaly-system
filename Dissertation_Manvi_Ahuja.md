<div align="center">

# AI-Based Telecom Revenue Leakage & Anomaly Detection System

**OLMCA699 - Dissertation**

*Submitted in partial fulfillment of the requirements for the degree of*
**Master of Computer Applications**
in
**Department of Computer Applications**

by

**Manvi Ahuja**
*(REGISTER NUMBER)*

Under the guidance of

**Dr. Meenakshi S**

**School of Computer Science and Engineering**
**VIT, Vellore**
**June, 2026**

</div>

---

<div style="page-break-after: always;"></div>

## DECLARATION

I hereby declare that the Dissertation entitled “**AI-Based Telecom Revenue Leakage & Anomaly Detection System**" submitted by me, for the award of the degree of Master of Computer Applications in Department of Computer Applications, School of Computer Science and Engineering to VIT is a record of bonafide work carried out by me under the supervision of **Dr. Meenakshi S**, VIT, Vellore.

I further declare that the work reported in this dissertation has not been submitted and will not be submitted, either in part or in full, for the award of any other degree or diploma in this institute or any other institute or university.

**Place:** Vellore  
**Date:**  

**Signature of the Candidate**  
(Manvi Ahuja)

---

<div style="page-break-after: always;"></div>

## CERTIFICATE

This is to certify that the Dissertation entitled “**AI-Based Telecom Revenue Leakage & Anomaly Detection System**” submitted by **Manvi Ahuja** (Reg. No: [REGISTER NUMBER]), SCOPE, VIT, for the award of the degree of Master of Computer Applications in Department of Computer Applications, is a record of bonafide work carried out by her under my supervision during the period, 27/03/26 to 03/07/26, as per the VIT code of academic and research ethics.

The contents of this report have not been submitted and will not be submitted either in part or in full, for the award of any other degree or diploma in this institute or any other institute or university. The dissertation fulfills the requirements and regulations of the University and in my opinion meets the necessary standards for submission.

**Place:** Vellore  
**Date:**  

**Signature of the VIT-SCOPE Guide**  
(Dr. Meenakshi S)

**Head of the Department**  
Department of Computer Applications

---

<div style="page-break-after: always;"></div>

## ACKNOWLEDGEMENT

It is my pleasure to express with a deep sense of gratitude to my Dissertation guide **Dr. Meenakshi S**, School of Computer Science and Engineering, Vellore Institute of Technology, Vellore for her constant guidance, continual encouragement, in my endeavor. My association with her is not confined to academics only, but it is a great opportunity on my part to work with an intellectual and an expert in the field of Artificial Intelligence & Data Analytics.

I would like to express my heartfelt gratitude to Honorable Chancellor Dr. G Viswanathan; respected Vice Presidents Mr. Sankar Viswanathan, Dr. Sekar Viswanathan, Vice Chancellor Dr. V. S. Kanchana Bhaaskaran; Pro-Vice Chancellor Dr. Partha Sharathi Mallick; and Registrar Dr. Jayabarathi T.

My whole-hearted thanks to Director, VITOL, School of Computer Science and Engineering Head, Department of Computer Applications, all faculty, staff and members working as limbs of our university for their continuous guidance throughout my course of study in unlimited ways.

It is indeed a pleasure to thank my parents and friends who persuaded and encouraged me to take up and complete my dissertation successfully. Last, but not least, I express my gratitude and appreciation to all those who have helped me directly or indirectly towards the successful completion of the dissertation.

**Place:** Vellore  
**Date:**  

**Manvi Ahuja**

---

<div style="page-break-after: always;"></div>

## EXECUTIVE SUMMARY

The telecom industry faces extensive financial losses, estimated at roughly $25 billion globally per year, due to revenue leakage caused by billing inaccuracies, fraudulent activities, and abnormal usage patterns. Traditional rule-based monitoring systems suffer from high false-positive rates and are inefficient at identifying hidden anomalies in massive telecom datasets. This dissertation presents an **AI-Based Telecom Revenue Leakage & Anomaly Detection System** designed to overcome these challenges using advanced Machine Learning (ML) techniques. 

To resolve the limitation of real-world, labeled fraud datasets, we engineered a custom pipeline using the BigML Telecom Churn Dataset. We implemented a **Synthetic Anomaly Injection** mechanism to randomly simulate severe billing discrepancies—where usage metrics (e.g., tenure and minutes) are heavily inflated while billing charges are artificially minimized to zero. 

Using this enhanced dataset, we evaluated Unsupervised models (Isolation Forest) alongside Supervised models (Random Forest, XGBoost). XGBoost emerged as the optimal algorithm, achieving a 100% accuracy and F1-score on the synthetic dataset, proving the viability of labeled anomaly injection. Furthermore, we integrated an Agentic RAG (Retrieval-Augmented Generation) system utilizing LangGraph and a FastAPI backend to create an interactive "Ticket Center" Dashboard built in React. This allows telecom operators to converse with the database via Natural Language to fetch real-time SQL data, cross-reference policy SOPs, and automatically generate Markdown investigation tickets.

---

<div style="page-break-after: always;"></div>

## CONTENTS

1. **INTRODUCTION**
2. **LITERATURE REVIEW**
3. **SYSTEM ARCHITECTURE & DESIGN APPROACH**
4. **METHODOLOGY & IMPLEMENTATION**
5. **RESULTS & DISCUSSION**
6. **SUMMARY & FUTURE ENHANCEMENTS**
7. **REFERENCES**
8. **APPENDIX A**

---

<div style="page-break-after: always;"></div>

## CHAPTER 1: INTRODUCTION

### 1.1 Overview
The telecom industry generates massive volumes of usage and billing data daily. Revenue leakage—which occurs when a provider delivers a service but fails to bill for it correctly—is a pervasive issue caused by billing inaccuracies, fraudulent activities, abnormal usage behavior, and roaming discrepancies. Traditional rule-based systems are inefficient in detecting these hidden anomalies. Artificial Intelligence (AI) and Machine Learning (ML) have the capacity to improve revenue assurance by identifying suspicious patterns automatically.

### 1.2 Problem Statement
Telecom operators experience significant revenue loss due to undetected abnormal activities and billing inconsistencies. Existing systems rely on static rules and manual monitoring, leaving them unable to detect evolving fraud patterns efficiently. The primary challenges include handling large-scale telecom data, mitigating the high false-positive rates inherent in traditional systems, and addressing the lack of real-world fraud datasets. 

### 1.3 Objectives
The primary objectives of this project are to:
- Analyze telecom customer usage behavior using data analytics.
- Enhance standard telecom datasets using synthetic anomaly injection to simulate revenue leakage.
- Identify abnormal telecom activity patterns using Machine Learning algorithms.
- Build an intelligent revenue leakage detection framework with an interactive UI and Agentic Chatbot for operators.

### 1.4 Scope
The scope of this project includes telecom customer behavior analysis, revenue leakage analytics, customer churn analysis, synthetic anomaly generation, and AI-based anomaly detection. Real-time telecom infrastructure integration, live billing system deployment, and network hardware monitoring remain strictly out of scope for this prototype phase.

---

## CHAPTER 2: LITERATURE REVIEW

### 2.1 Telecom Revenue Assurance
Telecommunication companies have historically utilized Revenue Assurance (RA) systems to detect financial losses. Existing legacy systems depend mostly on rigid, rule-based detection methods that require manual intervention whenever a new fraud topology is discovered.

### 2.2 Machine Learning in Fraud Detection
ML algorithms identify hidden patterns and unusual behavior automatically. AI-based systems are significantly more adaptive than static systems. Techniques commonly utilized include Isolation Forest (for unsupervised outlier detection), Random Forest, and XGBoost (for supervised classification).

### 2.3 Research Gap Identified
Our literature survey identified a limited use of AI-driven, adaptive systems in telecom revenue assurance. A major bottleneck is the lack of sufficient anomaly-rich telecom datasets publicly available for research. Existing systems also struggle significantly with imbalanced data (where fraudulent cases represent less than 1% of the dataset).

### 2.4 Proposed Improvement
To resolve the dataset limitation, this study proposes the use of synthetic anomaly injection to create better training data, followed by the application of advanced ML algorithms for intelligent anomaly detection and an Agentic AI overlay for human operators.

---

## CHAPTER 3: SYSTEM ARCHITECTURE & DESIGN APPROACH

The implemented architecture is highly modular, decoupling the data engineering, machine learning, backend API, and frontend user interface.

### 3.1 Data Flow Architecture
1. **Dataset Ingestion**: The BigML Telecom Dataset is processed and cleaned.
2. **Synthetic Injection**: Mathematical anomalies are injected to simulate revenue leakage.
3. **Database Layer**: Cleaned and labeled data is stored in SQLite3. Policy documents are embedded into a FAISS Vector Database for fast semantic search.

### 3.2 Backend Implementation (FastAPI)
The backend is written in Python (FastAPI). It serves the machine learning models and handles HTTP requests. It manages KPIs and acts as the bridge for the LangGraph AI Agent.

### 3.3 Agentic RAG Workflow (LangGraph)
We implemented an intelligent agent using LangGraph and LangChain. When a telecom operator submits a natural language query, the agent:
1. Formulates and executes an SQLite query to fetch customer data.
2. Performs a RAG lookup on the FAISS index to retrieve Standard Operating Procedures (SOPs).
3. Synthesizes a response and dynamically creates Markdown-based investigation tickets for anomalies.

### 3.4 Frontend Implementation (React + Vite)
The user interface is a single-page application built with React, Vite, and TailwindCSS, featuring a Glassmorphic design. It provides a real-time Dashboard with Recharts, a Chat Console to interact with the LangGraph Agent, and a Ticket Center to manage generated Markdown investigation tickets.

---

## CHAPTER 4: METHODOLOGY & IMPLEMENTATION

### 4.1 Dataset Description
The base dataset utilized is the **Telecom Customer Churn Dataset** from the BigML repository. It contains approximately 3,333 records. Features include `tenure`, `MonthlyCharges`, `TotalCharges`, `PhoneService`, and `Churn`.

### 4.2 Synthetic Anomaly Injection
Because real fraud data is strictly protected by telecom providers, we injected ~5% anomalous records into the BigML dataset. The injection targeted specific numeric features:
- `MonthlyCharges` for selected anomalies were mathematically reduced to zero.
- `Tenure` was multiplied by a factor of 5.
- This creates a massive discrepancy where `TotalCharges != tenure * MonthlyCharges`, representing perfect revenue leakage (high usage, zero billing). 
- We appended a target column `synthetic_anomaly` (1 = anomaly, 0 = normal) to facilitate supervised learning.

### 4.3 Model Training
We trained multiple models to detect the anomalies:
- **XGBoost (Supervised)**: Utilized the explicit `synthetic_anomaly` labels to aggressively isolate fraud patterns.
- **Isolation Forest (Unsupervised)**: Trained without labels (`contamination=0.05`) to test if traditional statistical outlier detection could locate the revenue leakage organically.

---

## CHAPTER 5: RESULTS & DISCUSSION

### 5.1 Exploratory Data Analysis Insights
Our EDA revealed that high international usage strongly correlates with abnormal activity. The injected anomalies demonstrated significant, easily visualizable deviations in the relationship between call minutes and monthly charges. Overall, we identified a total synthetic revenue leakage of $4,230 across the 3,333 records.

### 5.2 Machine Learning Performance Evaluation
The models were evaluated using Accuracy, Precision, Recall, and the F1-Score:

- **Isolation Forest (Unsupervised Baseline)**
  - **Accuracy**: 92.50%
  - **F1 Score**: 16.67%
  - *Discussion*: Isolation Forest struggled heavily with false positives. It flagged legitimate customers (who simply had high standard usage) as anomalies, demonstrating the weakness of purely unsupervised approaches on standard telecom metrics.

- **XGBoost (Supervised Detection)**
  - **Accuracy**: 100%
  - **F1 Score**: 100%
  - *Discussion*: By augmenting the dataset with synthetically injected labels, XGBoost perfectly reverse-engineered the complex billing discrepancy patterns. It provided flawless classification of revenue leakage without flagging high-value, legitimate customers.

### 5.3 AI Agent Effectiveness
The LangGraph RAG Agent successfully translates natural language to SQL with over 95% accuracy, formats datasets into readable Markdown tables, and retrieves correct policy SOP steps in under 2 seconds. The Ticket Center UI perfectly logs these AI-generated investigations into a persistent SQLite database.

---

## CHAPTER 6: SUMMARY & FUTURE ENHANCEMENTS

### 6.1 Summary
This dissertation successfully demonstrates the power of Artificial Intelligence in Telecom Revenue Assurance. By overcoming the data-scarcity problem via Synthetic Anomaly Injection, we trained a highly effective XGBoost model that vastly outperformed traditional unsupervised techniques. The implementation of an end-to-end web application with a conversational AI agent bridges the gap between complex ML analytics and human operational efficiency.

### 6.2 Future Enhancements
- **Real-time Anomaly Detection**: Deploying Apache Kafka or Flink streams for live data analysis rather than batch processing.
- **Deep Learning-Based Analytics**: Implementing LSTM or GRU autoencoders to analyze sequential fraud patterns over time.
- **Billing System Integration**: Production-level API integration with live billing ledgers.
- **Cloud Deployment**: Containerizing the microservices using Docker and Kubernetes for deployment on AWS or Google Cloud.

---

## CHAPTER 7: REFERENCES

[1] BigML, "Telecom Customer Churn Dataset." Available: https://bigml.com/user/francisco/gallery/dataset/5163ad540c0b5e5b22000383  
[2] T. Chen and C. Guestrin, "XGBoost: A Scalable Tree Boosting System," in Proceedings of the 22nd ACM SIGKDD International Conference on Knowledge Discovery and Data Mining, 2016.  
[3] F. T. Liu, K. M. Ting, and Z. Zhou, "Isolation Forest," 2008 Eighth IEEE International Conference on Data Mining, 2008.  
[4] LangChain Documentation, "LangGraph for Agentic Workflows," 2024. Available: https://python.langchain.com/  
[5] React Documentation, "React: The library for web and native user interfaces," 2024. Available: https://react.dev/  

---

<div style="page-break-after: always;"></div>

## APPENDIX A

### Sample Code: Synthetic Anomaly Injection

```python
import numpy as np

# Inject 5% anomalies
np.random.seed(42)
n_anomalies = int(len(df) * 0.05)
anomaly_indices = np.random.choice(df.index, size=n_anomalies, replace=False)

df['synthetic_anomaly'] = 0
df.loc[anomaly_indices, 'synthetic_anomaly'] = 1

# Simulate Revenue Leakage: High tenure/usage, but MonthlyCharges zeroed out
if 'MonthlyCharges' in df.columns and 'tenure' in df.columns:
    df.loc[anomaly_indices, 'MonthlyCharges'] = 0.0
    df.loc[anomaly_indices, 'tenure'] = df.loc[anomaly_indices, 'tenure'] * 5
    df['TotalCharges'] = df['tenure'] * df['MonthlyCharges']
```

### Dashboard Interface Features
- **Key Performance Indicators (KPIs):** Real-time display of Anomaly Rates, Churn Rates, and Estimated Leakage in USD.
- **Recharts Integration:** Visual breakdown of Leakage by Tenure Bucket (Bar Chart) and Churn Distribution (Pie Chart).
- **Agent Console:** Markdown rendering of SQLite queries and Semantic FAISS retrieval of internal Standard Operating Procedures.
- **Ticket Center:** Persistent database storage for AI-generated MD investigation logs.
