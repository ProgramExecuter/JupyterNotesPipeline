import os
import json
import nbformat
import markdown
import re

from dotenv import load_dotenv
from datetime import datetime
from pymongo import MongoClient


stats = {
    "easy": 0,
    "medium": 0,
    "hard": 0,
    "total": 0
}

problem_list = []

# ==========================================
# MongoDB Connection
# ==========================================

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client["jupyter_notes_db"]

LIVE_COLLECTION = "notes_live"
TEMP_COLLECTION = "notes_temp"
stats_collection = db["stats"]
problem_list_collection = db["problem_list"]

# =============================================
# DEBUG
# =============================================

print("\n====================================================================")
print("Parsing Started")
print(datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
print("====================================================================")


# ==========================================
# Load Folder Config
# ==========================================

with open("notebook_config.json", "r") as f:
    folders = json.load(f)


# ==========================================
# Clean Temp Collection
# ==========================================

db[TEMP_COLLECTION].drop()
temp_collection = db[TEMP_COLLECTION]


# ==========================================
# Process Each Folder
# ==========================================

for folder in folders:

    folder_path = folder["folder_path"]
    tag = folder["tag"]

    print(f"\nScanning folder: {folder_path}")
    print(f"Tag: {tag}")

    # Validate folder
    if not os.path.exists(folder_path):
        print(f"Folder does not exist: {folder_path}")
        continue

    # Walk recursively
    for root, dirs, files in os.walk(folder_path):
        dirs[:] = [
            d for d in dirs
            if d != ".ipynb_checkpoints"
        ]

        for file_name in files:

            if not file_name.endswith(".ipynb"):
                continue

            file_path = os.path.join(root, file_name)

            print(f"Parsing notebook: {file_path}")

            try:

                # Last modified time
                modified_timestamp = os.path.getmtime(file_path)

                notebook_updated_at = datetime.fromtimestamp(
                    modified_timestamp
                )

                # Read notebook
                with open(file_path, "r", encoding="utf-8") as f:
                    notebook = nbformat.read(f, as_version=4)

                # Parse cells
                for idx, cell in enumerate(notebook.cells):

                    if cell.cell_type != "markdown":
                        continue

                    markdown_content = cell.source.strip()
                    if not markdown_content:
                        continue

                    # ==========================================
                    # DSA Problem Stats Parsing
                    # ==========================================

                    if tag == "DSA":
                        problem_pattern = re.search(
                            r"##\s+.*?\s+##\s*\n\s*\*\((Easy|Medium|Hard)\)\*\s*\n\s*\[Problem Link\]",
                            markdown_content,
                            re.IGNORECASE
                        )

                        # Only for DSA problems
                        if problem_pattern:
                            # Save count of each type of difficulty
                            difficulty = (problem_pattern.group(1).lower())
                            stats[difficulty] += 1
                            stats["total"] += 1

                            # Create problems list
                            title_match = re.search(
                                r"##\s+(.*?)\s+##",
                                markdown_content
                            )

                            title = (
                                title_match.group(1)
                                if title_match
                                else None
                            )

                            if title:
                                problem_list.append(title)

                    document = {
                        "tag": tag,
                        "file_name": file_name,
                        "file_path": file_path,
                        "cell_index": idx,
                        "content": markdown_content,
                        "updated_at": notebook_updated_at,
                        "parsed_at": datetime.utcnow()
                    }

                    temp_collection.insert_one(document)

            except Exception as e:
                print(f"Error parsing {file_path}")
                print(str(e))


# ==========================================
# Replace Live Collection
# ==========================================

db[LIVE_COLLECTION].drop()

temp_docs = list(temp_collection.find())

if temp_docs:
    db[LIVE_COLLECTION].insert_many(temp_docs)

temp_collection.drop()


# ==========================================
# Make API Faster
# ==========================================

db[LIVE_COLLECTION].create_index("tag")
db[LIVE_COLLECTION].create_index("updated_at")
db[LIVE_COLLECTION].create_index([("content", "text")])

print("\nDone updating notes_live collection.")


# ==========================================
# Save DSA Stats
# ==========================================

stats["updated_at"] = datetime.utcnow()
stats_collection = db["stats"]
stats_collection.delete_many({})
stats_collection.insert_one(stats)

print("\nSaved DSA stats")
print(stats)


# ==========================================
# Save Problem List
# ==========================================

problem_list_collection.delete_many({})

problem_list_collection.insert_one({
    "tag": "DSA",
    "total": len(problem_list),
    "updated_at": datetime.utcnow(),
    "questions": problem_list
})

print("\nSaved problem list")
print(f"Total problems: {len(problem_list)}")




print("\n====================================================================")
print("Parsing Completed")
print(datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
print("====================================================================\n\n\n\n\n\n")
