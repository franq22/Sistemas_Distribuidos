NestJS:

```bash
npm run backend:dev
```

Next.js:

```bash
npm run dev
```

La app queda en <http://localhost:3000>. Next reenvía `/api/*` al backend que escucha en `http://localhost:3001`.

### Documentación API

 <http://localhost:3001/docs> para Swagger UI.

| Método | Ruta | Acción |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Crear cuenta e iniciar sesión |
| `POST` | `/api/auth/login` | Iniciar sesión |
| `POST` | `/api/auth/logout` | Cerrar sesión |
| `GET` | `/api/auth/me` | Consultar la cuenta activa |
| `GET` | `/api/notes` | Listar notas de la cuenta |
| `POST` | `/api/notes` | Crear nota |
| `PATCH` | `/api/notes/:id` | Editar nota |
| `PATCH` | `/api/notes/:id/notified` | Marcar recordatorio como enviado |
| `DELETE` | `/api/notes/:id` | Eliminar nota |
