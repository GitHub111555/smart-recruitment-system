 
// auth/authServer.js
const express    = require('express');
const bodyParser = require('body-parser');
const cors       = require('cors');
const jwt        = require('jsonwebtoken');
const USERS      = require('./users');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = USERS.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  const token = jwt.sign({ username }, 'your-secret-key', { expiresIn: '1h' });
  res.json({ token });
});

app.listen(PORT, () => {
  console.log(`🔐 Auth Server running on http://localhost:${PORT}`);
});
