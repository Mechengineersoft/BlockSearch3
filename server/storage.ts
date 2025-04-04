import { users, type User, type InsertUser } from "@shared/schema";
import session from "express-session";
import FileStore from "session-file-store";
import { createClient } from "redis";
import { getUserByUsername, getUser, createUser } from "./google-sheets";
import { google } from "googleapis";
import { config } from './config';

const FileStoreSession = FileStore(session);
const sheets = google.sheets({ version: 'v4', auth: new google.auth.GoogleAuth({
  credentials: config.googleServiceAccount,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
})});
const SHEET_ID = config.googleSheetsId;

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>
  getUserByEmail(email: string): Promise<User | undefined>
  updateUserPassword(userId: number, newPassword: string): Promise<void>;
  createUser(user: InsertUser): Promise<User>;
  sessionStore: session.Store;
}

export class GoogleSheetsStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    if (config.nodeEnv === 'production') {
      const redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
      redisClient.connect().catch(console.error);
      // Import RedisStore dynamically to fix ESM compatibility
      import('connect-redis').then((module) => {
        const RedisStore = module.default;
        this.sessionStore = new RedisStore({
          client: redisClient,
          ttl: 30 * 24 * 60 * 60 // 30 days
        });
      }).catch(console.error);
    } else {
      this.sessionStore = new FileStoreSession({
        path: './sessions',
        ttl: 30 * 24 * 60 * 60, // 30 days
        retries: 1,
        reapInterval: 3600 // Clean expired sessions hourly
      });
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    return await getUser(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return await getUserByUsername(username);
  }

  async getAllUsers(): Promise<User[]> {
    try {
      const range = "User!A2:C";
      const response = await getUser(1); // Just to reuse the sheets instance
      const values = response ? [response] : [];
      return values.map(user => ({
        id: user.id,
        username: user.username,
        password: user.password
      }));
    } catch (error) {
      console.error('Error in getAllUsers:', error);
      return [];
    }
  }

  async updateSheet(users: User[]): Promise<void> {
    try {
      const range = "User!A2:C";
      const values = users.map(user => [user.id, user.username, user.password]);
      
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range,
        valueInputOption: "RAW",
        requestBody: {
          values
        }
      });
    } catch (error) {
      console.error('Error in updateSheet:', error);
      throw new Error('Failed to update user data');
    }
  }
  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const range = "User!A2:D";
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range,
      });
      const values = response.data.values || [];
      const userRow = values.find(row => row[3]?.toString().toLowerCase() === email.toLowerCase());
      
      if (!userRow) return undefined;
      
      return {
        id: parseInt(userRow[0]),
        username: userRow[1],
        password: userRow[2],
        email: userRow[3]
      };
    } catch (error) {
      console.error('Error in getUserByEmail:', error);
      return undefined;
    }
  }

  async updateUserPassword(userId: number, newPassword: string): Promise<void> {
    try {
      const range = "User!A2:D";
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range,
      });
      const values = response.data.values || [];
      const userIndex = values.findIndex(row => parseInt(row[0]) === userId);
      
      if (userIndex === -1) throw new Error('User not found');
      
      // Create a new row array with updated password while preserving other data
      const updatedRow = [...values[userIndex]];
      // Ensure we're updating the password column while preserving other data
      const passwordColumnIndex = 2; // Password is in column C (index 2)
      updatedRow[passwordColumnIndex] = newPassword;
      
      // Update the specific row in the sheet
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `User!A${userIndex + 2}:D${userIndex + 2}`,
        valueInputOption: "RAW",
        requestBody: {
          values: [updatedRow]
        }
      });
    } catch (error) {
      console.error('Error in updateUserPassword:', error);
      throw new Error('Failed to update user password');
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    return await createUser(user);
  }
}

export const storage = new GoogleSheetsStorage();