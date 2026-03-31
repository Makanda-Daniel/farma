const supabase = require('../supabase/client')
const multer = require('multer')

const upload = multer({ storage: multer.memoryStorage() })

async function uploadFotos(req, res) {
  const { id } = req.params
  const files = req.files

  if (!files || !files.length) return res.status(400).json({ error: 'Nenhuma foto enviada' })

  const urls = []

  for (const file of files) {
    const ext = file.originalname.split('.').pop()
    const nome = `farmacia_${id}_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

    const { error } = await supabase.storage
      .from('farmacias')
      .upload(nome, file.buffer, { contentType: file.mimetype, upsert: false })

    if (error) return res.status(500).json({ error: error.message })

    const { data } = supabase.storage.from('farmacias').getPublicUrl(nome)
    urls.push(data.publicUrl)
  }

  // busca fotos actuais e adiciona as novas
  const { data: farmacia } = await supabase.from('farmacias').select('fotos').eq('id', id).single()
  const fotosActuais = farmacia?.fotos || []
  const todasFotos = [...fotosActuais, ...urls]

  const { data, error } = await supabase
    .from('farmacias')
    .update({ fotos: todasFotos })
    .eq('id', id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
}

async function removerFoto(req, res) {
  const { id } = req.params
  const { url } = req.body

  if (!url) return res.status(400).json({ error: 'URL da foto é obrigatória' })

  // extrai o path correcto da URL publica do Supabase
  // formato: https://<ref>.supabase.co/storage/v1/object/public/farmacias/<path>
  const match = url.match(/\/storage\/v1\/object\/public\/farmacias\/(.+)$/)
  const filePath = match ? match[1] : url.split('/').pop()

  await supabase.storage.from('farmacias').remove([filePath])

  const { data: farmacia } = await supabase.from('farmacias').select('fotos').eq('id', id).single()
  const fotos = (farmacia?.fotos || []).filter(f => f !== url)

  const { data, error } = await supabase
    .from('farmacias')
    .update({ fotos })
    .eq('id', id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
}

module.exports = { upload, uploadFotos, removerFoto }
