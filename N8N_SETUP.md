# N8N Webhook Integration Setup

## Overview
This application uses n8n webhooks to synchronize technician data between the app-tecnicos portal and Twenty CRM.

## Configuration

### 1. Set up N8N Webhook

Create a new n8n workflow with a Webhook trigger:

- **Method**: POST
- **Path**: `/webhook/technician-sync`
- **Authentication**: None (or configure as needed)

### 2. Configure the Environment Variable

Update the `.env.local` file with your n8n webhook URL:

```env
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/technician-sync
```

### 3. Webhook Payload Format

The app sends the following payload to the n8n webhook:

```json
{
  "event": "technician_login",
  "technician": {
    "email": "tecnico@empresa.com",
    "loginTime": "2026-06-19T14:30:00.000Z"
  },
  "timestamp": "2026-06-19T14:30:00.000Z"
}
```

### 4. N8N Workflow Suggestions

Your n8n workflow can:

1. **Fetch technician data from Twenty CRM** using the email
2. **Update technician status** in Twenty CRM to "Online"
3. **Log the login event** for audit purposes
4. **Send notifications** to managers if needed
5. **Sync technician's schedule** for the day

### 5. Example N8N Workflow

```javascript
// Webhook Trigger
// ↓
// Twenty CRM Node: Find technician by email
// ↓
// Twenty CRM Node: Update last login timestamp
// ↓
// Twenty CRM Node: Fetch today's tasks
// ↓
// Response: Return success/failure status
```

## Testing

Test the webhook integration by:

1. Start the development server: `npm run dev`
2. Login with a technician email
3. Check the n8n execution logs to verify the webhook was triggered
4. Verify the data flow in Twenty CRM

## Troubleshooting

- **Webhook not triggered**: Check the N8N_WEBHOOK_URL in .env.local
- **CORS errors**: Ensure your n8n instance allows CORS from your app domain
- **Authentication failures**: Verify n8n webhook authentication settings

## Security Notes

- Use HTTPS for webhook URLs in production
- Consider adding authentication headers to the webhook calls
- Validate webhook payloads in n8n before processing