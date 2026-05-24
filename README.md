# Jupyter Notes Pipeline

A personal knowledge pipeline that converts local Jupyter Notebook markdown notes into a searchable cloud-backed API system.

The project parses `.ipynb` markdown cells, stores them in MongoDB, exposes them through REST APIs, and powers an Android revision application for DSA practice.

---

# Features

## Notebook Parsing

* Parses markdown cells from local Jupyter notebooks
* Recursive folder scanning
* Tag-based notebook organization
* Automatic skipping of:

  * empty markdown cells
  * `.ipynb_checkpoints`
  * malformed DSA problem cells

---

## MongoDB Storage

Stores:

* notebook markdown notes
* DSA difficulty statistics
* DSA problem title list

Collections:

* `notes_live`
* `stats`
* `problem_list`

---

## Public REST API

Node.js + Express APIs for:

* random notes
* sequential notes
* tag filtering
* notebook file listing
* DSA statistics
* DSA problem list

---

## Android App Support

The backend powers an Android revision app built using:

* Kotlin
* Jetpack Compose
* Material 3

Android App Repository:
> `https://github.com/ProgramExecuter/JupyterNotesAndroidApp`

---

## Production Deployment

* Ubuntu VM hosting
* PM2 process management
* Nginx reverse proxy
* HTTPS using Certbot + Let's Encrypt
* Daily cron-based notebook refresh pipeline

---

# Architecture

```text
Jupyter Notebooks
        ↓
Python Parser Pipeline
        ↓
MongoDB Atlas
        ↓
Node.js REST API
        ↓
Nginx Reverse Proxy
        ↓
HTTPS Public API
        ↓
Android Revision App
```

---

# Repository Structure

```text
Notes_Project/
│
├── parser.py
├── notebook_config.json
├── .env
├── db.log
│
├── jupyter_notes_api/
│   ├── server.js
│   ├── package.json
│   ├── package-lock.json
│   └── node_modules/
│
└── .git/
```

---

# DSA Problem Format

Only markdown cells matching this format are counted for DSA statistics.

```markdown
## 863. All Nodes Distance K in Binary Tree ##
*(Medium)*
[Problem Link](https://leetcode.com/problems/all-nodes-distance-k-in-binary-tree/)

### Logic ###
...

### Code ###
...
```

---

# MongoDB Collections

## notes_live

Stores parsed notebook markdown cells.

Example:

```json
{
  "tag": "DSA",
  "file_name": "2026_May.ipynb",
  "cell_index": 45,
  "content": "## Problem ##",
  "updated_at": "2026-05-24T00:00:00Z"
}
```

---

## stats

Stores aggregate DSA difficulty statistics.

Example:

```json
{
  "easy": 23,
  "medium": 72,
  "hard": 8,
  "total": 103
}
```

---

## problem_list

Stores a single document containing all DSA problem titles.

Example:

```json
{
  "tag": "DSA",
  "total": 99,
  "questions": [
    "560. Subarray Sum Equals K",
    "118. Pascal's Triangle"
  ]
}
```

---

# Local Setup

## 1. Clone Repository

```bash
git clone <repo-url>
cd Notes_Project
```

---

## 2. Python Dependencies

Install required Python packages:

```bash
pip3 install pymongo python-dotenv nbformat markdown
```

---

## 3. Create Environment File

Create `.env` in project root:

```env
MONGO_URI=your_mongodb_connection_string
```

---

## 4. Configure Notebook Folders

Edit:

```text
notebook_config.json
```

Example:

```json
[
  {
    "folder_path": "/home/ubuntu/DSA",
    "tag": "DSA"
  },
  {
    "folder_path": "/home/ubuntu/SystemDesign",
    "tag": "SystemDesign"
  }
]
```

---

## 5. Run Parser

```bash
python3 parser.py
```

This:

* parses notebooks
* refreshes MongoDB collections
* updates DSA stats
* updates problem list

---

## 6. Start API Server

```bash
cd jupyter_notes_api
npm install
node server.js
```

Server runs locally on:

```text
http://localhost:3000
```

---

# Production Setup

## PM2

Start API server:

```bash
pm2 start server.js --name jupyter-notes-api
```

Restart:

```bash
pm2 restart jupyter-notes-api
```

Logs:

```bash
pm2 logs jupyter-notes-api
```

---

## Cron Job

Run parser daily at 1 AM:

```bash
crontab -e
```

Example:

```cron
0 1 * * * cd /home/ubuntu/Notes_Project && /usr/bin/python3 parser.py >> db.log 2>&1
```

---

# Nginx Reverse Proxy

Example Nginx configuration:

```nginx
location /jupyter-notes/ {

    proxy_pass http://localhost:3000/;

    proxy_http_version 1.1;

    proxy_set_header Upgrade $http_upgrade;

    proxy_set_header Connection "upgrade";

    proxy_set_header Host $host;
}
```

---

# HTTPS Setup

Configured using Certbot:

```bash
sudo certbot --nginx -d api.amitsinghrana.com
```

---

# Static Assets Hosting

Nginx can also serve:

* PDFs
* APKs
* Images
* Documents

Example:

```text
https://api.amitsinghrana.com/static/
```

---

# API Endpoints

## Health Check

```http
GET /jupyter-notes/health
```

---

## Random Notes

```http
GET /jupyter-notes/random?count=3
```

---

## Random Notes By Tag

```http
GET /jupyter-notes/random?tag=DSA&count=5
```

---

## Sequential Notes From File

```http
GET /jupyter-notes/specific?file=2026_May.ipynb&pattern=specific&startIdx=4&count=5
```

---

## Random Notes From File

```http
GET /jupyter-notes/specific?file=2026_May.ipynb&pattern=random&count=3
```

---

## List Tags

```http
GET /jupyter-notes/tags
```

---

## List Files By Tag

```http
GET /jupyter-notes/files?tag=DSA
```

---

## DSA Statistics

```http
GET /jupyter-notes/stats
```

---

## DSA Problem List

```http
GET /jupyter-notes/problemList
```

---

# Example Public API

```text
https://api.amitsinghrana.com/jupyter-notes/random?count=3
```

---

# Future Improvements

* full-text search
* semantic search
* AI explanations
* spaced repetition
* weak-topic tracking
* offline Android sync
* authentication
* markdown rendering improvements
* vector embeddings for retrieval

---

# License

Personal project / experimental knowledge pipeline.
