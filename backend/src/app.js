require('dotenv').config()
const express = require('express')
const cors = require('cors')

const authRoutes = require('./routes/auth')
const farmaciasRoutes = require('./routes/farmacias')
const medicamentosRoutes = require('./routes/medicamentos')

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/farmacias', farmaciasRoutes)
app.use('/api/medicamentos', medicamentosRoutes)

app.get('/', (req, res) => res.redirect('http://localhost/farma/frontend/index.html'))

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`))
