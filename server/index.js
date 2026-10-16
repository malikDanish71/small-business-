require('dotenv').config();

const { createApp } = require('./app');
const { openDatabase } = require('./database');

const database = openDatabase(process.env.DATABASE_PATH || undefined);
const app = createApp(database);
const port = Number(process.env.PORT) || 3000;

const server = app.listen(port, () => {
  console.log(`SmartB2B is running at http://localhost:${port}`);
});

function shutdown() {
  server.close(() => {
    database.close();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
