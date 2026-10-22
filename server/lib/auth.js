import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';

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
