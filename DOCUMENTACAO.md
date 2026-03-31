# FarmaOn — Documentação Técnica Completa

## Visão Geral

**FarmaOn** é um sistema web de localização de farmácias desenvolvido para Angola (Luanda).
Permite ao utilizador encontrar farmácias próximas, pesquisar medicamentos e ver onde estão disponíveis.
O painel de administração permite gerir farmácias e medicamentos em tempo real.

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Frontend | HTML, CSS, JavaScript puro |
| Backend | Node.js + Express |
| Banco de dados | PostgreSQL via Supabase |
| Mapa | Leaflet.js + OpenStreetMap |
| Animações | AOS (Animate On Scroll) |
| Ícones | Font Awesome |
| Hospedagem | Render (back + front juntos) |

---

## Estrutura de Pastas

```
farma/
├── frontend/
│   ├── index.html              ← Página principal com pesquisa
│   ├── localizar.html          ← Mapa + listagem de farmácias
│   ├── sobre.html              ← Sobre o projeto + acesso secreto ao admin
│   ├── estilo/
│   │   └── style.css           ← Estilos globais do front
│   ├── img/                    ← Imagens do projeto
│   ├── js/
│   │   ├── config.js           ← URL da API (local vs produção)
│   │   ├── javaS               ← Menu mobile (original do projeto)
│   │   ├── index.js            ← Lógica da página principal
│   │   └── localizar.js        ← Mapa, cards, modal, geolocalização
│   └── admin/
│       ├── index.html          ← Login do painel admin
│       ├── dashboard.html      ← Painel de gestão completo
│       └── js/
│           ├── login.js        ← Autenticação do admin
│           └── dashboard.js    ← Gestão de farmácias e medicamentos
├── backend/
│   ├── src/
│   │   ├── app.js              ← Servidor Express principal
│   │   ├── routes/
│   │   │   ├── auth.js         ← Rota de login admin
│   │   │   ├── farmacias.js    ← Rotas CRUD de farmácias
│   │   │   └── medicamentos.js ← Rotas CRUD de medicamentos
│   │   ├── controllers/
│   │   │   ├── authController.js         ← Lógica de autenticação
│   │   │   ├── farmaciasController.js    ← Lógica de farmácias
│   │   │   └── medicamentosController.js ← Lógica de medicamentos
│   │   ├── middlewares/
│   │   │   └── auth.js         ← Middleware de verificação de token
│   │   └── supabase/
│   │       ├── client.js       ← Instância do cliente Supabase
│   │       └── schema.sql      ← Script SQL para criar tabelas e função
│   ├── .env                    ← Variáveis de ambiente (não versionar)
│   └── package.json
├── .htaccess                   ← Redirecionamento Apache/XAMPP
└── index.html                  ← Fallback de redirecionamento para XAMPP
```

---

## Banco de Dados (Supabase / PostgreSQL)

### Modelo de Dados

#### Decisão de design
Inicialmente o modelo tinha 3 tabelas: `farmacias`, `medicamentos` e `estoque`.
Foi simplificado para 2 tabelas porque cada medicamento pertence a uma farmácia específica,
tornando a tabela `estoque` redundante.

#### Tabela `farmacias`
```sql
CREATE TABLE farmacias (
  id        SERIAL PRIMARY KEY,
  nome      TEXT NOT NULL,
  endereco  TEXT,
  telefone  TEXT,
  latitude  DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL
);
```

#### Tabela `medicamentos`
```sql
CREATE TABLE medicamentos (
  id          SERIAL PRIMARY KEY,
  farmacia_id INT NOT NULL,
  nome        TEXT NOT NULL,
  descricao   TEXT,
  quantidade  INT DEFAULT 0,
  CONSTRAINT fk_farmacia FOREIGN KEY (farmacia_id)
    REFERENCES farmacias(id) ON DELETE CASCADE
);
```
- `farmacia_id` com `ON DELETE CASCADE` garante que ao remover uma farmácia, todos os seus medicamentos são removidos automaticamente.
- A foreign key nomeada (`fk_farmacia`) é necessária para o Supabase reconhecer o relacionamento e permitir joins via API.

