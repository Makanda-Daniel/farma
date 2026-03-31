require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')

const authRoutes = require('./routes/auth')
const farmaciasRoutes = require('./routes/farmacias')
const medicamentosRoutes = require('./routes/medicamentos')
const fotosRoutes = require('./routes/fotos')

const app = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

const frontendPath = path.join(__dirname, '../../frontend')

// serve ficheiros estáticos do frontend
app.use(express.static(frontendPath))

// rotas da API
app.use('/api/auth', authRoutes)
app.use('/api/farmacias', farmaciasRoutes)
app.use('/api/medicamentos', medicamentosRoutes)
app.use('/api/farmacias', fotosRoutes)

// rota raiz aponta explicitamente para o index do frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'))
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`))
