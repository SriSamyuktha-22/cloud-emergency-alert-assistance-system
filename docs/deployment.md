# AWS deployment guide

This project is designed to be developed locally first and then moved to AWS.

## Step 1 — Create DynamoDB tables

Region example: `ap-south-1` (Mumbai).

Create these tables:

### EmergencyUsers
- Partition key: `email` (String)

### EmergencyContacts
- Partition key: `userId` (String)
- Sort key: `id` (String)

### EmergencyAlerts
- Partition key: `id` (String)

For a college demo, DynamoDB on-demand / pay-per-request is convenient. Check the current AWS pricing page before deploying because AWS free-tier terms can change.

## Step 2 — IAM

Create an IAM user/role for the backend with only the permissions required by this project:
- DynamoDB read/write on the three tables
- SNS Publish
- SES SendEmail (if email is used)
- CloudWatch logging

Do not hard-code AWS keys in source code. On AWS Lambda, prefer an IAM execution role.

For local testing, AWS CLI credentials can be configured with:
```bash
aws configure
```

## Step 3 — Configure backend

Copy `.env.example` to `.env` and set:
```env
USE_AWS=true
AWS_REGION=ap-south-1
USERS_TABLE=EmergencyUsers
CONTACTS_TABLE=EmergencyContacts
ALERTS_TABLE=EmergencyAlerts
JWT_SECRET=replace-with-a-long-random-secret
```

## Step 4 — SNS

AWS SNS SMS may require account/region configuration and may have spending limits or verification requirements. Add a real E.164 phone number for testing, e.g. `+9198xxxxxxxx`.

Never test SMS repeatedly without checking your AWS account's current SMS pricing/limits.

## Step 5 — SES

If email is required:
1. Verify the sender identity in SES.
2. During SES sandbox mode, recipient identities may also need verification.
3. Set `SES_FROM_EMAIL`.

## Step 6 — Frontend build

```bash
cd frontend
npm install
npm run build
```

Upload the generated `dist/` directory to an S3 bucket configured for static hosting or serve it through CloudFront.

Set:
```env
VITE_API_URL=https://YOUR-API-DOMAIN/api
VITE_SOCKET_URL=https://YOUR-SOCKET-DOMAIN
```

## Step 7 — API/Lambda note

The supplied backend runs directly with Express for easy VS Code demonstration. For a production serverless deployment, expose the Express routes through API Gateway/Lambda using a Lambda adapter, or split the routes into Lambda handlers. The same database and notification modules can be reused.

## Security checklist
- Use HTTPS.
- Rotate JWT secret.
- Never commit `.env`.
- Use least-privilege IAM.
- Enable CloudWatch alarms.
- Validate GPS coordinates server-side.
- Add rate limiting/WAF for public deployment.
- Add CAPTCHA and alert cooldown to reduce false alarms.
- Encrypt DynamoDB data using AWS-managed encryption.
- Restrict responder/admin APIs by role.
