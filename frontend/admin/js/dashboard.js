const token = localStorage.getItem('admin_token')
if (!token) window.location.href = 'index.html'

const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }

let todasFarmacias = []
let todosMedicamentos = []
let mapaGeral = null
let mapPicker = null
let mapaDetalhe = null
let pinAtual = null

// ── Utilitários ──────────────────────────────────────────

function mostrarMsg(texto, tipo = 'ok') {
  const el = document.getElementById('msg')
  el.textContent = texto
  el.className = tipo
  setTimeout(() => { el.className = ''; el.style.display = 'none' }, 3000)
}

function trocarSecao(id, btn) {
  document.querySelectorAll('.secao').forEach(s => s.classList.remove('ativa'))
  document.querySelectorAll('#sidebar nav button').forEach(b => b.classList.remove('ativo'))
  document.getElementById(id).classList.add('ativa')
  btn.classList.add('ativo')
  if (id === 'visao-geral') setTimeout(() => mapaGeral && mapaGeral.invalidateSize(), 100)
  if (id === 'farmacias') setTimeout(() => mapPicker && mapPicker.invalidateSize(), 100)
}

function sair() {
  localStorage.removeItem('admin_token')
  window.location.href = 'index.html'
}

function fecharModal(id) {
  document.getElementById(id).classList.remove('aberto')
}

function filtrarTabela(tbodyId, termo) {
  const rows = document.querySelectorAll(`#${tbodyId} tr`)
  rows.forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(termo.toLowerCase()) ? '' : 'none'
  })
}

// ── Mapas ────────────────────────────────────────────────

function iniciarMapaGeral() {
  mapaGeral = L.map('mapa-geral').setView([-8.8383, 13.2344], 12)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: 'OpenStreetMap' }).addTo(mapaGeral)
}

function iniciarMapaPicker() {
  mapPicker = L.map('map-picker').setView([-8.8383, 13.2344], 13)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: 'OpenStreetMap' }).addTo(mapPicker)
  mapPicker.on('click', (e) => {
    document.getElementById('f-lat').value = e.latlng.lat.toFixed(6)
    document.getElementById('f-lng').value = e.latlng.lng.toFixed(6)
    if (pinAtual) mapPicker.removeLayer(pinAtual)
    pinAtual = L.marker([e.latlng.lat, e.latlng.lng]).addTo(mapPicker)
  })
}

function atualizarMapaGeral(farmacias) {
  mapaGeral.eachLayer(l => { if (l instanceof L.Marker) mapaGeral.removeLayer(l) })
  farmacias.forEach(f => {
    L.marker([f.latitude, f.longitude])
      .addTo(mapaGeral)
      .bindPopup(`<b>${f.nome}</b><br>${f.endereco || ''}`)
  })
}

// ── Visão Geral ──────────────────────────────────────────

async function carregarResumo() {
  const [farmacias, meds] = await Promise.all([
    fetch(`${API}/farmacias`).then(r => r.json()),
    fetch(`${API}/medicamentos/farmacia/todos`).then(r => r.json()).catch(() => [])
  ])

  todasFarmacias = Array.isArray(farmacias) ? farmacias : []
  todosMedicamentos = Array.isArray(meds) ? meds : []

  document.getElementById('total-farmacias').textContent = todasFarmacias.length
  document.getElementById('total-medicamentos').textContent = todosMedicamentos.length
  document.getElementById('total-estoque').textContent = todosMedicamentos.reduce((s, m) => s + (m.quantidade || 0), 0)

  atualizarMapaGeral(todasFarmacias)

  // recentes farmácias
  const ulF = document.getElementById('lista-recentes-farmacias')
  ulF.innerHTML = todasFarmacias.length
    ? todasFarmacias.slice(-5).reverse().map(f => `<li>${f.nome}<span>${f.telefone || '—'}</span></li>`).join('')
    : '<li>Nenhuma farmácia cadastrada</li>'

  // recentes medicamentos
  const ulM = document.getElementById('lista-recentes-meds')
  ulM.innerHTML = todosMedicamentos.length
    ? todosMedicamentos.slice(-5).reverse().map(m => {
        const farm = todasFarmacias.find(f => f.id === m.farmacia_id)
        return `<li>${m.nome}<span>${farm ? farm.nome : '—'}</span></li>`
      }).join('')
    : '<li>Nenhum medicamento cadastrado</li>'
}

