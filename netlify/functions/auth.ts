import { Handler } from '@netlify/functions'
import jwt from 'jsonwebtoken'
import { google } from 'googleapis'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// Initialize Google Sheets client
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT || '{}'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
})

const sheets = google.sheets({ version: 'v4', auth })
const SHEET_ID = process.env.GOOGLE_SHEETS_ID

async function getUserByUsername(username: string) {
  try {
    const range = "User!A2:D"
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range,
    })

    const values = response.data.values || []
    const userRow = values.find((row) => row[1]?.toString().toLowerCase() === username.toLowerCase())

    if (!userRow) return undefined

    return {
      id: parseInt(userRow[0]),
      username: userRow[1],
      password: userRow[2],
      email: userRow[3]
    }
  } catch (error) {
    console.error('Error in getUserByUsername:', error)
    return undefined
  }
}

const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  try {
    const { username, password } = JSON.parse(event.body || '{}')

    if (!username || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Username and password are required' }),
      }
    }

    // Get user from Google Sheets
    const user = await getUserByUsername(username)

    if (!user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid credentials' }),
      }
    }

    // Verify password (direct comparison since we're using plain text in sheets)
    if (password !== user.password) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid credentials' }),
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id,
        username: user.username,
        email: user.email
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    )

    return {
      statusCode: 200,
      body: JSON.stringify({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      }),
    }
  } catch (error) {
    console.error('Auth error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    }
  }
}

export { handler }