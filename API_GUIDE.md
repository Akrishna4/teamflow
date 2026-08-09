# TeamFlow API Guide

Welcome to the TeamFlow REST API documentation. This guide explains the core concepts, patterns, and conventions used throughout the system.

For interactive endpoint testing, please visit the **Swagger Playground** by navigating to `/api/docs` while the backend server is running.

## Authentication

TeamFlow secures all non-public endpoints using JSON Web Tokens (JWT). 

1. **Obtain a Token**: Send credentials to `POST /api/auth/login`.
2. **Authorize Requests**: Include the returned token in the HTTP `Authorization` header.

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5...
```

## Endpoint Groups

The API is versioned and modularized under `/api/v1/`:

- `/auth`: Login, Registration, Token management.
- `/projects`: Workspaces and access boundaries.
- `/tasks`: Core Kanban items.
- `/comments`: Task discussions.
- `/checklists`: Task sub-items.
- `/labels`: Project-level taxonomy.
- `/attachments`: File uploads.
- `/search`: Global command-palette searching.
- `/views`: User-specific saved filter preferences.

## Common Request Patterns

### Pagination
List endpoints that can return large datasets (e.g., Activity Timeline, Search) support offset-based pagination via query parameters:
- `?page=1` (default: 1)
- `?limit=20` (default: 20)

**Response Format**:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 145,
    "pages": 8
  }
}
```

### Rate Limits
To protect against brute-force attacks, authentication routes (`/api/auth/*`) are strictly rate-limited to **20 requests per 15 minutes** per IP address. Exceeding this limit returns HTTP `429 Too Many Requests`.

## Error Responses

All errors are returned in a predictable JSON structure for easy frontend parsing.

```json
{
  "status": "error",
  "message": "Detailed human-readable message explaining the failure."
}
```

**Common Status Codes**:
- `400 Bad Request`: Validation failure or missing fields.
- `401 Unauthorized`: Missing, invalid, or expired JWT.
- `403 Forbidden`: Authenticated, but lacking RBAC permission to access the specific resource.
- `404 Not Found`: The requested resource ID does not exist.
- `500 Internal Server Error`: An unexpected failure; automatically logged and monitored via Pino.
