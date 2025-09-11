import { NextRequest, NextResponse } from 'next/server'
import { getFileFromMinio, getPresignedUrl } from '@/lib/minio'

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const filePath = params.path.join('/')
    
    if (!filePath) {
      return NextResponse.json(
        { error: 'Caminho do arquivo é obrigatório' },
        { status: 400 }
      )
    }

    // Get URL query parameters
    const { searchParams } = new URL(request.url)
    const download = searchParams.get('download') === 'true'
    const presigned = searchParams.get('presigned') === 'true'

    // If presigned URL is requested, return it directly
    if (presigned) {
      try {
        const presignedUrl = await getPresignedUrl(filePath, 24 * 60 * 60) // 24 hours
        return NextResponse.json({ url: presignedUrl })
      } catch (error) {
        console.error('Error generating presigned URL:', error)
        return NextResponse.json(
          { error: 'Erro ao gerar URL de acesso ao arquivo' },
          { status: 500 }
        )
      }
    }

    // Stream file directly
    try {
      const fileBuffer = await getFileFromMinio(filePath)
      
      // Get file extension to determine content type
      const extension = filePath.split('.').pop()?.toLowerCase()
      let contentType = 'application/octet-stream'
      
      // Set appropriate content type based on extension
      switch (extension) {
        case 'jpg':
        case 'jpeg':
          contentType = 'image/jpeg'
          break
        case 'png':
          contentType = 'image/png'
          break
        case 'gif':
          contentType = 'image/gif'
          break
        case 'webp':
          contentType = 'image/webp'
          break
        case 'pdf':
          contentType = 'application/pdf'
          break
        case 'doc':
          contentType = 'application/msword'
          break
        case 'docx':
          contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          break
        case 'xls':
          contentType = 'application/vnd.ms-excel'
          break
        case 'xlsx':
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          break
        case 'txt':
          contentType = 'text/plain'
          break
        case 'mp3':
          contentType = 'audio/mpeg'
          break
        case 'wav':
          contentType = 'audio/wav'
          break
        case 'ogg':
          contentType = 'audio/ogg'
          break
        case 'opus':
          contentType = 'audio/ogg; codecs=opus'
          break
        case 'mp4':
          contentType = 'video/mp4'
          break
        case 'webm':
          contentType = 'video/webm'
          break
      }

      const headers: Record<string, string> = {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000', // 1 year cache
      }

      // Set download header if requested
      if (download) {
        const fileName = filePath.split('/').pop() || 'download'
        headers['Content-Disposition'] = `attachment; filename="${fileName}"`
      } else {
        headers['Content-Disposition'] = 'inline'
      }

      return new NextResponse(fileBuffer as any, { headers })

    } catch (error) {
      console.error('Error serving file from MinIO:', error)
      return NextResponse.json(
        { error: 'Arquivo não encontrado' },
        { status: 404 }
      )
    }

  } catch (error) {
    console.error('File serve API error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}