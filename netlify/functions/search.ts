import { Handler } from '@netlify/functions'
import { google } from 'googleapis'
import { SearchResult } from '../../../shared/schema'

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT || '{}'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
})

const sheets = google.sheets({ version: 'v4', auth })
const SHEET_ID = process.env.GOOGLE_SHEETS_ID

const handler: Handler = async (event, context) => {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed',
    }
  }

  // Parse query parameters
  const params = event.queryStringParameters
  const blockNo = params?.blockNo
  const partNo = params?.partNo
  const thickness = params?.thickness

  if (!blockNo) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Block number is required' }),
    }
  }

  try {
    // Specify the exact range in the "Data" tab
    const range = "Data!A2:W" // Columns A through W (23 columns), starting from row 2

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range,
    })

    if (!response.data.values) {
      return {
        statusCode: 200,
        body: JSON.stringify([]),
      }
    }

    // Filter and map the rows to SearchResult objects
    const results = response.data.values
      .filter(row => {
        if (!row[0]) return false

        const rowBlockNo = row[0].toString().toLowerCase()
        const rowPartNo = row[1]?.toString().toLowerCase() || ''
        const rowThickness = row[2]?.toString().toLowerCase() || ''

        const matchesBlock = rowBlockNo === blockNo.toLowerCase()
        const matchesPart = !partNo || rowPartNo === partNo.toLowerCase()
        const matchesThickness = !thickness || rowThickness === thickness.toLowerCase()

        return matchesBlock && matchesPart && matchesThickness
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
      }))

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(results),
    }
  } catch (error) {
    console.error('Search error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch search results' }),
    }
  }
}

export { handler }