// Vercel serverless entry point.
//
// Vercel's Node runtime detects an exported Express app and wraps it as a
// serverless function. `npm run build` (configured in vercel.json) compiles
// src/ into dist/ first, so this simply re-exports the built app.
//
// The listen() call lives in src/server.ts, which Vercel never runs — locally
// you still use `npm run dev` / `npm start`.
const app = require('../dist/app').default;

module.exports = app;
