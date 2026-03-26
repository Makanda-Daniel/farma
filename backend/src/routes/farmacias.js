const express = require('express')
const router = express.Router()
const ctrl = require('../controllers/farmaciasController')
const autenticar = require('../middlewares/auth')

router.get('/', ctrl.listar)
router.get('/proximas', ctrl.buscarProximas)
router.get('/:id', ctrl.buscarPorId)
router.post('/', autenticar, ctrl.cadastrar)
router.put('/:id', autenticar, ctrl.atualizar)
router.delete('/:id', autenticar, ctrl.remover)

module.exports = router
