import { Handler } from '@netlify/functions'
import { searchSheetData } from '../../server/google-sheets'

export const handler: Handler = async (event, context) => {
  // Check authentication (you'll need to implement your own auth strategy for Netlify)
  // For now, we'll skip the auth check as it needs to be reimplemented for serverless

  const { blockNo, partNo, thickness } = event.queryStringParameters || {}

  if (!blockNo) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Block number is required' })
    }
  }

  try {
    const results = await searchSheetData(
      blockNo,
      partNo,
      thickness
    )
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE'
      },
      body: JSON.stringify(results)
    }
  } catch (error) {
    console.error('Search error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch search results' })
    }
  }
}