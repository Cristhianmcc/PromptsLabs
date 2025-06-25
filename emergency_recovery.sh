#!/bin/bash
# Script de recuperación para cuando el despliegue falla por problemas de base de datos

echo "===== INICIANDO RECUPERACIÓN DE BASE DE DATOS ====="
echo "Fecha: $(date)"

# Directorio de trabajo
WORK_DIR="$(pwd)"
echo "Directorio de trabajo: $WORK_DIR"

# Crear directorios necesarios
mkdir -p ./data
mkdir -p ./data/images

# Eliminar la base de datos si existe pero está corrupta
if [ -f "./data/prompts.db" ]; then
  echo "Eliminando base de datos existente..."
  rm ./data/prompts.db
  echo "Base de datos eliminada."
fi

# Copiar imágenes necesarias
echo "Copiando imágenes necesarias..."
if [ -d "./images" ]; then
  cp -v ./images/placeholder.jpg ./data/images/ 2>/dev/null || echo "Error al copiar placeholder.jpg"
  
  # Copiar imágenes numeradas que se usan en defaultData.js
  for i in {1..16}; do
    if [ -f "./images/$i.jpg" ]; then
      cp -v "./images/$i.jpg" "./data/images/" 2>/dev/null || echo "Error al copiar $i.jpg"
    fi
  done
else
  echo "ADVERTENCIA: No se encontró el directorio de imágenes"
fi

# Crear una base de datos mínima para pruebas
echo "Creando base de datos SQLite mínima..."

sqlite3 ./data/prompts.db << EOF
CREATE TABLE prompts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  image TEXT NOT NULL,
  prompt TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE prompt_categories (
  prompt_id INTEGER,
  category_id INTEGER,
  PRIMARY KEY (prompt_id, category_id),
  FOREIGN KEY (prompt_id) REFERENCES prompts(id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar un usuario administrador por defecto
INSERT INTO users (username, password, salt)
VALUES ('admin', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'default_salt');

-- Insertar categorías de ejemplo
INSERT INTO categories (name, slug, description)
VALUES 
  ('Paisajes', 'paisajes', 'Prompts de la categoría Paisajes'),
  ('Retratos', 'retratos', 'Prompts de la categoría Retratos'),
  ('Fantasía', 'fantasia', 'Prompts de la categoría Fantasía'),
  ('Tecnología', 'tecnologia', 'Prompts de la categoría Tecnología');

-- Insertar algunos prompts de ejemplo
INSERT INTO prompts (image, prompt)
VALUES 
  ('1.jpg', 'Un paisaje futurista con ciudades flotantes y naves espaciales, estilo cyberpunk, colores neón, 8k ultra detallado'),
  ('2.jpg', 'Retrato artístico de una mujer joven con flores en el cabello, estilo acuarela, iluminación suave, look etéreo'),
  ('3.jpg', 'Un dragón majestuoso volando sobre montañas nevadas, estilo fantasía épica, colores vibrantes, detalle realista');

-- Relacionar prompts con categorías
INSERT INTO prompt_categories (prompt_id, category_id)
VALUES 
  (1, 1), -- Paisaje con Paisajes
  (2, 2), -- Retrato con Retratos
  (3, 3); -- Dragón con Fantasía
EOF

echo "Base de datos creada exitosamente."

# Configurar permisos
echo "Configurando permisos..."
chmod -R 755 ./data
chmod -R 755 ./data/images
chmod 644 ./data/prompts.db

echo "===== RECUPERACIÓN COMPLETADA ====="
echo "Ahora puedes reiniciar el servidor Node.js"
