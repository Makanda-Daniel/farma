require('dotenv').config()

function login(req, res) {
  const { senha } = req.body
  if (senha !== process.env.ADMIN_SENHA) {
    return res.status(401).json({ error: 'Senha incorreta' })
  }
  res.json({ token: process.env.ADMIN_TOKEN })
}

module.exports = { login }
