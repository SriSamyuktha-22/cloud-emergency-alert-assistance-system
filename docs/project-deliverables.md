# Deliverables 1–3 quick draft

## 1. Abstract
The Cloud-Based Emergency Alert & Assistance System is a web-based emergency response platform designed to reduce the time required to communicate an emergency. A registered user can trigger an SOS alert, capture the browser/device GPS location, select an emergency category, and notify registered emergency contacts. Responders and administrators can view active incidents on a map, accept incidents, update response status, and maintain incident history. AWS services such as DynamoDB, SNS, SES, Lambda/API Gateway, S3, CloudFront, and CloudWatch can be used to provide scalable cloud infrastructure.

## Problem statement
During emergencies, manually calling multiple people can delay assistance and make it difficult to communicate accurate location information. Existing general communication methods may not provide a centralized incident view, responder status, structured history, or role-based emergency workflow.

## Objectives
1. Provide one-click SOS activation.
2. Capture latitude, longitude, timestamp, and emergency type.
3. Notify emergency contacts through SMS/email.
4. Provide responder/admin dashboards.
5. Maintain incident history.
6. Implement role-based access.
7. Support offline SOS queueing.
8. Build an AWS-ready scalable architecture.

## Scope
The project covers registration/login, contact management, SOS creation, GPS capture, notifications, responder status management, map visualization, history, role control, and offline queueing. Integration with official police, ambulance, fire department or hospital systems is outside the basic college-project scope and would require formal APIs and authorization.

## Existing-system gap / literature direction
Conventional emergency communication commonly depends on phone calls or messaging. A centralized cloud application can combine structured incident data, GPS information, responder workflow, notifications, and history in one system. For the final report, literature review should compare emergency alert applications, location-based emergency systems, cloud IoT emergency systems, and notification platforms, while citing the papers actually used.

## 2. Architecture
See `docs/architecture.md` for Mermaid architecture and cloud-service table.

## 3. Requirements
### Functional
- Register/login
- Manage emergency contacts
- Trigger SOS
- Capture GPS
- Select emergency type
- Notify contacts
- View map
- Responder accepts/updates status
- Admin monitoring
- Incident history
- Offline queue

### Non-functional
- Security: authentication, authorization, encryption in transit
- Availability: managed cloud services
- Scalability: serverless/API + DynamoDB
- Latency: minimize API and notification processing time
- Usability: responsive mobile-first interface
- Maintainability: modular backend/frontend
- Auditability: timestamps and incident status history can be extended for formal audit logs
