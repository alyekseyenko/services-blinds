# API Setup Guide for Twenty CRM Integration

## Current Status
The app is currently using **mock data** as a fallback because the Twenty CRM API endpoints are not yet configured. The calendar and map functionality are working, but they're showing sample data instead of real data from Twenty CRM.

## Options to Enable Real Data Integration

### Option 1: Create a Simple Proxy API (Recommended)

Create a simple API proxy that translates between your app and Twenty CRM:

1. **Create a new file**: `src/app/api/tasks/route.js`

```javascript
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const technicianEmail = searchParams.get('technicianEmail');
  
  // Here you would fetch from Twenty CRM using their SDK or REST API
  // For now, return mock data that matches Twenty CRM structure
  
  const mockTasks = [
    {
      id: 'task-1',
      title: 'Visita Técnica - Medidas Estores',
      clientName: 'Ana Ferreira',
      address: 'Rua Augusta, 100, Lisboa',
      status: 'Agendado',
      dueDate: new Date().toISOString(),
      coordinates: { lat: 38.7100, lng: -9.1368 },
      technicianEmail: 'tecnico@empresa.com',
      report: ''
    },
    {
      id: 'task-2', 
      title: 'Reparação de Fechadura',
      clientName: 'João Silva',
      address: 'Avenida da Liberdade, Lisboa',
      status: 'Agendado',
      dueDate: new Date(Date.now() + 2*60*60*1000).toISOString(),
      coordinates: { lat: 38.7200, lng: -9.1450 },
      technicianEmail: 'tecnico@empresa.com',
      report: ''
    }
  ];

  const filteredTasks = technicianEmail 
    ? mockTasks.filter(task => task.technicianEmail === technicianEmail)
    : mockTasks;

  return NextResponse.json(filteredTasks);
}

export async function PATCH(request) {
  const body = await request.json();
  const { id, status, report } = body;
  
  // Here you would update the task in Twenty CRM
  console.log(`Updating task ${id} to status ${status} with report: ${report}`);
  
  return NextResponse.json({ success: true, id, status, report });
}
```

2. **Update the .env.local**:
```env
TWENTY_API_URL=http://localhost:3000
```

### Option 2: Use Twenty CRM Direct API

If Twenty CRM has a REST API, you need to:

1. **Find the correct API endpoints** in Twenty CRM documentation
2. **Update the API utility** with the correct endpoints
3. **Configure authentication** properly

Common Twenty CRM API patterns:
- `/api/tasks` or `/graphql` for fetching
- `/api/tasks/:id` for updates
- Bearer token authentication

### Option 3: Use MCP Server

The MCP configuration is set up in `.devin/mcp.json`, but you need to:

1. **Ensure Twenty CRM MCP server is running** on `http://localhost:3001/mcp`
2. **Verify the MCP server is accessible** from your app
3. **Update the API utility** to use MCP tools instead of REST API

## Quick Start (Mock Mode)

For now, the app will work in **mock mode** with sample data. This allows you to:

- ✅ Test the calendar functionality
- ✅ Test the map display  
- ✅ Test the status update workflow
- ✅ Verify the UI/UX flow

## Next Steps

1. **Choose an integration option** above
2. **Implement the chosen approach**
3. **Test with real data**
4. **Update the documentation** with your specific setup

## Troubleshooting

### "N8N webhook URL not configured"
- This is expected if you haven't set up n8n yet
- The app will work without it, just won't sync login events

### "Error fetching tasks from Twenty CRM"
- Check that Twenty CRM is running on the configured URL
- Verify the API key is correct
- Ensure the API endpoints exist

### "Failed to update task: Not Found"  
- The task ID doesn't exist in Twenty CRM
- The API endpoint for updates is not configured correctly

## Testing Mock Mode

To test the current mock mode:

1. Start the dev server: `npm run dev`
2. Login with any email/password
3. You'll see sample tasks in the calendar and map
4. Try updating task status to test the workflow
5. Everything will work with local mock data

## When Ready for Real Integration

1. Implement one of the options above
2. Update the `.env.local` with real credentials
3. Test with actual Twenty CRM data
4. Remove or comment out the mock data fallback

The app is designed to gracefully fall back to mock data when the API is unavailable, so it's safe to develop with the current setup.