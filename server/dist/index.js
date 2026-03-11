"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const jose_1 = require("jose");
const profile_1 = __importDefault(require("./routes/profile"));
const plan_1 = __importDefault(require("./routes/plan"));
const workouts_1 = __importDefault(require("./routes/workouts"));
const meals_1 = __importDefault(require("./routes/meals"));
const report_1 = __importDefault(require("./routes/report"));
// Guard: NEON_AUTH_URL must be set in production; warn loudly if absent in dev too
if (process.env.NODE_ENV === "production" && !process.env.NEON_AUTH_URL) {
    console.error("FATAL: NEON_AUTH_URL is not set in production. Exiting.");
    process.exit(1);
}
else if (!process.env.NEON_AUTH_URL) {
    console.warn("WARNING: NEON_AUTH_URL is not set. All requests will be unauthenticated (401 on protected routes).");
}
const app = (0, express_1.default)();
// trust proxy: false = Node is exposed directly (no Nginx/reverse proxy).
// If a proxy is added in front, change to: app.set("trust proxy", 1)
// and configure the proxy to set X-Forwarded-For correctly.
// Without this, rate limiting would use proxy IP (rate-limit entire user base as one).
app.set("trust proxy", false);
const PORT = process.env.PORT || 3001;
const NEON_AUTH_URL = process.env.NEON_AUTH_URL;
// Build JWKS verifier from Neon Auth public keys
const JWKS = NEON_AUTH_URL
    ? (0, jose_1.createRemoteJWKSet)(new URL(`${NEON_AUTH_URL}/.well-known/jwks.json`))
    : null;
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        useDefaults: true,
        directives: {
            "script-src": ["'self'"],
            "style-src": ["'self'", "'unsafe-inline'"],
            "img-src": ["'self'", "data:", "https:"],
            "connect-src": ["'self'", ...(process.env.NEON_AUTH_URL ? [process.env.NEON_AUTH_URL] : [])],
            "frame-ancestors": ["'none'"],
        },
    },
    strictTransportSecurity: {
        maxAge: 31536000,
        includeSubDomains: true,
    },
    frameguard: { action: "deny" },
}));
// Global rate limit: 200 requests per 15 minutes per IP
const globalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    limit: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
});
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173").split(",").map(o => o.trim());
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (server-to-server, curl in dev)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(globalLimiter);
app.use(express_1.default.json({ limit: "16kb" }));
app.use((0, cookie_parser_1.default)());
// Middleware: verify Neon Auth JWT and attach userId to request
app.use(async (req, _res, next) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token || !JWKS) {
        next();
        return;
    }
    try {
        const { payload } = await (0, jose_1.jwtVerify)(token, JWKS);
        const userId = (payload.sub ?? payload.userId);
        if (userId) {
            req.userId = userId;
        }
    }
    catch {
        // Invalid/expired token — routes will return 401
    }
    next();
});
app.use("/api/profile", profile_1.default);
app.use("/api/plan", plan_1.default);
app.use("/api/workouts", workouts_1.default);
app.use("/api/meals", meals_1.default);
app.use("/api/report", report_1.default);
app.get("/health", (_req, res) => res.json({ ok: true }));
// Global error handler — catches errors passed via next(err) from all routes.
// Must be last middleware with exactly 4 params.
app.use((err, _req, res, _next) => {
    const isProd = process.env.NODE_ENV === "production";
    console.error("[error]", err.message, isProd ? undefined : err.stack);
    res.status(500).json({
        error: isProd ? "Internal server error" : err.message,
    });
});
const certPath = process.env.TLS_CERT_PATH;
const keyPath = process.env.TLS_KEY_PATH;
if (certPath && keyPath) {
    // Production: HTTPS mode
    let credentials;
    try {
        credentials = { cert: fs_1.default.readFileSync(certPath), key: fs_1.default.readFileSync(keyPath) };
    }
    catch (err) {
        console.error("[fatal] Cannot read TLS certificate files:", err.message);
        process.exit(1);
    }
    https_1.default.createServer(credentials, app).listen(PORT, () => {
        console.log(`Server running on https://0.0.0.0:${PORT}`);
    });
    // HTTP → HTTPS redirect on port 80
    const redirectApp = (0, express_1.default)();
    redirectApp.use((_req, res) => {
        const host = process.env.PUBLIC_DOMAIN ?? _req.headers.host;
        res.redirect(301, `https://${host}${_req.url}`);
    });
    http_1.default.createServer(redirectApp).listen(80, () => {
        console.log("HTTP → HTTPS redirect active on port 80");
    });
}
else {
    // Development: HTTP mode
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}
