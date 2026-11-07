# Biblioteca: base del capítulo 2 (JWT y rutas autenticadas)

API de una biblioteca universitaria con tres recursos: **libros**, **socios** y **préstamos**.
Los datos viven en memoria (se pierden al reiniciar). El enunciado, con las reglas de negocio,
está en el capítulo 2 del manual; este repositorio es solo el punto de partida.


## Uso

```
npm install
npm run start:dev      # http://localhost:3000
npm test               # tests unitarios (src/**/*.spec.ts)
npm run test:e2e       # tests e2e (test/*.e2e-spec.ts)
```

Requiere Node.js 22.22 o superior.
Si usa Windows PowerShell, los scripts funcionan igual: están definidos en `package.json`.

## Seguridad

`POST /auth/login` recibe `{ "email", "contrasena" }`; el registro `POST /socios` también requiere contraseña (mínimo 8 caracteres). Las contraseñas se guardan con scrypt y no se exponen. `GET /salud`, login y registro son públicos; el resto exige `Authorization: Bearer <accessToken>`. El acceso dura `JWT_TTL` (por defecto `5m`), el emisor se configura con `JWT_ISSUER`, el secreto con `JWT_SECRET` (mínimo 32 bytes) y refresh con `JWT_REFRESH_TTL` (por defecto `7d`).

`POST /auth/refresh` recibe `{ "refreshToken" }` y lo rota; reutilizar uno consumido invalida la familia. `POST /auth/logout` revoca el refresh token de ese dispositivo y `POST /auth/logout-todos` revoca las sesiones de la cuenta. Los datos de sesión viven en memoria.

Los roles se consultan en el repositorio de socios para cada autorización; el rol incluido en el JWT es informativo. Así, degradar un bibliotecario tiene efecto inmediato aunque conserve un access token vigente.
