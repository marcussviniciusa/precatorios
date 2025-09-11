const { ensureBucketExists } = require('./src/lib/minio.ts')

async function testMinIO() {
  try {
    console.log('Testing MinIO connection...')
    await ensureBucketExists()
    console.log('✅ MinIO connection successful!')
  } catch (error) {
    console.error('❌ MinIO connection failed:', error.message)
  }
}

testMinIO()