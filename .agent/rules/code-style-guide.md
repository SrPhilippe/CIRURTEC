---
trigger: always_on
---

# Antigravity: Global Styling & Design Rules

## 1. Mobile-First & Responsive Excellence
* **Priority:** The application must be **100% mobile-friendly**.
* **Adaptability:** You are authorized and encouraged to make **extreme alterations** to the layout for mobile devices. Do not simply shrink desktop views; reimagine the interface for touch.
* **Navigation:** Mobile users must never encounter horizontal scrolling. Content must flow strictly in a vertical direction.

## 2. Global Layout & Grid System
* **Structure:** Implement a robust **Grid library** to manage all layout structures.
* **Consistency:** All tabs, containers, and `divs` must adhere to a defined global pattern.
* **Precision:** Avoid "magic numbers" or inconsistent spacing. Rely exclusively on the grid system to maintain structural harmony.
* **Home Page Specifics:** On mobile devices, the Home Page must strictly maintain a two-column layout:
    * `grid-template-columns: repeat(2, 1fr);`

## 3. Component-Based Architecture
* **Reusability:** Any layout pattern or style appearing in more than one location must be abstracted into a **reusable component**.
* **Single Source of Truth:** These components are the mandatory standard for their respective styles to guarantee application-wide consistency.

## 4. Design Integrity & Verification
* **Verification:** Before implementing any changes, **always consult the `/inspirations` folder**.
* **Visual Continuity:** Avoid abrupt or jarring stylistic changes. New UI elements must align strictly with the existing patterns in the inspirations folder to maintain a cohesive visual identity.

## 5. Application Flow & Navigation
* **New Pages:** Whenever a new page is created, it must be automatically integrated into both:
    1.  The **Global Menu**.
    2.  The **Home Page** layout.