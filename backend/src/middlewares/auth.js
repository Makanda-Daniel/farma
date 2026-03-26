require('dotenv').config()

function autenticar(req, res, next) {
  const auth = req.headers['authorization']
  if (!auth || auth !== `Bearer ${process.env.ADMIN_TOKEN}`) {
    return res.status(401).json({ error: 'Não autorizado' })
  }
  next()
}

module.exports = autenticar
