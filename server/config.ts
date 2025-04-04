import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Validate required environment variables
const requiredEnvVars = ['GOOGLE_SHEETS_ID', 'GOOGLE_SERVICE_ACCOUNT', 'SESSION_SECRET'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const config = {
  googleSheetsId: process.env.GOOGLE_SHEETS_ID,
  googleServiceAccount: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT || '{}'),
  sessionSecret: process.env.SESSION_SECRET,
  nodeEnv: process.env.NODE_ENV || 'development'
};