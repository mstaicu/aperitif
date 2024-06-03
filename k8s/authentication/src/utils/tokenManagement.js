const express = require("express");
const redis = require("redis");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

const app = express();
const redisClient = redis.createClient({
  host: "your-redis-host",
  port: 6379,
  password: "your-strong-password",
});

const JWT_SECRET = "your_jwt_secret";
const ACCESS_TOKEN_EXPIRY = 900; // 15 minutes in seconds
const REFRESH_TOKEN_EXPIRY = 604800; // 7 days in seconds

app.use(express.json());

redisClient.on("error", (err) => {
  console.error("Redis error: ", err);
});

// Issue tokens
function issueTokens(user) {
  const accessToken = jwt.sign({ id: user.id }, JWT_SECRET, {
    expiresIn: "15m",
  });
  const refreshToken = uuidv4(); // Use a UUID for the refresh token

  redisClient.setex(
    `access_token:${user.id}:${accessToken}`,
    ACCESS_TOKEN_EXPIRY,
    accessToken
  );
  redisClient.setex(
    `refresh_token:${user.id}:${refreshToken}`,
    REFRESH_TOKEN_EXPIRY,
    refreshToken
  );

  return { accessToken, refreshToken };
}

// Middleware to authenticate access token
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);

    const tokenKey = `access_token:${user.id}:${token}`;
    redisClient.get(tokenKey, (err, data) => {
      if (err) return res.status(500).send("Internal Server Error");
      if (!data) return res.sendStatus(403);

      req.user = user;
      next();
    });
  });
}

// Route to login and issue tokens
app.post("/login", (req, res) => {
  const user = { id: req.body.id }; // Authenticate user here
  const tokens = issueTokens(user);
  res.json(tokens);
});

// Route to refresh tokens
app.post("/refresh", (req, res) => {
  const { userId, refreshToken } = req.body;

  const refreshTokenKey = `refresh_token:${userId}:${refreshToken}`;
  redisClient.get(refreshTokenKey, (err, data) => {
    if (err) return res.status(500).send("Internal Server Error");
    if (!data) return res.sendStatus(403); // Invalid refresh token

    const newTokens = issueTokens({ id: userId });
    res.json(newTokens);
  });
});

// Protected route
app.get("/protected", authenticateToken, (req, res) => {
  res.send("Protected content");
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