#### Função `farmacias_proximas`
```sql
CREATE OR REPLACE FUNCTION farmacias_proximas(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  raio_metros INT
)
RETURNS TABLE (
  id INT, nome TEXT, endereco TEXT, telefone TEXT,
  latitude DOUBLE PRECISION, longitude DOUBLE PRECISION,
  distancia DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT f.id, f.nome, f.endereco, f.telefone, f.latitude, f.longitude,
    (6371000 * acos(
      LEAST(1.0, cos(radians(lat)) * cos(radians(f.latitude)) *
      cos(radians(f.longitude) - radians(lng)) +
      sin(radians(lat)) * sin(radians(f.latitude)))
    )) AS distancia
  FROM farmacias f
  WHERE (6371000 * acos(
    LEAST(1.0, cos(radians(lat)) * cos(radians(f.latitude)) *
    cos(radians(f.longitude) - radians(lng)) +
    sin(radians(lat)) * sin(radians(f.latitude)))
  )) <= raio_metros
  ORDER BY distancia;
END;
$$ LANGUAGE plpgsql;
```
- Usa a **fórmula de Haversine** para calcular distância entre coordenadas geográficas.
- `LEAST(1.0, ...)` evita erros de domínio no `acos()` quando os pontos são idênticos.
- Chamada via `supabase.rpc('farmacias_proximas', {...})`.

#### Permissões (RLS desativado)
```sql
ALTER TABLE farmacias DISABLE ROW LEVEL SECURITY;
ALTER TABLE medicamentos DISABLE ROW LEVEL SECURITY;
GRANT ALL ON farmacias TO anon, authenticated, service_role;
GRANT ALL ON medicamentos TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION farmacias_proximas TO anon, authenticated, service_role;
```
- O Supabase ativa RLS por padrão, bloqueando inserts com a chave `anon`.
- Foi desativado porque a autenticação é gerida pelo próprio backend (token no `.env`).

---

## Backend (Node.js + Express)

### Variáveis de Ambiente (`.env`)
```
SUPABASE_URL=https://arqiyfvhgrtdntqosjip.supabase.co
SUPABASE_KEY=<anon key>
PORT=3000
ADMIN_SENHA=FarmaOn@2025
ADMIN_TOKEN=farmaon-admin-token-2025-xK9mP2qL
FRONTEND_URL=http://localhost/farma/frontend/index.html
```

### `app.js` — Servidor principal
- Usa `cors()` aberto porque front e back estão na mesma origem no Render.
- `express.static()` serve a pasta `frontend/` como ficheiros estáticos.
- Rota `GET /` retorna explicitamente o `frontend/index.html` para garantir que o Render serve a página correta.

```js
app.use(express.static(path.join(__dirname, '../../frontend')))
app.get('/', (req, res) => res.sendFile(path.join(frontendPath, 'index.html')))
```

### Rotas da API

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/api/auth/login` | ❌ | Login do admin |
| GET | `/api/farmacias` | ❌ | Listar todas as farmácias |
| GET | `/api/farmacias/proximas?lat=&lng=` | ❌ | Farmácias num raio de 5km |
| GET | `/api/farmacias/:id` | ❌ | Detalhes de uma farmácia |
| POST | `/api/farmacias` | ✅ | Cadastrar farmácia |
| PUT | `/api/farmacias/:id` | ✅ | Atualizar farmácia |
| DELETE | `/api/farmacias/:id` | ✅ | Remover farmácia |
| GET | `/api/medicamentos/buscar/:nome` | ❌ | Farmácias com o medicamento |
| GET | `/api/medicamentos/farmacia/todos` | ❌ | Todos os medicamentos |
| GET | `/api/medicamentos/farmacia/:id` | ❌ | Medicamentos de uma farmácia |
| POST | `/api/medicamentos` | ✅ | Cadastrar medicamento |
| PUT | `/api/medicamentos/:id` | ✅ | Atualizar medicamento |
| DELETE | `/api/medicamentos/:id` | ✅ | Remover medicamento |

> ✅ = requer header `Authorization: Bearer <token>`

### Ordem das rotas em `medicamentos.js`
As rotas fixas (`/estoque`, `/farmacia/todos`) foram colocadas **antes** das rotas dinâmicas (`/:nome`, `/:id`) para evitar que o Express interprete `estoque` ou `todos` como parâmetros.

### Autenticação Admin
- Login via `POST /api/auth/login` com `{ senha }` no body.
- O backend compara com `ADMIN_SENHA` do `.env` e retorna o `ADMIN_TOKEN`.
- O token é guardado no `localStorage` do browser.
- O middleware `auth.js` verifica o header `Authorization: Bearer <token>` em todas as rotas de escrita.

### Cliente Supabase (`client.js`)
```js
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
  db: { schema: 'public' },
  auth: { persistSession: false }
})
```
- `schema: 'public'` foi adicionado explicitamente para resolver um erro de cache do Supabase que não encontrava a tabela `farmacias`.

### Busca por medicamento — problema e solução
O `.ilike()` em joins do Supabase não funciona diretamente. A solução foi:
1. Buscar os IDs dos medicamentos pelo nome com `.ilike()`.
2. Filtrar o estoque com `.in('medicamento_id', ids)`.

Depois com o novo modelo (sem tabela estoque), ficou ainda mais simples:
```js
supabase.from('medicamentos')
  .select('id, nome, descricao, quantidade, farmacias(...)')
  .ilike('nome', `%${nome}%`)
  .gt('quantidade', 0)
