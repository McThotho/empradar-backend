const express = require("express");
const Database = require("better-sqlite3");
const cors = require("cors");
const bcrypt = require("bcrypt");

const app = express();
const PORT = 3001;
const DB_PATH = "./tasks.db";

app.use(cors());
app.use(express.json());

let db;
try {
  db = new Database(DB_PATH);
  console.log("✅ Connected to SQLite database.");
} catch (err) {
  console.error("❌ Failed to connect to database:", err.message);
}


// Create users table if not exists
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL
  )
`);

// Create tasks table if not exists
db.run(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task TEXT,
    measure TEXT,
    target INTEGER,
    unit TEXT,
    assignedTo TEXT,
    status TEXT,
    assignedBy TEXT,
    assignedTime TEXT
  )
`);

// 🚀 GET ALL TASKS
app.get("/api/tasks", (req, res) => {
  db.all("SELECT * FROM tasks", (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// 🚀 CREATE TASK
app.post("/api/tasks", (req, res) => {
  const { task, measure, target, unit, assignedTo, assignedBy, status } = req.body;
  const assignedTime = new Date().toISOString();

  // Debugging logs
  console.log("🟢 Received new task:", {
    task, measure, target, unit, assignedTo, assignedBy, assignedTime, status
  });

  // Check for missing required fields
  if (!task || !measure || !unit || !assignedTo || !assignedBy || !status) {
    console.error("❌ Missing required fields in task creation");
    return res.status(400).json({ error: "Missing required fields" });
  }

  const sql = `INSERT INTO tasks (task, measure, target, unit, assignedTo, assignedBy, assignedTime, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  const values = [task, measure, target, unit, assignedTo, assignedBy, assignedTime, status];

  db.run(sql, values, function (err) {
    if (err) {
      console.error("❌ Insert error:", err.message);
      return res.status(500).send("Failed to create task");
    }
    res.json({ id: this.lastID, assignedTime, ...req.body });
  });
});

// 🚀 UPDATE TASK
app.put("/api/tasks/:id", (req, res) => {
  const {
    task,
    measure,
    target,
    unit,
    assignedTo,
    status,
    assignedBy,
    assignedTime
  } = req.body;

  const sql = `
    UPDATE tasks
    SET task = ?, measure = ?, target = ?, unit = ?, assignedTo = ?, status = ?, assignedBy = ?, assignedTime = ?
    WHERE id = ?
  `;
  const params = [task, measure, target, unit, assignedTo, status, assignedBy, assignedTime, req.params.id];

  db.run(sql, params, function (err) {
    if (err) {
      console.error("❌ SQL UPDATE error:", err.message);
      res.status(500).json({ error: err.message });
    } else {
      res.json({
        id: parseInt(req.params.id),
        task,
        measure,
        target,
        unit,
        assignedTo,
        status,
        assignedBy,
        assignedTime
      });
    }
  });
});

// 🚀 DELETE TASK
app.delete("/api/tasks/:id", (req, res) => {
  db.run("DELETE FROM tasks WHERE id = ?", req.params.id, function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ deleted: true });
    }
  });
});

// 🚀 LOGIN
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    res.json({ id: user.id, username: user.username, role: user.role });
  });
});

// 🚀 REGISTER (Optional)
app.post("/api/register", async (req, res) => {
  const { username, password, role } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  db.run(
    "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
    [username, hashed, role],
    function (err) {
      if (err) {
        res.status(400).json({ error: "Username already exists" });
      } else {
        res.json({ id: this.lastID, username, role });
      }
    }
  );
});

// 🚀 START SERVER
app.listen(PORT, () => {
  console.log(`✅ Server with users running at http://localhost:${PORT}`);
});