// ── Farmácias ────────────────────────────────────────────

async function carregarFarmacias() {
  const res = await fetch(`${API}/farmacias`)
  todasFarmacias = await res.json()

  // conta medicamentos por farmácia
  const contagem = {}
  todosMedicamentos.forEach(m => { contagem[m.farmacia_id] = (contagem[m.farmacia_id] || 0) + 1 })

  const tbody = document.getElementById('tabela-farmacias')
  tbody.innerHTML = ''

  if (!todasFarmacias.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="loading">Nenhuma farmácia cadastrada</td></tr>'
    return
  }

  todasFarmacias.forEach(f => {
    const qtdMeds = contagem[f.id] || 0
    tbody.innerHTML += `
      <tr>
        <td><strong>${f.nome}</strong></td>
        <td>${f.endereco || '—'}</td>
        <td>${f.telefone || '—'}</td>
        <td style="font-size:0.82em;color:#888">${f.latitude.toFixed(4)}, ${f.longitude.toFixed(4)}</td>
        <td><span class="badge ${qtdMeds > 0 ? 'verde' : 'vermelho'}">${qtdMeds} med.</span></td>
        <td>
          <button class="btn-acao btn-ver" onclick="verDetalhesFarmacia(${f.id})">Ver</button>
          <button class="btn-acao btn-editar" onclick='abrirModalFarmacia(${JSON.stringify(f)})'>Editar</button>
          <button class="btn-acao btn-remover" onclick="removerFarmacia(${f.id})">Remover</button>
        </td>
      </tr>`
  })

  popularSelectFarmacias(todasFarmacias)
}

document.getElementById('form-farmacia').addEventListener('submit', async (e) => {
  e.preventDefault()
  const body = {
    nome: document.getElementById('f-nome').value,
    telefone: document.getElementById('f-telefone').value,
    endereco: document.getElementById('f-endereco').value,
    latitude: parseFloat(document.getElementById('f-lat').value),
    longitude: parseFloat(document.getElementById('f-lng').value)
  }
  const res = await fetch(`${API}/farmacias`, { method: 'POST', headers, body: JSON.stringify(body) })
  if (!res.ok) return mostrarMsg('Erro ao cadastrar farmácia.', 'erro')
  const farmacia = await res.json()

  // upload de fotos se houver
  const inputFotos = document.getElementById('f-fotos')
  if (inputFotos.files.length) await enviarFotos(farmacia.id, inputFotos.files)

  e.target.reset()
  if (pinAtual) { mapPicker.removeLayer(pinAtual); pinAtual = null }
  mostrarMsg('Farmácia cadastrada com sucesso!')
  await carregarResumo()
  carregarFarmacias()
})

async function removerFarmacia(id) {
  if (!confirm('Remover esta farmácia? Todos os medicamentos vinculados serão removidos.')) return
  const res = await fetch(`${API}/farmacias/${id}`, { method: 'DELETE', headers })
  if (!res.ok) return mostrarMsg('Erro ao remover.', 'erro')
  mostrarMsg('Farmácia removida.')
  await carregarResumo()
  carregarFarmacias()
}

function abrirModalFarmacia(f) {
  document.getElementById('edit-id').value = f.id
  document.getElementById('edit-nome').value = f.nome
  document.getElementById('edit-telefone').value = f.telefone || ''
  document.getElementById('edit-endereco').value = f.endereco || ''
  document.getElementById('edit-lat').value = f.latitude
  document.getElementById('edit-lng').value = f.longitude

  // renderiza fotos actuais
  const grid = document.getElementById('edit-fotos-grid')
  grid.innerHTML = (f.fotos || []).map(url => `
    <div style="position:relative;display:inline-block">
      <img src="${url}" style="width:80px;height:60px;object-fit:cover;border-radius:4px">
      <button onclick="removerFotoAdmin(${f.id},'${url}',this.parentElement)" style="position:absolute;top:2px;right:2px;background:#e74c3c;color:white;border:none;border-radius:50%;width:18px;height:18px;cursor:pointer;font-size:0.7em;line-height:18px;text-align:center">×</button>
    </div>`).join('')

  document.getElementById('modal-farmacia').classList.add('aberto')
}

