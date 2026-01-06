import { supabase } from './supabaseClient'

// File upload helper using Supabase Storage
export async function UploadFile({ file, bucket = 'uploads' }) {
  if (!file) throw new Error('No file provided')
  
  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    throw new Error('File size exceeds 5MB limit')
  }
  
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.')
  }
  
  // Get current user for folder path
  const { data: { user } } = await supabase.auth.getUser()
  
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
  // Use user ID as folder if authenticated, otherwise use 'public'
  const folder = user?.id || 'public'
  const filePath = `${folder}/${fileName}`
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })
  
  if (error) {
    console.error('Upload error details:', error)
    if (error.message?.includes('Bucket not found')) {
      throw new Error(`Storage bucket "${bucket}" does not exist. Please create it in the Supabase dashboard.`)
    }
    if (error.message?.includes('row-level security') || error.statusCode === 403) {
      throw new Error('Permission denied. Please check storage bucket policies.')
    }
    throw error
  }
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath)
  
  return { url: publicUrl, path: data.path }
}

// Private file upload
export async function UploadPrivateFile({ file, bucket = 'private' }) {
  if (!file) throw new Error('No file provided')
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Must be authenticated to upload private files')
  
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
  const filePath = `${user.id}/${fileName}`
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })
  
  if (error) throw error
  
  return { path: data.path }
}

// Create signed URL for private files
export async function CreateFileSignedUrl({ path, bucket = 'private', expiresIn = 3600 }) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)
  
  if (error) throw error
  return data.signedUrl
}

// Delete file from storage
export async function DeleteFile({ path, bucket = 'uploads' }) {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path])
  
  if (error) throw error
  return true
}

// Placeholder for LLM integration (would need to be implemented via Supabase Edge Functions or external API)
export async function InvokeLLM(params) {
  console.warn('InvokeLLM is not yet implemented. Consider using Supabase Edge Functions with OpenAI.')
  throw new Error('LLM integration not implemented')
}

// Placeholder for email sending (would need to be implemented via Supabase Edge Functions or external service)
export async function SendEmail(params) {
  console.warn('SendEmail is not yet implemented. Consider using Supabase Edge Functions with Resend or SendGrid.')
  throw new Error('Email integration not implemented')
}

// Placeholder for image generation
export async function GenerateImage(params) {
  console.warn('GenerateImage is not yet implemented.')
  throw new Error('Image generation not implemented')
}

// Placeholder for data extraction
export async function ExtractDataFromUploadedFile(params) {
  console.warn('ExtractDataFromUploadedFile is not yet implemented.')
  throw new Error('Data extraction not implemented')
}

export const Core = {
  InvokeLLM,
  SendEmail,
  UploadFile,
  GenerateImage,
  ExtractDataFromUploadedFile,
  CreateFileSignedUrl,
  UploadPrivateFile,
  DeleteFile
}

export default Core

