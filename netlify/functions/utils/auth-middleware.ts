import { Context } from '@netlify/functions'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export interface AuthenticatedContext extends Context {
  user?: {
    userId: string
    username: string
    email: string
  }
}

export function verifyToken(token: string): Promise<any> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) reject(err)
      resolve(decoded)
    })
  })
}

export async function authenticateRequest(event: any): Promise<{ isAuthenticated: boolean; user?: any; error?: string }> {
  try {
    const authHeader = event.headers.authorization || event.headers.Authorization
    
    if (!authHeader) {
      return { isAuthenticated: false, error: 'No authorization header' }
    }

    const token = authHeader.replace('Bearer ', '')
    const decoded = await verifyToken(token)
    
    return {
      isAuthenticated: true,
      user: decoded
    }
  } catch (error) {
    return {
      isAuthenticated: false,
      error: 'Invalid token'
    }
  }
}