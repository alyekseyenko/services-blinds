# Twenty CRM Integration Setup

## Overview
This application integrates directly with Twenty CRM using REST API to manage technician schedules, tasks, and status updates. **No mock data - only real data from Twenty CRM.**

## Prerequisites

- Twenty CRM instance running (default: `http://localhost:3001`)
- Twenty CRM API key with Admin permissions
- n8n instance for webhooks (optional but recommended)

## Configuration

### 1. Environment Variables

Update the `.env.local` file with your Twenty CRM credentials:

```env
TWENTY_API_KEY=your_api_key_here
TWENTY_API_URL=http://localhost:3001
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/technician-sync
```

### 2. Twenty CRM API Configuration

The application expects the following Twenty CRM structure:

#### Tasks/Agendamentos Entity

- **id**: Unique task identifier
- **title**: Task description (e.g., "Visita Técnica - Medidas Estores")
- **clientName**: Customer name
- **address**: Service address
- **status**: Current status ("Agendado", "Concluído", "Incompleto", "Cancelado")
- **dueDate**: Scheduled date/time for the task
- **coordinates**: GPS coordinates for map display `{ lat, lng }`
- **technicianEmail**: Assigned technician's email
- **report**: Observations/notes field for status updates

### 3. API Endpoints

The application uses the following Twenty CRM API endpoints:

#### Fetch Tasks
```
GET /api/tasks
Headers: Authorization: Bearer <API_KEY>
```

#### Update Task Status
```
PATCH /api/tasks/:id
Headers: Authorization: Bearer <API_KEY>
Body: {
  "status": "Concluído",
  "report": "Observações aqui",
  "updatedAt": "2026-06-19T14:30:00.000Z"
}
```

## Integration Flow

### Login Process

1. Technician enters email/password
2. App synchronizes with n8n webhook (if configured)
3. App redirects to dashboard
4. Dashboard fetches tasks from Twenty CRM for the technician

### Task Status Update

1. Technician selects a task from map or calendar
2. Chooses status: Concluído, Incompleto, or Cancelado
3. Adds mandatory observations for Incompleto/Cancelado
4. App updates Twenty CRM via API
5. App refreshes local task state

## Data Mapping

| Twenty CRM Field | App Field | Description |
|------------------|-----------|-------------|
| id | id + twentyId | Task identifier |
| title | title | Task description |
| clientName | client | Customer name |
| address | address | Service location |
| status | status | Task status |
| dueDate | dueDate | Scheduled time |
| coordinates | coordinates | GPS for map |
| technicianEmail | (filter) | Task assignment |
| report | report | Observations |

## API Integration

The application connects directly to Twenty CRM using REST API:

- **Direct API calls**: No proxy or intermediate layer
- **Error handling**: Clear error messages if API is unavailable
- **Authentication**: Bearer token authentication
- **Multiple endpoint support**: Tries different API endpoint formats automatically

## Testing the Integration

### 1. Test API Connection

```bash
# Test fetching tasks
curl -H "Authorization: Bearer YOUR_API_KEY" http://localhost:3001/api/tasks

# Test updating a task
curl -X PATCH \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"status":"Concluído","report":"Test update"}' \
  http://localhost:3001/api/tasks/TASK_ID
```

### 2. Test the App Flow

1. Start the dev server: `npm run dev`
2. Login with a technician email
3. Verify tasks load from Twenty CRM
4. Test status updates with observations
5. Verify updates sync back to Twenty CRM

## Troubleshooting

### API Connection Issues

- **Connection refused**: Ensure Twenty CRM is running on the configured URL
- **401 Unauthorized**: Verify API key is correct and has Admin permissions
- **404 Not Found**: Check API endpoint paths match your Twenty CRM setup
- **No tasks loaded**: Verify tasks exist in Twenty CRM with correct technicianEmail

### Data Not Loading

- **Empty task list**: Verify tasks exist in Twenty CRM with correct technicianEmail
- **Coordinates missing**: Tasks without coordinates won't show on map
- **Date format issues**: Ensure dueDate is in ISO format

### Status Update Failures

- **Update fails**: Check task ID exists and API key has write permissions
- **Report not saving**: Verify the report field exists in Twenty CRM
- **API errors**: Check browser console and server logs for detailed error messages

## Security Notes

- Never commit `.env.local` to version control
- Use environment variables for all sensitive data
- Rotate API keys regularly in production
- Consider implementing authentication for n8n webhooks

## Current Status

- ✅ **No mock data** - Application uses only real data from Twenty CRM
- ✅ **Direct API integration** - REST API calls to Twenty CRM
- ✅ **Error handling** - Clear error messages when API is unavailable
- ✅ **Real-time updates** - Status changes sync immediately with Twenty CRM