# Notification Testing Guide

This guide covers the testing tools available for manually triggering SMS and email notifications in Fund Track.

## Testing Methods

### 1. Web Interface (Recommended)

Navigate to `/dev/test-notifications` in your browser to access the visual testing interface.

**Features:**
- Easy form-based testing for both SMS and email
- Quick-fill from sample leads in your database
- Real-time results display
- View recent notification logs
- Automatic validation

**URL:** `http://localhost:3000/dev/test-notifications`

### 2. API Endpoint

Direct API access for programmatic testing or integration with other tools.

**Endpoint:** `POST /api/dev/test-notifications`

**Email Payload:**
```json
{
  "type": "email",
  "recipient": "test@example.com",
  "subject": "Test Email Subject",
  "message": "Test email message content",
  "leadId": 123
}
```

**SMS Payload:**
```json
{
  "type": "sms",
  "recipient": "+1234567890",
  "message": "Test SMS message content",
  "leadId": 123
}
```

**Response:**
```json
{
  "success": true,
  "externalId": "mg.abc123...",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 3. Command Line Script

For quick testing from the terminal.

**Usage:**
```bash
# Email
node scripts/test-notifications.mjs email "test@example.com" "Test Subject" "Test message"

# SMS
node scripts/test-notifications.mjs sms "+1234567890" "Test SMS message"

# With Lead ID
node scripts/test-notifications.mjs email "test@example.com" "Test" "Message" 123
```

## Environment Setup

Ensure these environment variables are configured:

### Email (Mailgun)
- `MAILGUN_API_KEY`
- `MAILGUN_DOMAIN`
- `MAILGUN_FROM_EMAIL`

### SMS (Twilio)
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

## Testing Tips

1. **Use Real Recipients**: Test with actual email addresses and phone numbers you control
2. **Check Logs**: Monitor the notification logs in the web interface for debugging
3. **Rate Limiting**: Be aware of rate limits (2 per hour per recipient, 10 per day per lead)
4. **Lead Association**: Use the `leadId` parameter to test lead-specific notifications
5. **Error Handling**: Test with invalid recipients to verify error handling

## Common Test Scenarios

### Email Tests
- Basic email delivery
- HTML formatting (line breaks converted to `<br>`)
- Subject line variations
- Long message content

### SMS Tests
- Basic SMS delivery
- Message length limits (160 characters for single SMS)
- International phone number formats
- Special characters in messages

### Error Scenarios
- Invalid email addresses
- Invalid phone numbers
- Missing environment variables
- Rate limit exceeded
- Service unavailable

## Monitoring

The web interface shows:
- Recent notification attempts
- Success/failure status
- External service IDs (for tracking with Mailgun/Twilio)
- Associated lead information
- Timestamps and error messages

## Security Notes

- These testing endpoints are only available in development
- Do not expose testing endpoints in production
- Use test credentials when possible
- Be mindful of costs when testing with real services