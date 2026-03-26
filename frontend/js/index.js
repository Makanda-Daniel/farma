
const form = document.querySelector('#caixal form')
const inputBusca = document.querySelector('#caixal input')
const inputEscolhe = document.querySelector('#sessaoEscolhe input')

function pesquisarMedicamento(nome) {
  if (!nome.trim()) return
  window.location.href = `localizar.html?medicamento=${encodeURIComponent(nome)}`
}

form.addEventListener('submit', (e) => {
  e.preventDefault()
  pesquisarMedicamento(inputBusca.value)
})

inputEscolhe.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') pesquisarMedicamento(inputEscolhe.value)
})

// botão ao lado do input da secção escolhe
const btnEscolhe = document.createElement('button')
btnEscolhe.textContent = 'BUSCAR'
btnEscolhe.style.cssText = 'margin-top:10px;padding:12px 24px;background:#27ae60;color:white;border:none;border-radius:7px;font-size:1em;cursor:pointer'
btnEscolhe.onclick = () => pesquisarMedicamento(inputEscolhe.value)
inputEscolhe.insertAdjacentElement('afterend', btnEscolhe)

// contador real de farmácias
fetch(`${API}/farmacias`)
  .then(r => r.json())
  .then(farmacias => {
    const el = document.querySelector('#sessaoft h1')
    if (el) el.textContent = farmacias.length + '+'
  })
  .catch(() => {})
