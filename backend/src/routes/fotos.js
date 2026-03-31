const express = require('express')
const router = express.Router()
const { upload, uploadFotos, removerFoto } = require('../controllers/fotosController')
const autenticar = require('../middlewares/auth')

router.post('/:id/fotos', autenticar, upload.array('fotos', 10), uploadFotos)
router.delete('/:id/fotos', autenticar, removerFoto)

module.exports = router
