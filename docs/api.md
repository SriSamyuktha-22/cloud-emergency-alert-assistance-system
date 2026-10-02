# API Design

Base URL: `/api`

## Authentication
### POST /auth/register
```json
{"name":"Sam","email":"sam@example.com","password":"Password@123","phone":"+919876543210"}
```
Returns `201`.

### POST /auth/login
```json
{"email":"user@demo.com","password":"User@123"}
```
Returns JWT and public user.

## Contacts
`GET /contacts` — authenticated user contacts.

`POST /contacts`
```json
{"name":"Parent","phone":"+919999999999","email":"parent@example.com","relationship":"Parent"}
```

## Alerts
`POST /alerts`
```json
{
  "latitude":10.3673,
  "longitude":77.9803,
  "accuracy":12,
  "type":"medical",
  "note":"Need assistance",
  "offlineQueued":false
}
```

`GET /alerts` — users see their alerts; responders/admins see all alerts.

`GET /alerts/:id` — fetch one alert.

`PATCH /alerts/:id` — responder/admin status update:
```json
{"status":"Dispatched","note":"Responder vehicle sent"}
```

Statuses: `Received`, `Dispatched`, `Resolved`.

## Status codes
- 200 OK
- 201 Created
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 409 Conflict
- 500 Internal Server Error
