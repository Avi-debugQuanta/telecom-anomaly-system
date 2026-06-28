import os
os.chdir("/Users/avipriyaghosh/Desktop/telecom-anomaly-system/backend")
from backend.agent import agent_executor

init_state = {
    "input": "Hello!",
    "sql_result": [],
    "sop_result": [],
    "ticket_md": "",
    "final_answer": "",
}
try:
    final_state = agent_executor.invoke(init_state)
    print("SUCCESS")
    print(final_state)
except Exception as e:
    import traceback
    traceback.print_exc()
