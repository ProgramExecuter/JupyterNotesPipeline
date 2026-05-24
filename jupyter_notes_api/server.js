require("dotenv").config({ path: "../.env" });
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { MongoClient } = require("mongodb");

const app = express();


// ========================================
// Config
// ========================================

const PORT = process.env.PORT || 3000;

const MONGO_URI = process.env.MONGO_URI;


// ========================================
// Middleware
// ========================================

app.use(cors());
app.use(helmet());
app.use(morgan("combined"));
app.use(express.json());


// ========================================
// Rate Limiting
// ========================================

const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100
});

app.use(limiter);


// ========================================
// MongoDB
// ========================================

const client = new MongoClient(MONGO_URI);

let collection;
let statsCollection;
let problemListCollection;

// ========================================
// Connect DB
// ========================================

async function connectDB() {
    await client.connect();
    console.log("MongoDB Connected");
    const db = client.db("jupyter_notes_db");
    collection = db.collection("notes_live");
    statsCollection = db.collection("stats");
    problemListCollection = db.collection("problem_list");
}


// ========================================
// Health Route
// ========================================

app.get("/health", (req, res) => {
    res.json({
        status: "ok"
    });
});


// ========================================
// Get Random Notes
// ========================================

app.get("/random", async (req, res) => {
    try {
        let count =
            parseInt(req.query.count || "1");

        const tag = req.query.tag;

        // validation
        if (isNaN(count)) {
            count = 1;
        }

        count = Math.max(1, count);
        count = Math.min(100, count);

        let pipeline = [];

        // optional tag filter
        if (tag) {
            pipeline.push({
                $match: { tag }
            });
        }

        // random sampling
        pipeline.push({
            $sample: { size: count }
        });

        // remove unwanted fields
        pipeline.push({
            $project: {
                _id: 0,
                tag: 1,
                file_name: 1,
                file_path: 1,
                cell_index: 1,
                content: 1,
                html: 1,
                updated_at: 1
            }
        });

        const notes =
            await collection
                .aggregate(pipeline)
                .toArray();

        res.json({
            count: notes.length,
            notes
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: "Internal server error"
        });
    }
});


// ========================================
// Get All Tags
// ========================================

app.get("/specific", async (req, res) => {
    try {
        const file = req.query.file;
        const pattern = req.query.pattern || "specific";
        const startIdx = parseInt(req.query.startIdx || "0");

        const count =
            Math.min(
                parseInt(req.query.count || "1"),
                100
            );

        if (!file) {

            return res.status(400).json({
                error: "file query parameter required"
            });
        }

        // ==========================================
        // RANDOM PATTERN
        // ==========================================

        if (pattern === "random") {

            const notes =
                await collection.aggregate([
                    {
                        $match: {
                            file_name: file
                        }
                    },
                    {
                        $sample: {
                            size: count
                        }
                    },
                    {
                        $project: {
                            _id: 0
                        }
                    }
                ]).toArray();

            return res.json({
                pattern,
                file,
                count: notes.length,
                notes
            });
        }

        // ==========================================
        // SPECIFIC PATTERN
        // ==========================================

        const notes =
            await collection.find(
                {
                    file_name: file,
                    cell_index: {
                        $gte: startIdx
                    }
                },
                {
                    projection: {
                        _id: 0
                    }
                }
            )
            .sort({
                cell_index: 1
            })
            .limit(count)
            .toArray();

        res.json({
            pattern,
            file,
            startIdx,
            count: notes.length,
            notes
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: "Internal server error"
        });
    }
});


// ========================================
// Get All Files List by selected Tag
// ========================================

app.get("/files", async (req, res) => {
    try {
        const tag = req.query.tag;
        let matchStage = {};

        // Optional tag filter
        if (tag) {
            matchStage.tag = tag;
        }

        const files =
            await collection.aggregate([
                {
                    $match: matchStage
                },
                {
                    $group: {
                        _id: "$file_name",
                        tag: {
                            $first: "$tag"
                        },
                        total_notes: {
                            $sum: 1
                        },
                        last_updated: {
                            $max: "$updated_at"
                        }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        file_name: "$_id",
                        tag: 1,
                        total_notes: 1,
                        last_updated: 1
                    }
                },
                {
                    $sort: {
                        file_name: 1
                    }
                }

            ]).toArray();

        res.json({
            count: files.length,
            files
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: "Internal server error"
        });
    }
});


// ========================================
// Get All Tags
// ========================================

app.get("/tags", async (req, res) => {
    try {
        const tags =
            await collection.distinct("tag");

        res.json(tags);

    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: "Internal server error"
        });
    }
});


// ========================================
// Get Stats
// ========================================

app.get("/stats", async (req, res) => {
    try {
        const stats =
            await statsCollection.findOne(
                {},
                {
                    projection: {
                        _id: 0
                    }
                }
            );
        res.json(stats);
    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: "Internal server error"
        });
    }
});


// ========================================
// Get All Problems List
// ========================================

app.get("/problemList", async (req, res) => {
    try {
        const data =
            await problemListCollection
                .findOne(
                    {},
                    {
                        projection: {
                            _id: 0
                        }
                    }
                );

        res.json(data);

    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: "Internal server error"
        });
    }
});


// ========================================
// Start Server
// ========================================

connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(
                `Server running on port ${PORT}`
            );
        });
    })
    .catch((err) => {
        console.error(
            "Failed to connect DB"
        );
        console.error(err);
    });
