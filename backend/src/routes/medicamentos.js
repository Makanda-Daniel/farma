const express = require('express')
const router = express.Router()
const ctrl = require('../controllers/medicamentosController')
const autenticar = require('../middlewares/auth')

router.get('/buscar/:nome', ctrl.buscarFarmacias)
router.get('/farmacia/todos', ctrl.listarTodos)
router.get('/farmacia/:farmacia_id', ctrl.listarPorFarmacia)
router.post('/', autenticar, ctrl.cadastrar)
router.put('/:id', autenticar, ctrl.atualizar)
router.delete('/:id', autenticar, ctrl.remover)

module.exports = router
