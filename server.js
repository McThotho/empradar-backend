const express = require("express");
const Database = require("better-sqlite3");
const cors = require("cors");
const bcrypt = require("bcrypt");

const app = express();
const PORT = 3001;
const DB_PATH = "./tasks.db";

// Middleware
app.use(cors());
app.use(express.json());

// Connect to SQLite DB
const db = new Database(DB_PATH);
console.log("✅ Connected to SQLite database.");

// Create tables (if not exists)
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL
  )
`).run();

db.prepare(`
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
`).run();

// 🚀 GET TASKS
app.get("/api/tasks", (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM tasks").all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🚀 CREATE TASK
app.post("/api/tasks", (req, res) => {
  const { task, measure, target, unit, assignedTo, assignedBy, status } = req.body;
  const assignedTime = new Date().toISOString();
  try {
    const stmt = db.prepare(`
      INSERT INTO tasks (task, measure, target, unit, assignedTo, assignedBy, assignedTime, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(task, measure, target, unit, assignedTo, assignedBy, assignedTime, status);
    res.json({ id: result.lastInsertRowid, assignedTime, ...req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🚀 UPDATE TASK
app.put("/api/tasks/:id", (req, res) => {
  const { task, measure, target, unit, assignedTo, status, assignedBy, assignedTime } = req.body;
  try {
    const stmt = db.prepare(`
      UPDATE tasks SET
        task = ?, measure = ?, target = ?, unit = ?, assignedTo = ?, status = ?, assignedBy = ?, assignedTime = ?
      WHERE id = ?
    `);
    stmt.run(task, measure, target, unit, assignedTo, status, assignedBy, assignedTime, req.params.id);
    res.json({ id: parseInt(req.params.id), task, measure, target, unit, assignedTo, status, assignedBy, assignedTime });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🚀 DELETE TASK
app.delete("/api/tasks/:id", (req, res) => {
  try {
    db.prepare("DELETE FROM tasks WHERE id = ?").run(req.params.id);
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🚀 LOGIN
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    res.json({ id: user.id, username: user.username, role: user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🚀 REGISTER (Optional)
app.post("/api/register", async (req, res) => {
  const { username, password, role } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const stmt = db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)");
    const result = stmt.run(username, hashed, role);
    res.json({ id: result.lastInsertRowid, username, role });
  } catch (err) {
    res.status(400).json({ error: "Username already exists" });
  }
});

// START SERVER
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
