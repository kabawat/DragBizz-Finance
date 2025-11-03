require('module-alias/register');
const server = require('@src/app');
const { connectDB } = require('@config/database.config');
const SECRET = require('@config/env.config');

async function startServer() {
  server?.listen(SECRET.server.port, async () => {
    try {
      await connectDB();
      console.log('Database connected');
    } catch (err) {
      console.error('DB connection error:', err.message);
      process.exit(1);
    }
    console.log(`Subscription service running at http://localhost:${SECRET.server.port}/health`);
  });
}

startServer().catch((e) => {
  console.error('Error starting subscription service:', e);
  process.exit(1);
});

