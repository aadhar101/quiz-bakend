require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const pool = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Root endpoint
app.get("/", (req, res) => {
  res.send("🚀 Quiz API is running...");
});

// User Registration
app.post("/api/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: "Username, email, and password are required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email",
      [username, email, hashedPassword]
    );

    res.status(201).json({ message: "User registered successfully", user: result.rows[0] });
  } catch (error) {
    console.error("Registration Error:", error.message);
    res.status(500).json({ error: "Server error during registration" });
  }
});

// User Login
app.post("/api/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: "Username/Email and password are required" });
    }

    const user = await pool.query("SELECT * FROM users WHERE username = $1 OR email = $1", [identifier]);
    if (user.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(password, user.rows[0].password);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    res.json({ message: "Login successful", user: { id: user.rows[0].id, username: user.rows[0].username, email: user.rows[0].email } });
  } catch (error) {
    console.error("Login Error:", error.message);
    res.status(500).json({ error: "Server error during login" });
  }
});
app.post("/api/quizzes", async (req, res) => {
    console.log(req.body); // Log the incoming request body
    try {
      const { question, options, correctAnswer } = req.body;
      if (!question || !options || !correctAnswer) {
        return res.status(400).json({ error: "Question, options, and correctAnswer are required" });
      }
  
      const result = await pool.query(
        "INSERT INTO quizzes (question, options, correct_answer) VALUES ($1, $2, $3) RETURNING *",
        [question, options, correctAnswer]
      );
  
      res.status(201).json({ message: "Quiz created successfully", quiz: result.rows[0] });
    } catch (error) {
      console.error("Quiz Creation Error:", error.message);
      res.status(500).json({ error: "Server error during quiz creation" });
    }
  });
// Fetch all quizzes
app.get("/api/quizzes", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM quizzes");
    res.json(rows);
  } catch (error) {
    console.error("Fetch Quizzes Error:", error.message);
    res.status(500).json({ error: "Server error during fetching quizzes" });
  }
});

app.post("/api/quizzes/submit", async (req, res) => {
  try {
    const { quizId, answer } = req.body;
    if (!quizId || !answer) {
      return res.status(400).json({ error: "Quiz ID and answer are required" });
    }

    const quiz = await pool.query("SELECT * FROM quizzes WHERE id = $1", [quizId]);
    if (quiz.rows.length === 0) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    const isCorrect = quiz.rows[0].correct_answer === answer;
    res.json({ isCorrect, correctAnswer: quiz.rows[0].correct_answer });
  } catch (error) {
    console.error("Quiz Submission Error:", error.message);
    res.status(500).json({ error: "Server error during quiz submission" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});