```

---

## Frontend

### `config.js` — Gestão da URL da API
```js
const isLocal = ['localhost', '127.0.0.1', ''].includes(window.location.hostname)
const API = isLocal ? 'http://localhost:3000/api' : '/api'
```
- `''` cobre o caso de abrir via `file://` (hostname vazio).
- Em produção usa `/api` relativo — funciona em qualquer domínio sem hardcodar a URL do Render.
- Incluído antes de todos os outros scripts nos 4 HTMLs que fazem chamadas à API.

### `index.js` — Página principal
- Pesquisa de medicamento redireciona para `localizar.html?medicamento=<nome>`.
- Contador de farmácias busca o número real da API em vez de mostrar "500+" estático.
- Botão BUSCAR adicionado dinamicamente ao lado do input da secção "Pronto para economizar".

### `localizar.js` — Mapa e listagem
- Inicializa o mapa Leaflet centrado em Luanda (`-8.8383, 13.2344`).
- Ao carregar, busca todas as farmácias e renderiza cards + marcadores no mapa.
- Se URL tem `?medicamento=`, busca farmácias que têm esse medicamento.
- Botão "minha localização" usa `navigator.geolocation` e chama `/api/farmacias/proximas`.
- `verMais()` abre um modal com nome, endereço, telefone, coordenadas e lista de medicamentos da farmácia (substituiu o `alert()` original).
- `irParaMapa()` fecha o modal, centraliza o mapa na farmácia e abre o popup do marcador.
- Duplicatas removidas com `.filter((f, i, arr) => arr.findIndex(x => x.id === f.id) === i)`.

