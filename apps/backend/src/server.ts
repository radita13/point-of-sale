import app from './app.js';

const PORT = Number(process.env.PORT ?? 4000);

app.listen(PORT, () => {
  console.log(`[point-of-sale] API berjalan di http://localhost:${PORT}`);
});
