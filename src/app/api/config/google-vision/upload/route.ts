import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('credentials') as File

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo fornecido' },
        { status: 400 }
      )
    }

    // Verificar se é um arquivo JSON
    if (!file.name.endsWith('.json')) {
      return NextResponse.json(
        { error: 'Apenas arquivos JSON são permitidos' },
        { status: 400 }
      )
    }

    // Ler e validar o conteúdo do arquivo
    const fileContent = await file.text()
    let credentials
    
    try {
      credentials = JSON.parse(fileContent)
    } catch {
      return NextResponse.json(
        { error: 'Arquivo JSON inválido' },
        { status: 400 }
      )
    }

    // Verificar se tem as propriedades necessárias do Google Cloud
    if (!credentials.type || !credentials.project_id || !credentials.private_key_id) {
      return NextResponse.json(
        { error: 'Arquivo de credenciais inválido. Certifique-se de que é um arquivo de chave de serviço do Google Cloud.' },
        { status: 400 }
      )
    }

    // Criar diretório de credenciais se não existir
    const credentialsDir = path.join(process.cwd(), 'credentials')
    if (!existsSync(credentialsDir)) {
      await mkdir(credentialsDir, { recursive: true })
    }

    // Definir caminho do arquivo
    const fileName = 'google-vision-credentials.json'
    const filePath = path.join(credentialsDir, fileName)
    const relativeFilePath = `./credentials/${fileName}`

    // Salvar o arquivo
    await writeFile(filePath, fileContent, 'utf8')

    return NextResponse.json({
      success: true,
      message: 'Credenciais do Google Vision salvas com sucesso',
      filePath: relativeFilePath,
      fileName
    })

  } catch (error) {
    console.error('Error uploading Google Vision credentials:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}