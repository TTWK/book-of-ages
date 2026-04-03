# Manual Event Editing & Creation Design

## Overview
This design outlines the core user experience for manually managing data within the Book of Ages system. Manual management is the primary interaction paradigm, treating the "Events List" and manual creation as first-class citizens, positioned above the Agent Inbox workflow.

## User Interface & Workflows

### 1. Primary Events List (`EventsView.vue`)
- **Core Screen**: This is the default landing page and the core focus of the application.
- **Add Button**: A prominent "Add Event" button is available here.
- **Unified Modal**: Clicking "Add Event" opens a unified "Add/Edit Event" modal.

### 2. Event Creation & Editing Workflow
- **Creation State (Confirmed by Default)**: When a user manually creates an event via the UI, its status is immediately set to `confirmed` (Saved/Archived into the official timeline). Users do not need to "approve" their own manually created events.
- **Inline Editing**: An "Edit" button will be available on both the Events List (via table actions) and the Event Detail View.
- **Tag Auto-Creation**: While in the creation or editing modal, the tag input component will support entering new string values. If a tag does not exist in the database, the backend (or frontend via an API orchestration) will automatically create it on the fly and associate it with the event.

### 3. URL Parsing & Content Extraction
- **Interactive Parsing Flow**: In the Event Creation/Edit modal, a "Parse from URL" input field will be provided.
- **User Confirmation**: When the user enters a URL and triggers the parse action, the frontend calls the `/api/tools/parse-url` endpoint. The returned Title and Markdown Content are populated into the modal's input fields.
- **Adjustment Phase**: The user can review, manually adjust, or discard the extracted content *before* finally clicking "Save" to persist the event to the database.

### 4. Deep Content Management (Timeline & Materials)
- **Full Manual Control**: Within a confirmed Event's Detail View, users have complete freedom to manually add, edit, and delete both **Timeline Nodes** and **Materials**.
- **Agent Boundary**: Once an event is `confirmed`, external Agents are strictly restricted from updating the main event title or content. Agents are only permitted to append new Timeline nodes or Materials to the confirmed event.

## Technical Implementation Notes
- **Frontend**:
  - Update tag selector components (e.g., using Naive UI's `NSelect` with `filterable` and `tag` props) to handle dynamic creation.
  - Implement the "Parse from URL" button logic inside the Event form, populating `v-model` values upon successful API response.
  - Add CRUD UI components inside `EventDetailView.vue` for Timelines and Materials.
- **Backend**:
  - The Event Update API (`PUT /api/events/:id`) must enforce a permission boundary: if the request originates from an API Key (Agent) and the event's current status is `confirmed`, requests to mutate `title`, `summary`, or `content` must be rejected (e.g., return `403 Forbidden`).
  - The Event Create/Update APIs should cleanly handle the "create tags on the fly" logic if a string array of tag names is provided instead of strictly tag IDs.

## Out of Scope (For Now)
- Deletion considerations (Soft vs. Hard delete policies, cascading deletes) are postponed until real-world usage data is gathered.
- Multi-user authentication (deferred to a future roadmap phase).