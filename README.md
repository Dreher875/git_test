# EvidenceTech: Crime Scene Diagram Software

EvidenceTech is a concept for software that helps investigators, forensic teams, and legal professionals create accurate, defensible crime scene diagrams.

## Vision
Build a secure, court-ready platform that turns scene measurements, photos, and evidence logs into clear diagrams and timelines.

## Core Users
- Crime scene investigators
- Detectives
- Prosecutors and legal assistants
- Forensic analysts

## v1 Feature Set

### 1) Scene Diagram Builder
- 2D floor-plan style canvas
- Drag-and-drop symbols (doors, windows, furniture, evidence markers)
- Measurement tools (distance, angle, scale)
- Layer support (structure, evidence, blood pattern, trajectories)

### 2) Evidence Mapping
- Pin evidence markers with IDs
- Attach photos, notes, and chain-of-custody metadata
- Show relationship lines between evidence items

### 3) Photo-to-Diagram Support
- Import reference photos
- Set calibration points for scale estimation
- Overlay sketch guides to speed drafting

### 4) Reporting & Export
- Court-friendly PDF export
- Image exports (PNG/SVG)
- Diagram + evidence table package
- Revision history and audit log snapshots

### 5) Collaboration & Integrity
- Role-based access (investigator, supervisor, prosecutor)
- Immutable activity logs
- Case-level permissions and redaction tools

## Non-Functional Requirements
- Strong encryption for data at rest and in transit
- CJIS-aligned security controls (if targeting US law-enforcement environments)
- Offline-capable field mode with secure sync
- Full timestamped audit trail
- High availability and backup strategy

## Suggested Tech Stack
- **Frontend:** React + TypeScript + canvas library (Konva/Fabric.js)
- **Backend:** Node.js (NestJS/Express) or Python (FastAPI)
- **Database:** PostgreSQL
- **Storage:** Encrypted object storage for photos and files
- **Auth:** SSO/OIDC + MFA
- **Infra:** Docker + cloud deployment with strict IAM

## Data Model (Starter)
- `Case`
- `Scene`
- `Diagram`
- `EvidenceItem`
- `Photo`
- `Measurement`
- `AuditEvent`
- `UserRole`

## 30-60-90 Day Delivery Plan

### First 30 Days
- Define legal/security requirements
- Build wireframes for diagram workflows
- Implement base canvas with symbol placement

### Days 31-60
- Add measurements, layers, and evidence linking
- Build reporting/export prototype
- Add basic auth and role permissions

### Days 61-90
- Add audit trail + revision history
- Pilot with sample cases
- Harden security and prepare MVP launch

## Next Step
If you want, we can turn this into an actionable product requirements document (PRD) with user stories and a sprint-by-sprint engineering backlog.
