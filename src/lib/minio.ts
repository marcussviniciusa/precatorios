import * as Minio from 'minio'

// MinIO Client Configuration
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
})

const BUCKET_NAME = process.env.MINIO_BUCKET_NAME || 'precatorios-files'

// Ensure bucket exists
export const ensureBucketExists = async (): Promise<void> => {
  try {
    const exists = await minioClient.bucketExists(BUCKET_NAME)
    if (!exists) {
      await minioClient.makeBucket(BUCKET_NAME, 'us-east-1')
      console.log(`MinIO bucket '${BUCKET_NAME}' created successfully.`)
    }
  } catch (error) {
    console.error('Error ensuring MinIO bucket exists:', error)
    throw error
  }
}

// Upload file to MinIO
export const uploadFileToMinio = async (
  file: File, 
  fileName: string, 
  folder: string = 'uploads'
): Promise<string> => {
  try {
    await ensureBucketExists()

    // Create unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileExtension = fileName.split('.').pop()
    const uniqueFileName = `${folder}/${timestamp}-${Math.random().toString(36).substring(7)}.${fileExtension}`

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Set metadata
    const metaData = {
      'Content-Type': file.type,
      'Original-Name': fileName,
      'Upload-Date': new Date().toISOString()
    }

    // Upload to MinIO
    const objInfo = await minioClient.putObject(
      BUCKET_NAME,
      uniqueFileName,
      buffer,
      buffer.length,
      metaData
    )

    console.log(`File uploaded successfully to MinIO: ${uniqueFileName}`, objInfo)
    
    // Return the file URL
    return `${getMinioUrl()}/${BUCKET_NAME}/${uniqueFileName}`
    
  } catch (error) {
    console.error('Error uploading file to MinIO:', error)
    throw error
  }
}

// Upload file from buffer to MinIO
export const uploadBufferToMinio = async (
  buffer: Buffer,
  fileName: string,
  mimetype: string,
  folder: string = 'uploads'
): Promise<string> => {
  try {
    await ensureBucketExists()

    // Create unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileExtension = fileName.split('.').pop() || 'bin'
    const uniqueFileName = `${folder}/${timestamp}-${Math.random().toString(36).substring(7)}.${fileExtension}`

    // Set metadata
    const metaData = {
      'Content-Type': mimetype,
      'Original-Name': fileName,
      'Upload-Date': new Date().toISOString()
    }

    // Upload to MinIO
    const objInfo = await minioClient.putObject(
      BUCKET_NAME,
      uniqueFileName,
      buffer,
      buffer.length,
      metaData
    )

    console.log(`Buffer uploaded successfully to MinIO: ${uniqueFileName}`, objInfo)
    
    // Return the file URL
    return `${getMinioUrl()}/${BUCKET_NAME}/${uniqueFileName}`
    
  } catch (error) {
    console.error('Error uploading buffer to MinIO:', error)
    throw error
  }
}

// Get file from MinIO
export const getFileFromMinio = async (objectName: string): Promise<Buffer> => {
  try {
    const stream = await minioClient.getObject(BUCKET_NAME, objectName)
    
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      
      stream.on('data', (chunk) => {
        chunks.push(chunk)
      })
      
      stream.on('end', () => {
        resolve(Buffer.concat(chunks))
      })
      
      stream.on('error', (error) => {
        reject(error)
      })
    })
  } catch (error) {
    console.error('Error getting file from MinIO:', error)
    throw error
  }
}

// Delete file from MinIO
export const deleteFileFromMinio = async (objectName: string): Promise<void> => {
  try {
    await minioClient.removeObject(BUCKET_NAME, objectName)
    console.log(`File deleted successfully from MinIO: ${objectName}`)
  } catch (error) {
    console.error('Error deleting file from MinIO:', error)
    throw error
  }
}

// Generate presigned URL for direct download
export const getPresignedUrl = async (
  objectName: string, 
  expiry: number = 7 * 24 * 60 * 60 // 7 days in seconds
): Promise<string> => {
  try {
    return await minioClient.presignedGetObject(BUCKET_NAME, objectName, expiry)
  } catch (error) {
    console.error('Error generating presigned URL:', error)
    throw error
  }
}

// Get MinIO server URL
export const getMinioUrl = (): string => {
  const useSSL = process.env.MINIO_USE_SSL === 'true'
  const protocol = useSSL ? 'https' : 'http'
  const endpoint = process.env.MINIO_ENDPOINT || 'localhost'
  const port = process.env.MINIO_PORT || '9000'
  
  // Don't include port if it's standard (80 for HTTP, 443 for HTTPS)
  if ((useSSL && port === '443') || (!useSSL && port === '80')) {
    return `${protocol}://${endpoint}`
  }
  
  return `${protocol}://${endpoint}:${port}`
}

// Extract object name from MinIO URL
export const extractObjectNameFromUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/')
    
    // Remove empty string and bucket name
    const filteredParts = pathParts.filter(part => part !== '' && part !== BUCKET_NAME)
    
    return filteredParts.join('/')
  } catch (error) {
    console.error('Error extracting object name from URL:', error)
    return null
  }
}

export { minioClient, BUCKET_NAME }