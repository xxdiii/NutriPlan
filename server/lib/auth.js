import jwt from 'jsonwebtoken';

import { isProduction } from './config.js';

// Tokens signed with a guessable secret could be forged, so production refuses to start without one.
if (isProduction && !process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be set in production.');
}
export const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret';

// Middleware: Authenticate Token
export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

/** Parse a JSON column, falling back when it is empty or malformed. */
export const parseJson = (value, fallback) => {
    if (value === null || value === undefined || value === '') return fallback;
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
};
