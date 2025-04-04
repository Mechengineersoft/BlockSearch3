import { google } from "googleapis";
import { SearchResult, InsertUser, User } from "@shared/schema";
import { config } from './config';

const auth = new google.auth.GoogleAuth({
  credentials: config.googleServiceAccount,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SHEET_ID = config.googleSheetsId;

export async function searchSheetData(blockNo: string, partNo?: string, thickness?: string): Promise<SearchResult[]> {
  try {
    console.log('Starting search with params:', { blockNo, partNo, thickness });

    // Specify the exact range in the "Data" tab
    const range = "Data!A2:W"; // Columns A through W (23 columns), starting from row 2
    console.log('Fetching from range:', range);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range,
    });

    if (!response.data.values) {
      console.log('No data found in sheet');
      return [];
    }

    console.log(`Found ${response.data.values.length} rows in sheet`);

    // First, map the rows to full SearchResult objects
    const fullResults = response.data.values
      .filter(row => {
        if (!row[0]) {
          console.log('Skipping row with no block number');
          return false;
        }

        const rowBlockNo = row[0].toString().toLowerCase();
        const rowPartNo = row[1]?.toString().toLowerCase() || '';
        const rowThickness = row[2]?.toString().toLowerCase() || '';

        const matchesBlock = rowBlockNo === blockNo.toLowerCase();
        const matchesPart = !partNo || rowPartNo === partNo.toLowerCase();
        const matchesThickness = !thickness || rowThickness === thickness.toLowerCase();

        const matches = matchesBlock && matchesPart && matchesThickness;
        if (matches) {
          console.log('Found matching row:', row);
        }

        return matches;
      })
      .map((row): SearchResult => ({
        blockNo: row[0],
        partNo: row[1] || '',
        thickness: row[2] || '',
        nos: row[3] || '',
        grinding: row[4] || '',
        netting: row[5] || '',
        epoxy: row[6] || '',
        polished: row[7] || '',
        leather: row[8] || '',
        lapotra: row[9] || '',
        honed: row[10] || '',
        shot: row[11] || '',
        polR: row[12] || '',
        bal: row[13] || '',
        bSP: row[14] || '',
        edge: row[15] || '',
        meas: row[16] || '',
        lCm: row[17] || '',
        hCm: row[18] || '',
        status: row[19] || '',
        date: row[20] || '',
        color1: row[21] || '',
        color2: row[22] || ''
      }));

    // Identify columns that have data in at least one result
    const columnsWithData = new Set<string>();
    
    // Always include these essential columns regardless of data
    columnsWithData.add('blockNo');
    columnsWithData.add('partNo');
    columnsWithData.add('thickness');
    
    // Check each result to find columns with data
    fullResults.forEach(result => {
      Object.entries(result).forEach(([key, value]) => {
        if (value && value.trim() !== '') {
          columnsWithData.add(key);
        }
      });
    });
    
    console.log('Columns with data:', Array.from(columnsWithData));
    
    // Filter each result to only include columns with data
    const results = fullResults.map(result => {
      const filteredResult: Partial<SearchResult> = {};
      
      columnsWithData.forEach(column => {
        filteredResult[column as keyof SearchResult] = result[column as keyof SearchResult];
      });
      
      return filteredResult as SearchResult;
    });

    console.log(`Returning ${results.length} results with ${columnsWithData.size} columns`);
    return results;
  } catch (error) {
    console.error('Error in searchSheetData:', error);
    throw error;
  }
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
  try {
    const range = "User!A2:C";
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range,
    });

    const values = response.data.values || [];
    const userRow = values.find((row) => row[1]?.toString().toLowerCase() === username.toLowerCase());

    if (!userRow) return undefined;

    return {
      id: parseInt(userRow[0]),
      username: userRow[1],
      password: userRow[2]
    };
  } catch (error) {
    console.error('Error in getUserByUsername:', error);
    return undefined;
  }
}

export async function getUser(id: number): Promise<User | undefined> {
  try {
    const range = "User!A2:C";
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range,
    });

    const values = response.data.values || [];
    const userRow = values.find((row) => parseInt(row[0]) === id);

    if (!userRow) return undefined;

    return {
      id: parseInt(userRow[0]),
      username: userRow[1],
      password: userRow[2]
    };
  } catch (error) {
    console.error('Error in getUser:', error);
    return undefined;
  }
}

export async function createUser(user: InsertUser): Promise<User> {
  try {
    // Check if username already exists
    const range = "User!A2:C";
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range,
    });

    const values = response.data.values || [];
    const existingUsername = values.find((row) => row[1]?.toString().toLowerCase() === user.username.toLowerCase());

    if (existingUsername) {
      throw new Error('Username already taken');
    }

    // First, check if the User sheet exists and create it if it doesn't
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SHEET_ID
    });

    const userSheet = spreadsheet.data.sheets?.find(
      sheet => sheet.properties?.title === 'User'
    );

    if (!userSheet) {
      // Create User sheet with headers
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: 'User',
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 3
                }
              }
            }
          }]
        }
      });

      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: 'User!A1:D1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [['ID', 'Username', 'Password', 'Email']]
        }
      });
    }

    // Get current users to determine next ID
    const userRange = "User!A2:C";
    const userResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: userRange,
    });

    const userValues = userResponse.data.values || [];
    const newId = userValues.length > 0 
      ? Math.max(...userValues.map(row => parseInt(row[0] || '0'))) + 1 
      : 1;

    const newUser: User = {
      id: newId,
      username: user.username,
      password: user.password
    };

    // Append new user
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "User!A:D",
      valueInputOption: "RAW",
      requestBody: {
        values: [[newUser.id, newUser.username, newUser.password, user.email]]
      }
    });

    return newUser;
  } catch (error) {
    console.error('Error in createUser:', error);
    throw new Error('Failed to create user');
  }
}
