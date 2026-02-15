# Product Requirements Draft: EvidenceTech

## Problem Statement
Investigators often rely on hand sketches and disconnected tools for crime scene documentation. This creates inconsistency, increases report preparation time, and can reduce evidentiary clarity in court.

## Product Goal
Create a software platform for diagramming crime scenes with accurate spatial representation, evidence traceability, and legally defensible reporting.

## In-Scope (MVP)
1. Case creation and scene setup
2. 2D scene drawing with scalable measurements
3. Evidence markers with linked media and notes
4. Exportable report packages (PDF + image)
5. Role-based access and audit log

## Out-of-Scope (MVP)
- 3D reconstruction
- AI object detection from images
- Full mobile native apps

## User Stories
- As an investigator, I can create a scaled scene diagram so that distances are precise.
- As an investigator, I can place evidence markers and attach photos so that each item is documented.
- As a supervisor, I can review diagram revisions so that I can verify accuracy.
- As a prosecutor, I can export a clear evidence map for court exhibits.

## Functional Requirements
- Create/edit/delete cases and scenes
- Add geometric primitives (walls, doors, windows)
- Place standardized symbols and custom labels
- Define scale and measure distances/angles
- Link evidence IDs to visual markers
- Attach media and textual notes
- Export scene package (diagram + evidence index)
- Record user actions in immutable logs

## Acceptance Criteria (Examples)
- Diagram scale can be set in meters/feet and remains consistent across exports.
- Every evidence marker can store ID, timestamp, user, and attachment list.
- PDF export includes case metadata, diagram image, and evidence table.
- Audit trail captures create/update/delete with actor and timestamp.

## Risks and Mitigations
- **Data sensitivity risk:** Apply encryption, access controls, and least privilege.
- **Adoption risk:** Validate UX with active investigators early.
- **Court admissibility concerns:** Preserve metadata integrity and chain-of-custody records.

## Metrics
- Time to produce first complete diagram
- Average number of evidence items documented per case
- Export success rate
- Revision count before supervisor approval

## Delivery Recommendation
Start with a web-based MVP optimized for desktop and tablet. Prioritize speed, accuracy, and traceability over advanced visualization in the first release.