### `localizar.html` — Estrutura
- Cards estáticos (Farmácia Esperança, 2F & Filhos, Cor D'Água) foram removidos.
- Substituídos por `<article id="lista-farmacias"></article>` preenchido dinamicamente pelo JS.
- Modal de detalhes adicionado com campos: nome, endereço, telefone, coordenadas, lista de medicamentos e botão "Ver no Mapa".

---

## Painel Admin

### Acesso secreto (`sobre.html`)
O nome **"Makanda Daniel"** no rodapé da página Sobre nós é o gatilho oculto.
Clicar **5 vezes seguidas em menos de 1.5 segundos** redireciona para `admin/index.html`.
Visualmente não há nenhuma indicação de que é clicável.

```js
let cliques = 0, timer
function irAdmin() {
  cliques++
  clearTimeout(timer)
  timer = setTimeout(() => cliques = 0, 1500)
  if (cliques >= 5) { cliques = 0; window.location.href = 'admin/index.html' }
}
```

### Login (`admin/index.html` + `login.js`)
- Campo de senha com verificação via `POST /api/auth/login`.
- Token guardado em `localStorage` como `admin_token`.
- Redireciona para `dashboard.html` em caso de sucesso.
- Enter no campo de senha também aciona o login.

### Dashboard (`dashboard.html` + `dashboard.js`)

#### Visão Geral
- 3 cards: total de farmácias, medicamentos e unidades em estoque.
- Mapa com pins de todas as farmácias cadastradas.
- Listas das 5 farmácias e 5 medicamentos mais recentes.

#### Farmácias
- Formulário de cadastro com mapa clicável para preencher lat/lng automaticamente.
- Tabela com: nome, endereço, telefone, coordenadas, número de medicamentos (badge verde/vermelho).
- Pesquisa em tempo real na tabela.
- Botão **Ver** → modal com mapa da localização + tabela de medicamentos da farmácia.
- Botão **Editar** → modal com campos pré-preenchidos.
- Botão **Remover** → confirmação antes de apagar (apaga também todos os medicamentos via CASCADE).

#### Medicamentos
- Formulário com select de farmácia, nome, quantidade e descrição.
- Filtro por farmácia no topo da tabela.
- Pesquisa em tempo real por nome.
- Badge verde (em estoque) / vermelho (zerado).
- Botão **Editar** → modal com nome, descrição e quantidade.
- Botão **Remover** → confirmação antes de apagar.

#### Problema N+1 corrigido
A versão inicial fazia um fetch por farmácia em loop para carregar medicamentos.
Foi corrigido para fazer 2 requests paralelos:
1. `GET /api/medicamentos/farmacia/todos` → todos os medicamentos.
2. `GET /api/farmacias` → todas as farmácias.
Depois cruza os dados localmente com um mapa `{ farmacia_id: nome }`.

---

## Deploy no Render

### Configuração
```
Root Directory:  backend
Build Command:   npm install
Start Command:   node src/app.js
```

### Variáveis de ambiente no Render
```
SUPABASE_URL=...
SUPABASE_KEY=...
ADMIN_SENHA=...
ADMIN_TOKEN=...
PORT=3000
```

### Como funciona
O Express serve o frontend como ficheiros estáticos a partir de `../../frontend` (relativo ao `src/app.js`).
Assim um único serviço no Render serve tanto o front como o back:

```
https://farma-33vs.onrender.com/           → frontend/index.html
https://farma-33vs.onrender.com/admin/     → frontend/admin/index.html
https://farma-33vs.onrender.com/api/...    → API REST
```

### Problema resolvido: redirect para localhost
O `index.html` da raiz do projeto tinha `window.location.replace('frontend/index.html')`.
No Render isso causava redirect para `http://localhost/farma/frontend/index.html`.
Solução: o `app.js` passou a ter uma rota explícita `GET /` que serve o `frontend/index.html` diretamente via `res.sendFile()`, ignorando o `index.html` da raiz.

---

## Dados no Banco

### Farmácias inseridas
| ID | Nome | Bairro |
|---|---|---|
| 5 | Farmácia Esperança | Ingombota |
| 6 | Farmácia Saúde Viva | Ilha de Luanda |
| 7 | Farmácia Central | Maianga |
| 8 | Farmácia Boa Saúde | Sambizanga |

### Medicamentos por farmácia
| Farmácia | Medicamentos |
|---|---|
| Esperança | Paracetamol, Amoxicilina, Ibuprofeno, Omeprazol, Metformina |
| Saúde Viva | Paracetamol, Azitromicina, Loratadina, Captopril, Vitamina C |
| Central | Ibuprofeno, Amoxicilina, Diclofenac, Atenolol, Salbutamol, Omeprazol |
| Boa Saúde | Paracetamol, Metronidazol, Vitamina D, Loratadina, Captopril, Insulina NPH |

---

## Problemas Encontrados e Soluções

| Problema | Causa | Solução |
|---|---|---|
| `Cannot GET /` | Express sem rota raiz | Adicionado `GET /` com `res.sendFile()` |
| RLS bloqueando inserts | Supabase ativa RLS por padrão | `DISABLE ROW LEVEL SECURITY` + `GRANT ALL` |
| Schema cache miss | Cliente Supabase sem schema explícito | `db: { schema: 'public' }` no `createClient` |
| CORS bloqueado via `file://` | `hostname` é `''` em `file://` | `config.js` cobre `''` na lista de locais |
| Redirect para localhost no Render | `index.html` da raiz com `window.location.replace` | Rota `GET /` explícita no Express |
| Conflito de rotas `/estoque` vs `/:nome` | Express interpreta `estoque` como parâmetro | Rotas fixas declaradas antes das dinâmicas |
| N+1 requests no dashboard | Loop de fetch por farmácia | `listarTodos` + mapa local de farmácias |
| `.ilike` em join não funciona | Limitação do Supabase JS | Busca em 2 passos: IDs primeiro, depois `.in()` |
| Cards estáticos duplicando com dinâmicos | HTML tinha cards hardcoded | Removidos, substituídos por `article` vazio |
| `alert()` no verMais | Implementação inicial básica | Substituído por modal com detalhes completos |

---

## Como Executar Localmente

```bash
# 1. Instalar dependências
cd c:\xampp\htdocs\farma\backend
npm install

# 2. Configurar .env com as credenciais do Supabase

# 3. Rodar o schema SQL no Supabase SQL Editor

# 4. Iniciar o servidor
npm run dev

# 5. Aceder via XAMPP
http://localhost/farma/frontend/index.html
http://localhost/farma/frontend/admin/index.html

# Ou via Express diretamente
http://localhost:3000/
http://localhost:3000/admin/
```

---

*Documentação gerada em 2025 — Projeto FarmaOn por Makanda Daniel*
