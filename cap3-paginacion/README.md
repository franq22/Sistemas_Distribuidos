# Biblioteca: base del capítulo 3 (Paginación)

API REST de una biblioteca universitaria (libros, socios y préstamos) sobre **NestJS + TypeORM + MariaDB**.
Todo el entorno corre en Docker: la aplicación, la base de datos y un cliente web de la base.
El enunciado, con las reglas de negocio, está en el capítulo 3 del manual.

## Requisitos

- Docker con Docker Compose (Docker Desktop en Windows y macOS).
- Un cliente REST (extensión REST Client de VS Code, Thunder Client o similar).

No hace falta instalar Node.js ni MariaDB.

## Levantar el entorno

```bash
docker compose up --build
```

La primera vez demora unos minutos: descarga las imágenes, instala las dependencias y crea la base con sus datos.
Cuando en la consola aparezca `Nest application successfully started`, la API está en http://localhost:3000.

| Servicio | Dirección | Para qué |
|---|---|---|
| `api` | http://localhost:3000 | La aplicación NestJS (se recarga al guardar cambios) |
| `db` | `localhost:3306` | MariaDB. Usuario `biblioteca`, contraseña `biblioteca` (root: `root`) |
| `adminer` | http://localhost:8080 | Cliente web: sistema *MySQL*, servidor `db`, usuario `biblioteca`, contraseña `biblioteca` |

Comprobación rápida: `GET http://localhost:3000/salud` debe responder `{"estado":"ok", ...}`.

## Datos de prueba

La base `biblioteca` se crea con estos registros (siempre los mismos, son pseudoaleatorios pero deterministas):

| Tabla | Registros | Observaciones |
|---|---|---|
| `libros` | 100.000 | Unos 9.000 títulos distintos: los títulos **se repiten** (en promedio, 11 libros por título) |
| `socios` | 5.000 | |
| `prestamos` | 42.000 | 40.000 devueltos (algunos con multa) y 2.000 activos, de los cuales unos 1.000 están vencidos |

Las tablas tienen solo clave primaria. Su estructura está en `db/init/01-schema.sql` y los datos en `db/init/02-seed.sql`.

## Probar la API

Con el entorno levantado, pruebe los endpoints con su cliente REST. Por ejemplo:

```http
GET http://localhost:3000/libros/1
GET http://localhost:3000/prestamos/vencidos
```

Atención: hoy `GET /libros` devuelve los 100.000 libros en una sola respuesta.

## Catálogo: paginación, orden y filtros

`GET /libros` usa paginación por desplazamiento. Acepta `pagina` (por defecto `1`, entero desde 1) y `limite` (por defecto `20`, entero entre 1 y 100). Valores inválidos producen `400 Bad Request`. El cuerpo tiene la forma `{ datos, meta }`; `meta` contiene `total`, `pagina`, `limite` y `totalPaginas`. El total permite construir controles de páginas y conocer cuántas páginas hay, como habilita `findAndCount`/`getCount` en offset.

Se pueden combinar estos parámetros:

- `ordenarPor`: `id`, `titulo`, `autor`, `isbn`, `categoria`, `anio`, `ejemplares` o `disponibles` (por defecto `id`).
- `orden`: `ASC` o `DESC` (por defecto `ASC`). Los empates se resuelven por `id` en el mismo sentido para mantener un orden determinista.
- `categoria`: coincidencia exacta.
- `anioDesde` y `anioHasta`: extremos inclusivos del rango; si el mínimo supera al máximo se responde `400`.
- `q`: búsqueda parcial sin distinguir mayúsculas según la intercalación de MariaDB, en título o autor.

Ejemplo: `GET /libros?pagina=2&limite=10&ordenarPor=anio&orden=DESC&categoria=novela&anioDesde=1950&q=Julio`.

### Recorrido por cursor

`GET /libros/cursor?limite=20&despues=...` devuelve libros ordenados por `titulo` y luego `id`. `limite` acepta de 1 a 100 (por defecto 20). `meta.siguiente` es el cursor opaco que se envía como `despues` en la próxima solicitud; es `null` al finalizar. El cursor codifica la última pareja título/ID y una marca de agua del ID máximo presente al iniciar el recorrido. Así, títulos repetidos no omiten filas y los libros insertados después de comenzar quedan fuera de ese recorrido, que conserva su conjunto inicial. Se omite el total: el cliente solo necesita saber si hay otra página, y contar el catálogo añade una consulta cuyo costo no aporta al recorrido por cursor.

### Socios y préstamos

La paginación por desplazamiento comparte `PaginacionDto` y `paginarQuery` en los listados, con `pagina` (1 por defecto) y `limite` (20 por defecto, máximo 100), y la misma respuesta `{ datos, meta }`. `GET /socios` admite ambos parámetros. `GET /prestamos` y `GET /prestamos/vencidos` también los admiten; los listados de préstamos se ordenan por ID ascendente.

`GET /prestamos` además permite combinar `socioId` y `estado=activo|devuelto|vencido`. Activo significa sin devolución; devuelto, con devolución registrada; vencido, sin devolución y con vencimiento anterior al momento de la consulta. `GET /prestamos/vencidos` mantiene ese filtro y acepta `socioId`, `pagina` y `limite`.

## Ejecutar los tests

Los tests corren dentro del contenedor de la API, con la base en funcionamiento:

```bash
docker compose exec api npm test          # unitarios
docker compose exec api npm run test:e2e  # e2e
```

Los tests e2e usan la base **`biblioteca_test`**, que existe vacía y con la misma estructura, de modo que nunca modifican los datos de prueba.
Si el entorno no está levantado, use `docker compose run --rm api npm run test:e2e` (levanta la base y ejecuta los tests).

## Operaciones útiles

```bash
docker compose logs -f api      # ver el registro de la aplicación
docker compose restart api      # reiniciar la API (si no detecta cambios de archivos en Windows)
docker compose exec db mariadb -ubiblioteca -pbiblioteca biblioteca   # consola SQL
docker compose down             # detener el entorno (se conservan los datos)
docker compose down -v          # detener y BORRAR los datos: la próxima vez se regeneran desde cero
```

Si modifica `db/init/*.sql`, los cambios solo se aplican al recrear la base con `docker compose down -v`.
Si agrega dependencias a `package.json`, reconstruya con `docker compose up --build`.
