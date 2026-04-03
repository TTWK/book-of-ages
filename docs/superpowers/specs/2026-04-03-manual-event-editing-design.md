# Manual Event Creation and Editing Design

## Overview
This design adds the ability for users to manually create and edit events within the Book of Ages system, complementing the existing automated ingestion flow from external agents.

## User Interface
1. **Events List View (`EventsView.vue`)**:
   - **Add Button**: A prominent "Add Event" button will be placed in the top bar of the Events List view.
   - **Unified Modal**: Clicking the "Add Event" button will open a unified "Add/Edit Event" modal.
   - **Inline Edit**: An "Edit" button will be added to the actions column of the event data table, allowing users to open the unified modal pre-filled with the event's data.

2. **Event Detail View (`EventDetailView.vue`)**:
   - **Edit Action**: An "Edit" button will be available in the detail view's action menu, allowing users to modify the event's content directly from its dedicated page.

## Workflow & Logic
- **Creation State**: When a new event is manually created via the UI, its initial status will be forced to `draft`. This ensures consistency with the existing Inbox approval workflow, meaning newly created events will require explicit confirmation before they become part of the official timeline.
- **Editing State**: The "Edit" action will allow users to modify the event's title, summary, content, source URL, and date. It will also allow changing the status (e.g., from `draft` to `confirmed`).

## Technical Implementation
- **Frontend Changes**:
  - Update `EventsView.vue` to include the "Add Event" button, the unified modal, and the inline edit button.
  - Ensure `EventDetailView.vue` utilizes the existing (or an updated) edit modal.
  - Connect the modal forms to the existing `createEvent` and `updateEvent` API client methods.
- **Backend Changes**:
  - The backend API already supports creating and updating events. No significant changes are anticipated unless missing fields are identified during implementation.

## Out of Scope
- Bulk editing of multiple events simultaneously.
- Complex revision history or undo functionality (adhering to the YAGNI principle established in the core design).