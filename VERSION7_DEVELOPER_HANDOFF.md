# Version 7 Front-End Feature Status and Backend Requirements

## Evidence & Audit Trail Engine
### What it will do now
- Records front-end action log entries with timestamps
- Records evidence collection entries
- Exports audit report as JSON
- Includes audit and evidence views in Governance tab
### What it will not do
- Does not provide tamper-proof or server-side immutable logging
- Does not cryptographically sign actions
### What is needed to complete it
- Backend audit log service
- Append-only log storage
- Signed event records
- Role-authenticated action attribution

## Scoring & Performance Evaluation System
### What it will do now
- Calculates readiness score and maturity band
- Displays role-based scores
- Tracks trend history locally
### What it will not do
- Does not use authoritative backend timing or supervised grading
- Does not support benchmark baselines across tenants
### What is needed to complete it
- Backend scoring rules engine
- Historical analytics store
- Normalized scoring baselines

## AI Facilitator (Game Master Mode)
### What it will do now
- Shows step-based AI facilitator prompts
- Provides front-end branching decision capture
### What it will not do
- Does not generate real AI responses
- Does not dynamically rewrite scenario based on model output
### What is needed to complete it
- Secure LLM integration
- Prompt orchestration service
- Moderation and audit layer for generated content

## Dynamic Inject Engine
### What it will do now
- Supports manual reveal of injects
- Supports timed auto injects
### What it will not do
- Does not yet evaluate deep conditional branching on backend state
### What is needed to complete it
- Rules engine for conditional injects
- Server-side scheduler if multi-user synchronization is required

## Compliance Mapping Engine
### What it will do now
- Shows NIST/CMMC/CIS mapping by step
### What it will not do
- Does not export evidence-bound control assertions for auditors
### What is needed to complete it
- Compliance content library validation
- Versioned control mapping backend

## After Action Intelligence Engine
### What it will do now
- Generates strengths, gaps, and recommendations from front-end exercise data
### What it will not do
- Does not use real AI analytics or organizational context
### What is needed to complete it
- AI analysis service
- Persistent remediation tracking backend

## Multi-Tenant MSP Mode
### What it will do now
- Provides tenant/client context, white-label name, and front-end MSP views
### What it will not do
- Does not enforce true tenant isolation
### What is needed to complete it
- Multi-tenant backend data model
- Tenant-aware auth and RBAC
- Per-tenant storage separation

## Real Notification Integration
### What it will do now
- Supports simulated notification mode
- Supports front-end flows for SendGrid/Twilio-based live notification mode
### What it will not do
- Will not send live notifications without Vercel environment variables and external services
### What is needed to complete it
- SendGrid account and verified sender
- Twilio account and SMS number
- Secure secret management
- Delivery status logging backend

## Attack Simulation Realism Layer
### What it will do now
- Generates clickable artifacts by step
### What it will not do
- Does not render fully realistic inboxes, SIEM consoles, or endpoint consoles
### What is needed to complete it
- Rich simulated system front ends
- Larger artifact library and scenario-specific data packs

## Decision Tracking & Branching Outcomes
### What it will do now
- Records decisions and quality
### What it will not do
- Does not yet drive full alternate scenario trees from decision outcomes
### What is needed to complete it
- Decision rules engine
- Scenario graph persistence

## Training Mode vs Certification Mode
### What it will do now
- Provides Training and Certification display modes
- Certification mode hides guidance sections
### What it will not do
- Does not lock down all hints or scoring appeals server-side
### What is needed to complete it
- Protected certification workflow
- Signed completion records

## Role-Based UI Experience
### What it will do now
- Supports role-based task filtering
### What it will not do
- Does not enforce role-specific data visibility securely
### What is needed to complete it
- RBAC backend
- User-to-role identity mapping

## Evidence Collection Simulation
### What it will do now
- Records evidence collection items with timestamps
### What it will not do
- Does not support chain-of-custody signatures or binary evidence storage
### What is needed to complete it
- Evidence storage backend
- Chain-of-custody workflow
- File upload and hashing

## Scenario Builder
### What it will do now
- Creates custom scenarios and playbook shells in browser/local storage
### What it will not do
- Does not support shared reusable scenario publishing across users/tenants
### What is needed to complete it
- Backend scenario repository
- Validation/versioning workflow

## Executive Reporting Dashboard
### What it will do now
- Exports executive PDF report
- Displays readiness and governance summaries
### What it will not do
- Does not integrate with real BI dashboards or tenant-wide analytics
### What is needed to complete it
- Reporting backend
- Trend aggregation and board reporting templates

## Time Pressure & SLA Tracking
### What it will do now
- Tracks current step timer and SLA warnings
### What it will not do
- Does not guarantee authoritative timing in multi-user sessions
### What is needed to complete it
- Server-side timing coordination

## Legal & Regulatory Workflow
### What it will do now
- Surfaces compliance/review prompts in workflow
### What it will not do
- Does not provide jurisdiction-specific rule engine
### What is needed to complete it
- Regulatory rule backend
- Jurisdiction mapping content

## Data Persistence & History
### What it will do now
- Persists selected data in browser local storage
### What it will not do
- Does not persist across devices or users
### What is needed to complete it
- Database backend
- Authenticated user history service

## Gamification Layer
### What it will do now
- Tracks simple badges and readiness trend locally
### What it will not do
- Does not maintain authoritative leaderboards
### What is needed to complete it
- Backend scoring leaderboard service

## Security Hardening
### What it will do now
- Maintains front-end MFA demo flow and logoff
- Reduces some broken-reference risk
### What it will not do
- Does not provide real MFA, secure session management, RBAC, secure API auth, or encrypted storage
### What is needed to complete it
- Real identity provider (Auth0, Okta, Azure AD B2C, or similar)
- Secure sessions / JWT / refresh flow
- Backend RBAC
- Encrypted secrets and storage
- Server-side validation for all privileged actions

# Security Review Notes
## Fixed in front-end where possible
- Restored missing helper functions to avoid broken references
- Added defensive export and persistence helpers
- Kept notification live-send behind external provider configuration
## Still required on the backend
- Real MFA provider
- Real tenant isolation
- Signed immutable logs
- Secure evidence storage
- Verified notification delivery logging
- Authorization checks on every API route
- Rate limiting and audit monitoring