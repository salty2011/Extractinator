// Authentication utilities for Extractinator backend
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getConfig } from './config.js';

const JWT_SECRET = process.env.JWT_SECRET || 'extractinator_secret';
const JWT_EXPIRY = '30m'; // 30 minutes

async function verifyCredentials(username, password) {
  const config = await getConfig();
  if (username !== config.username) return false;
  return bcrypt.compare(password, config.passwordHash);
}

function issueJWT(username) {
  return jwt.sign({ username }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

function verifyJWT(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

export { verifyCredentials, issueJWT, verifyJWT };
