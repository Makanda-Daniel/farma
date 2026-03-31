
const map = L.map('map').setView([-8.8383, 13.2344], 13)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: 'OpenStreetMap'
}).addTo(map)

const marcadores = []
let farmaciaAtual = null
const carousels = {}

function limparMarcadores() {
  marcadores.forEach(m => map.removeLayer(m))
  marcadores.length = 0
  Object.values(carousels).forEach(c => clearInterval(c))
  Object.keys(carousels).forEach(k => delete carousels[k])
}

function criarCarousel(fotos, index) {
  if (!fotos || !fotos.length) {
    return `<p class="ft" style="background-image:url('img/${(index % 3) + 1}.jpeg');background-position:center;background-size:cover"></p>`
  }
  const id = `carousel-${Date.now()}-${index}`
  const imgs = fotos.map((url, i) =>
    `<img src="${url}" data-idx="${i}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:${i === 0 ? 1 : 0};transition:opacity 0.8s ease">`
  ).join('')
  setTimeout(() => iniciarCarousel(id, fotos.length), 100)
  return `<div id="${id}" style="position:relative;height:200px;overflow:hidden">${imgs}</div>`
}

function iniciarCarousel(id, total) {
  if (total <= 1) return
  let atual = 0
  carousels[id] = setInterval(() => {
    const el = document.getElementById(id)
    if (!el) { clearInterval(carousels[id]); return }
    const imgs = el.querySelectorAll('img')
    imgs[atual].style.opacity = 0
    atual = (atual + 1) % total
    imgs[atual].style.opacity = 1
  }, 3000)
}
  const m = L.marker([farmacia.latitude, farmacia.longitude])
    .addTo(map)
    .bindPopup(`<b>${farmacia.nome}</b><br>${farmacia.endereco || ''}`)
  marcadores.push(m)
  return m
}

async function carregarFarmacias() {
  const res = await fetch(`${API}/farmacias`)
  const farmacias = await res.json()
  limparMarcadores()
  renderizarCards(farmacias)
  farmacias.forEach(adicionarMarcador)
}

async function buscarProximas(lat, lng) {
  const res = await fetch(`${API}/farmacias/proximas?lat=${lat}&lng=${lng}`)
  const farmacias = await res.json()
  limparMarcadores()
  renderizarCards(farmacias)
  farmacias.forEach(adicionarMarcador)
  if (farmacias.length) map.setView([lat, lng], 14)
}

async function buscarPorMedicamento(nome) {
  const res = await fetch(`${API}/medicamentos/buscar/${encodeURIComponent(nome)}`)
  const resultados = await res.json()
  const farmacias = resultados
    .filter(r => r.farmacias)
    .map(r => r.farmacias)
    .filter((f, i, arr) => arr.findIndex(x => x.id === f.id) === i) // remove duplicadas
  limparMarcadores()
  renderizarCards(farmacias)
  farmacias.forEach(adicionarMarcador)
}

function renderizarCards(farmacias) {
  const article = document.getElementById('lista-farmacias')
  article.innerHTML = ''

  if (!farmacias.length) {
    article.innerHTML = '<p style="color:#2c3e50;text-align:center;padding:20px">Nenhuma farmácia encontrada.</p>'
    return
  }

  farmacias.forEach((f, i) => {
    const div = document.createElement('div')
    div.className = 'farma'
    div.setAttribute('data-aos', 'fade-up')
    div.innerHTML = `
      ${criarCarousel(f.fotos, i)}
      <p class="txt" style="padding:10px">
        <span>${f.nome}</span><br>
        <small>${f.endereco || ''}</small><br>
        <input type="button" value="Ver Mais" onclick="verMais(${f.id})">
      </p>`
    article.appendChild(div)
  })

  AOS.refresh()
}

function verMais(id) {
  fetch(`${API}/farmacias/${id}`)
    .then(r => r.json())
    .then(f => {
      farmaciaAtual = f
      document.getElementById('modal-nome').textContent = f.nome
      document.getElementById('modal-endereco').textContent = f.endereco ? 'Endereço: ' + f.endereco : ''
      document.getElementById('modal-telefone').textContent = f.telefone ? 'Telefone: ' + f.telefone : ''
      document.getElementById('modal-coords').textContent = `Lat: ${f.latitude} | Lng: ${f.longitude}`
      document.getElementById('modal-farmacia').classList.add('aberto')

      // carrega medicamentos da farmácia no modal
      fetch(`${API}/medicamentos/farmacia/${id}`)
        .then(r => r.json())
        .then(meds => {
          const lista = document.getElementById('modal-medicamentos')
          if (!meds.length) { lista.innerHTML = '<li>Nenhum medicamento cadastrado</li>'; return }
          lista.innerHTML = meds.map(m => `<li><b>${m.nome}</b> — ${m.quantidade} un. ${m.descricao ? '· ' + m.descricao : ''}</li>`).join('')
        })
    })
}

function fecharModal() {
  document.getElementById('modal-farmacia').classList.remove('aberto')
}

function irParaMapa() {
  if (!farmaciaAtual) return
  fecharModal()
  map.setView([farmaciaAtual.latitude, farmaciaAtual.longitude], 16)
  const marcador = marcadores.find(m => {
    const ll = m.getLatLng()
    return ll.lat === farmaciaAtual.latitude && ll.lng === farmaciaAtual.longitude
  })
  if (marcador) marcador.openPopup()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

document.getElementById('ver').addEventListener('click', () => {
  navigator.geolocation.getCurrentPosition(
    pos => buscarProximas(pos.coords.latitude, pos.coords.longitude),
    () => alert('Não foi possível obter sua localização.')
  )
})

const params = new URLSearchParams(window.location.search)
const medicamento = params.get('medicamento')

if (medicamento) {
  buscarPorMedicamento(medicamento)
} else {
  carregarFarmacias()
}
