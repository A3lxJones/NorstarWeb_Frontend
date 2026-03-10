import app from './app';

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
    console.warn(`⛸  Norstar Inline Hockey — Server running at http://localhost:${PORT}`);
});