async function salvarEdicaoFarmacia() {
  const id = document.getElementById('edit-id').value
  const body = {
    nome: document.getElementById('edit-nome').value,
    telefone: document.getElementById('edit-telefone').value,
    endereco: document.getElementById('edit-endereco').value,
    latitude: parseFloat(document.getElementById('edit-lat').value),
    longitude: parseFloat(document.getElementById('edit-lng').value)
  }
  const res = await fetch(`${API}/farmacias/${id}`, { method: 'PUT', headers, body: JSON.stringify(body) })
  if (!res.ok) return mostrarMsg('Erro ao atualizar.', 'erro')

  // upload de novas fotos se houver
  const inputFotos = document.getElementById('edit-fotos-input')
  if (inputFotos.files.length) await enviarFotos(id, inputFotos.files)

  fecharModal('modal-farmacia')
  mostrarMsg('Farmácia atualizada!')
  await carregarResumo()
  carregarFarmacias()
}

async function enviarFotos(id, files) {
  const formData = new FormData()
  for (const file of files) formData.append('fotos', file)
  const res = await fetch(`${API}/farmacias/${id}/fotos`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  })
  if (!res.ok) mostrarMsg('Erro ao enviar fotos.', 'erro')
}

async function removerFotoAdmin(id, url, el) {
  const res = await fetch(`${API}/farmacias/${id}/fotos`, {
    method: 'DELETE',
    headers,
    body: JSON.stringify({ url })
  })
  if (!res.ok) return mostrarMsg('Erro ao remover foto.', 'erro')
  el.remove()
  mostrarMsg('Foto removida.')
}

async function verDetalhesFarmacia(id) {
  const f = todasFarmacias.find(x => x.id === id)
  if (!f) return

  document.getElementById('detalhe-nome').textContent = f.nome
  document.getElementById('detalhe-endereco').textContent = f.endereco || '—'
  document.getElementById('detalhe-telefone').textContent = f.telefone || '—'
  document.getElementById('detalhe-coords').textContent = `${f.latitude}, ${f.longitude}`
  document.getElementById('modal-detalhe').classList.add('aberto')

  // mapa do detalhe
  setTimeout(() => {
    if (mapaDetalhe) { mapaDetalhe.remove(); mapaDetalhe = null }
    mapaDetalhe = L.map('mapa-detalhe').setView([f.latitude, f.longitude], 15)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: 'OpenStreetMap' }).addTo(mapaDetalhe)
    L.marker([f.latitude, f.longitude]).addTo(mapaDetalhe).bindPopup(f.nome).openPopup()
  }, 100)

  // medicamentos da farmácia
  const res = await fetch(`${API}/medicamentos/farmacia/${id}`)
  const meds = await res.json()
  const tbody = document.getElementById('detalhe-tabela-meds')
  tbody.innerHTML = meds.length
    ? meds.map(m => `
        <tr>
          <td>${m.nome}</td>
          <td>${m.descricao || '—'}</td>
          <td><span class="badge ${m.quantidade > 0 ? 'verde' : 'vermelho'}">${m.quantidade} un.</span></td>
        </tr>`).join('')
    : '<tr><td colspan="3" class="loading">Nenhum medicamento cadastrado</td></tr>'
}

// ── Medicamentos ─────────────────────────────────────────

