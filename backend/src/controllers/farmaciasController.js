const supabase = require('../supabase/client')

async function listar(req, res) {
  const { data, error } = await supabase.from('farmacias').select('id, nome, endereco, telefone, latitude, longitude, fotos')
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
}

async function buscarProximas(req, res) {
  const { lat, lng, raio = 5000 } = req.query
  if (!lat || !lng) return res.status(400).json({ error: 'lat e lng são obrigatórios' })

  const { data, error } = await supabase.rpc('farmacias_proximas', {
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    raio_metros: parseInt(raio)
  })
  if (error) return res.status(500).json({ error: error.message })

  // busca fotos para cada farmácia retornada
  if (data && data.length) {
    const ids = data.map(f => f.id)
    const { data: comFotos } = await supabase.from('farmacias').select('id, fotos').in('id', ids)
    const mapaFotos = Object.fromEntries((comFotos || []).map(f => [f.id, f.fotos]))
    data.forEach(f => { f.fotos = mapaFotos[f.id] || [] })
  }

  res.json(data)
}

async function buscarPorId(req, res) {
  const { id } = req.params
  const { data, error } = await supabase.from('farmacias').select('*').eq('id', id).single()
  if (error) return res.status(404).json({ error: 'Farmácia não encontrada' })
  res.json(data)
}

async function cadastrar(req, res) {
  const { nome, endereco, telefone, latitude, longitude } = req.body
  if (!nome || !latitude || !longitude) return res.status(400).json({ error: 'nome, latitude e longitude são obrigatórios' })

  const { data, error } = await supabase.from('farmacias').insert([{ nome, endereco, telefone, latitude, longitude }]).select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
}

async function atualizar(req, res) {
  const { id } = req.params
  const { nome, endereco, telefone, latitude, longitude } = req.body

  const { data, error } = await supabase.from('farmacias').update({ nome, endereco, telefone, latitude, longitude }).eq('id', id).select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
}

async function remover(req, res) {
  const { id } = req.params
  const { error } = await supabase.from('farmacias').delete().eq('id', id)
  if (error) return res.status(500).json({ error: error.message })
  res.status(204).send()
}

module.exports = { listar, buscarProximas, buscarPorId, cadastrar, atualizar, remover }
