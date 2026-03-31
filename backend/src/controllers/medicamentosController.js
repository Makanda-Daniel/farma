const supabase = require('../supabase/client')

async function listarTodos(req, res) {
  const { data, error } = await supabase.from('medicamentos').select('*')
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
}

async function listarPorFarmacia(req, res) {
  const { farmacia_id } = req.params
  const { data, error } = await supabase
    .from('medicamentos')
    .select('*')
    .eq('farmacia_id', farmacia_id)
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
}

async function buscarFarmacias(req, res) {
  const { nome } = req.params
  const { data, error } = await supabase
    .from('medicamentos')
    .select('id, nome, descricao, quantidade, farmacias(id, nome, endereco, telefone, latitude, longitude, fotos)')
    .ilike('nome', `%${nome}%`)
    .gt('quantidade', 0)
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
}

async function cadastrar(req, res) {
  const { farmacia_id, nome, descricao, quantidade } = req.body
  if (!farmacia_id || !nome) return res.status(400).json({ error: 'farmacia_id e nome são obrigatórios' })
  const { data, error } = await supabase
    .from('medicamentos')
    .insert([{ farmacia_id, nome, descricao, quantidade: quantidade || 0 }])
    .select()
    .single()
  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
}

async function atualizar(req, res) {
  const { id } = req.params
  const { nome, descricao, quantidade } = req.body
  const { data, error } = await supabase
    .from('medicamentos')
    .update({ nome, descricao, quantidade })
    .eq('id', id)
    .select()
    .single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
}

async function remover(req, res) {
  const { id } = req.params
  const { error } = await supabase.from('medicamentos').delete().eq('id', id)
  if (error) return res.status(500).json({ error: error.message })
  res.status(204).send()
}

module.exports = { listarTodos, listarPorFarmacia, buscarFarmacias, cadastrar, atualizar, remover }
