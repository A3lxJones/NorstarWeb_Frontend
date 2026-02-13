import app from './app';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`⛸  Norstar Inline Hockey — Server running at http://localhost:${PORT}`);
});
