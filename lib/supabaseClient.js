// lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL')
}
if (!supabaseAnonKey) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

/**
 * Sign up a new user
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<{data: any, error: any}>}
 */
export const signUp = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    console.error('Supabase SignUp Error:', error.message)
  }

  return { data, error }
}

/**
 * Sign in an existing user
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<{data: any, error: any}>}
 */
export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error('Supabase SignIn Error:', error.message)
  }

  return { data, error }
}

/**
 * Sign out the current user
 * @returns {Promise<{error: any}>}
 */
export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

/**
 * Get the current user session
 * @returns {Promise<{data: {session: any}, error: any}>}
 */
export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession()
  return { data, error }
}

/**
 * Get the current user (Fetches fresh data from server - safer than getSession)
 * @returns {Promise<{data: {user: any}, error: any}>}
 */
export const getUser = async () => {
  const { data, error } = await supabase.auth.getUser()
  return { data, error }
}

/**
 * Reset password for a user
 * @param {string} email - User's email
 * @returns {Promise<{data: any, error: any}>}
 */
export const resetPassword = async (email) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })

  if (error) {
    console.error('Supabase Reset Password Error:', error.message)
  }

  return { data, error }
}
