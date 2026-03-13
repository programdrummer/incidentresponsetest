Incident Simulation Studio — Polished Accessible Full Library Build

Files
- index.html
- 404.html
- styles.css
- app.js
- scenarios.json
- playbooks.json
- tenants.json
- vercel.json

Updates
- polished, more modern visual design
- kept high readability and contrast
- all 100 scenarios loaded
- all 100 playbooks loaded
- improved card, badge, button, and table styling

Deploy to Vercel
- upload all files to repo root
- framework preset: Other
- build command: blank
- output directory: blank

Local use
python3 -m http.server 8000

Then open
http://127.0.0.1:8000

Demo MFA code
123456

Updates in this build:
- checked internal links and preserved the document popup fallback
- added calendar scheduling fields (meeting date + meeting time) in the Team Notification Center

Updates in this build:
- after-action review now shows End Simulation instead of Next
- End Simulation opens a summary notes page
- summary notes are stored with the simulation for later review in the current browser session
- fixed Quick Start buttons on the dashboard so they navigate correctly

Updates in this build:
- context save now confirms with a popup
- add/edit team member form now includes a role dropdown
- Technical Lead added to role options
- notification preview action now confirms invites were sent
- guided steps now include a step meaning section and a detailed how-to list for each phase

Updates in this build:
- tenant context now allows creating a fictitious environment with system lists
- scenario‑aware guidance suggests systems to include
- guided steps now show equipment/software that should be reviewed for each phase

Updates in this build:
- added per-step note taking for what the team did and what they found
- step notes can be opened from each guided step task and are saved with the simulation in the current browser session
- end-of-simulation summary can now be exported as a print-friendly PDF document including date, time, team, environment, summary notes, and all per-step notes

Updates in this build:
- saved simulations can now be named from the end-of-simulation screen
- saved simulations are accessible later in-platform by hyperlink
- save action now confirms the simulation was saved
- role chosen in add/edit team member now auto-populates matching role assignments while still allowing manual override per step
- tenant context now supports a custom name
- dashboard tenant context includes fictitious environment hardware/software selection
- setup area shows fictitious environment guidance as a next step
- internal links were reviewed and preserved


Live notification setup on Vercel
- This build now supports real hosted email and SMS sending through a Vercel serverless function.
- Add these Environment Variables in Vercel Project Settings:

EMAIL_FROM_ADDRESS=your_verified_sender@example.com
SENDGRID_API_KEY=your_sendgrid_api_key
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_NUMBER=+15555555555

Notes
- Email sending uses SendGrid.
- SMS sending uses Twilio.
- If only email variables are configured, only email will send.
- If only Twilio variables are configured, only SMS will send.
- The Notification Center flow is now:
  1. Save details
  2. Generate Preview
  3. Send Notifications

Updates in this build:
- fixed saved team members carrying over to the Notification Center so they can receive notifications
- moved suggested hardware/software for the scenario above the fictitious environment selector in Tenant Context

Updates in this build:
- fixed team members carrying from Exercise Setup to Team Notification Center by always loading saved team members onto the notification screen

Updates in this build:
- fixed Generate Preview so it always builds and displays recipient previews with channel, email, phone, and message text
- fixed Send Notifications so it validates recipients first and shows a clearer error when delivery targets or hosted API configuration are missing

Cleanup in this build:
- removed duplicate function definitions for saved simulation summary behavior
- preserved existing simulator behavior

Notification preview/send fix:
- Generate Preview now explicitly rebuilds and displays the preview panel on the latest cleaned build
- Send Notifications is wired directly to the hosted API call on this build

Artifact generator engine and inject system added in this build:
- guided run now includes manual and automated inject controls
- current step now includes generated artifacts tied to that phase of the exercise
- artifacts open in printable windows and can be used like simulated evidence during the tabletop

Updates in this build:
- removed the option for users to choose their own equipment/environment selections
- simulator now uses the recommended scenario systems automatically
- added a working Log Off button in the top right corner on every page

Fix in this build:
- restored missing renderDocuments function so the app loads correctly on Vercel
- added a defensive renderAll call so missing document rendering cannot break the full app load

Fixes in this build:
- repaired MFA submit flow so entering 123456 opens the app correctly
- removed accessibility update wording without making other simulator changes

QA fixes in this build:
- restored missing artifact/inject/step-note helper functions referenced by the UI
- repaired MFA flow and scenario initialization
- reviewed startup and document-rendering safety guards

Targeted fixes in this build:
- Verify MFA now opens the dashboard immediately after successful code entry
- Scenario Choose buttons now bind directly after rendering and switch to setup correctly
