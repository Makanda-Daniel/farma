-- Apagar tabelas se existirem (ordem importa por causa das FK)
DROP TABLE IF EXISTS medicamentos;
DROP TABLE IF EXISTS farmacias;

-- Tabela de farmácias
CREATE TABLE farmacias (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  endereco TEXT,
  telefone TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL
);

-- Tabela de medicamentos vinculada à farmácia
CREATE TABLE medicamentos (
  id SERIAL PRIMARY KEY,
  farmacia_id INT NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  quantidade INT DEFAULT 0,
  CONSTRAINT fk_farmacia FOREIGN KEY (farmacia_id) REFERENCES farmacias(id) ON DELETE CASCADE
);

-- Desativar RLS (Row Level Security) para permitir acesso via anon key
ALTER TABLE farmacias DISABLE ROW LEVEL SECURITY;
ALTER TABLE medicamentos DISABLE ROW LEVEL SECURITY;

-- Garantir permissões completas para anon e service_role
GRANT ALL ON farmacias TO anon, authenticated, service_role;
GRANT ALL ON medicamentos TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- Função para buscar farmácias próximas por raio (em metros)
CREATE OR REPLACE FUNCTION farmacias_proximas(lat DOUBLE PRECISION, lng DOUBLE PRECISION, raio_metros INT)
RETURNS TABLE (
  id INT, nome TEXT, endereco TEXT, telefone TEXT,
  latitude DOUBLE PRECISION, longitude DOUBLE PRECISION, distancia DOUBLE PRECISION
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

-- Permissão para executar a função
GRANT EXECUTE ON FUNCTION farmacias_proximas TO anon, authenticated, service_role;
