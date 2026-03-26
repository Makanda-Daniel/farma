require('dotenv').config()
const express = require('express')
const cors = require('cors')

const authRoutes = require('./routes/auth')
const farmaciasRoutes = require('./routes/farmacias')
const medicamentosRoutes = require('./routes/medicamentos')

const app = express()

const origens = [
  'http://localhost',
  'http://localhost:3000',
  'http://127.0.0.1',
  'http://127.0.0.1:5500',
  process.env.FRONTEND_URL
].filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origens.includes(origin)) return callback(null, true)
    callback(new Error('Origem não permitida pelo CORS'))
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/farmacias', farmaciasRoutes)
app.use('/api/medicamentos', medicamentosRoutes)

app.get('/', (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost/farma/frontend/index.html'
  res.redirect(frontendUrl)
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`))
