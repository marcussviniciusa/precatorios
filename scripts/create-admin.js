const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

// Configuração do MongoDB
const MONGODB_URI = 'mongodb://admin:Marcus1911Marcus@206.183.131.10:27017/precatorios5test?authSource=admin'

// Schema do usuário
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['admin', 'manager', 'analyst'],
    default: 'analyst'
  },
  phone: String,
  avatar: String,
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
})

const User = mongoose.model('User', UserSchema)

async function createAdmin() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Conectado ao MongoDB')

    // Verificar se já existe um admin
    const existingAdmin = await User.findOne({ email: 'admin@demo.com' })
    if (existingAdmin) {
      console.log('❌ Usuário admin já existe')
      return
    }

    // Hash da senha
    const salt = await bcrypt.genSalt(12)
    const hashedPassword = await bcrypt.hash('123456', salt)

    // Criar usuário admin
    const admin = new User({
      name: 'Administrator',
      email: 'admin@demo.com',
      password: hashedPassword,
      role: 'admin',
      phone: '+55 11 99999-9999',
      isActive: true
    })

    await admin.save()
    console.log('✅ Usuário admin criado com sucesso!')
    console.log('📧 Email: admin@demo.com')
    console.log('🔐 Senha: 123456')

  } catch (error) {
    console.error('❌ Erro ao criar admin:', error)
  } finally {
    await mongoose.disconnect()
    console.log('📝 Conexão fechada')
  }
}

createAdmin()