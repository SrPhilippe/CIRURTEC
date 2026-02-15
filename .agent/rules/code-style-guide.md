---
trigger: always_on
---

Global Styling & Design Rules

1. Mobile-First & Responsive Excellence

Priority: The application must be 100% mobile-friendly.

Adaptability: You are authorized and encouraged to make extreme alterations to the layout when targeting mobile devices to ensure the absolute best user experience. Do not just shrink the desktop view; reimagine the interface for touch and small screens if necessary.

2. Global Layout & Grid System

Structure: Implement a robust Grid library to manage the layout.

Consistency: All tabs, containers, and divs must adhere to a defined global pattern. Avoid "magic numbers" or inconsistent spacing; rely on the grid system to maintain structural harmony across the app.

3. Component-Based Architecture

Reusability: Whenever a layout pattern or style appears in more than one place, it must be abstracted into a reusable component.

Standardization: This component must become the single source of truth for that specific style to guarantee consistency across the application.

4. Design Integrity & Verification

Reference: Before implementing changes, always consult the inspirations folder.

Constraint: Avoid abrupt or jarring stylistic changes. All new UI elements must align strictly with the design patterns found in inspirations to ensure a cohesive visual identity.
When using mobile, the home page should keep the grid-template-columns: repeat(2, 1fr);