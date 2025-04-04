import { Handler } from '@netlify/functions'
import { hash } from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey)

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { username, email, password } = JSON.parse(event.body || '{}')

    if (!username || !email || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Username, email and password are required' })
      }
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .or(`username.eq.${username},email.eq.${email}`)
      .single()

    if (existingUser) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Username or email already exists' })
      }
    }

    // Hash password
    const hashedPassword = await hash(password, 10)

    // Create user in Supabase
    const { data: user, error: createError } = await supabase
      .from('users')
      .insert([
        {
          username,
          email,
          password: hashedPassword
        }
      ])
      .select()
      .single()

    if (createError || !user) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to create user' })
      }
    }

    // Create session
    const { data: session, error: sessionError } = await supabase.auth.signUp({
      email,
      password
    })

    if (sessionError) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to create session' })
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        },
        session
      })
    }
  } catch (error) {
    console.error('Registration error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}