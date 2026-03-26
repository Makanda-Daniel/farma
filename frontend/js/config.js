const isLocal = ['localhost', '127.0.0.1', ''].includes(window.location.hostname)
const API = isLocal
  ? 'http://localhost:3000/api'
  : '/api'