async function carregarMedicamentos() {
  const filtroFarmacia = document.getElementById('filtro-farmacia-med').value

  let meds
  if (filtroFarmacia) {
    const res = await fetch(`${API}/medicamentos/farmacia/${filtroFarmacia}`)
    meds = await res.json()
  } else {
    const res = await fetch(`${API}/medicamentos/farmacia/todos`)
    meds = await res.json()
  }

  todosMedicamentos = Array.isArray(meds) ? meds : []
  const mapaFarmacias = Object.fromEntries(todasFarmacias.map(f => [f.id, f.nome]))
  const tbody = document.getElementById('tabela-medicamentos')
  tbody.innerHTML = ''

  if (!todosMedicamentos.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="loading">Nenhum medicamento encontrado</td></tr>'
    return
  }

  todosMedicamentos.forEach(m => {
    tbody.innerHTML += `
      <tr>
        <td>${mapaFarmacias[m.farmacia_id] || '—'}</td>
        <td><strong>${m.nome}</strong></td>
        <td>${m.descricao || '—'}</td>
        <td><span class="badge ${m.quantidade > 0 ? 'verde' : 'vermelho'}">${m.quantidade} un.</span></td>
        <td>
          <button class="btn-acao btn-editar" onclick='abrirModalMed(${JSON.stringify(m)})'>Editar</button>
          <button class="btn-acao btn-remover" onclick="removerMedicamento(${m.id})">Remover</button>
        </td>
      </tr>`
  })
}

document.getElementById('form-medicamento').addEventListener('submit', async (e) => {
  e.preventDefault()
  const body = {
    farmacia_id: parseInt(document.getElementById('m-farmacia').value),
    nome: document.getElementById('m-nome').value,
    descricao: document.getElementById('m-descricao').value,
    quantidade: parseInt(document.getElementById('m-quantidade').value) || 0
  }
  if (!body.farmacia_id) return mostrarMsg('Selecione uma farmácia.', 'erro')
  const res = await fetch(`${API}/medicamentos`, { method: 'POST', headers, body: JSON.stringify(body) })
  if (!res.ok) return mostrarMsg('Erro ao cadastrar medicamento.', 'erro')
  e.target.reset()
  mostrarMsg('Medicamento cadastrado!')
  await carregarMedicamentos()
  carregarResumo()
})

async function removerMedicamento(id) {
  if (!confirm('Remover este medicamento?')) return
  const res = await fetch(`${API}/medicamentos/${id}`, { method: 'DELETE', headers })
  if (!res.ok) return mostrarMsg('Erro ao remover.', 'erro')
  mostrarMsg('Medicamento removido.')
  await carregarMedicamentos()
  carregarResumo()
}

function abrirModalMed(m) {
  document.getElementById('edit-med-id').value = m.id
  document.getElementById('edit-med-nome').value = m.nome
  document.getElementById('edit-med-descricao').value = m.descricao || ''
  document.getElementById('edit-med-quantidade').value = m.quantidade
  document.getElementById('modal-med').classList.add('aberto')
}

async function salvarEdicaoMed() {
  const id = document.getElementById('edit-med-id').value
  const body = {
    nome: document.getElementById('edit-med-nome').value,
    descricao: document.getElementById('edit-med-descricao').value,
    quantidade: parseInt(document.getElementById('edit-med-quantidade').value) || 0
  }
  const res = await fetch(`${API}/medicamentos/${id}`, { method: 'PUT', headers, body: JSON.stringify(body) })
  if (!res.ok) return mostrarMsg('Erro ao atualizar.', 'erro')
  fecharModal('modal-med')
  mostrarMsg('Medicamento atualizado!')
  carregarMedicamentos()
  carregarResumo()
}

function popularSelectFarmacias(farmacias) {
  const selForm = document.getElementById('m-farmacia')
  const selFiltro = document.getElementById('filtro-farmacia-med')
  const opts = '<option value="">Todas as farmácias</option>' + farmacias.map(f => `<option value="${f.id}">${f.nome}</option>`).join('')
  selFiltro.innerHTML = opts
  selForm.innerHTML = '<option value="">Selecione a farmácia</option>' + farmacias.map(f => `<option value="${f.id}">${f.nome}</option>`).join('')
}

// ── Init ─────────────────────────────────────────────────
iniciarMapaGeral()
iniciarMapaPicker()

carregarResumo().then(() => {
  carregarFarmacias()
  carregarMedicamentos()
})
