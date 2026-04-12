# Design System Specification: Neural Orchestration 2026

## 1. Overview & Creative North Star
**The Creative North Star: "The Synthetic Architect"**

In the landscape of 2026, AI orchestration requires more than just a dashboard; it requires a cockpit that feels both powerful and ethereal. "The Synthetic Architect" philosophy moves away from the rigid, boxy layouts of the early 2020s. Instead, this design system treats the interface as a living, breathing digital organism. 

We achieve a "High-End Editorial" feel by leaning into **intentional asymmetry**, where complex data flows are balanced by expansive negative space. We break the "template" look by layering modular components that appear to float in a deep, multi-dimensional space. The goal is to make the user feel like they are directing a symphony of agents rather than managing a database.

---

## 2. Colors & Surface Philosophy
The palette is rooted in the depth of space, using high-chroma accents to signify intelligence and activity.

### The Palette
- **Core Depths:** `background` (#060e20) and `surface_dim` provide a rich, midnight foundation.
- **Accents (The Spark):** 
    - `primary` (#3adffa - Cyan) for data pathways.
    - `secondary` (#c180ff - Purple) for agent identities.
    - `tertiary` (#e7ffc4 - Lime) for success states and optimization metrics.

### The "No-Line" Rule
Traditional 1px solid borders are strictly prohibited for structural sectioning. Boundaries must be defined through **Background Color Shifts**. For instance, a side panel using `surface_container_low` should sit directly against the `background` without a dividing line. The contrast between the slate-blue tones provides all the separation necessary for a sophisticated, "clean" look.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. We use the surface-container tiers to create "nested" depth:
1. **Base:** `surface` / `background` (#060e20).
2. **Intermediate Panels:** `surface_container_low`.
3. **Active Modules/Cards:** `surface_container_high`.
4. **Floating Overlays:** `surface_bright` with backdrop blurs.

### The "Glass & Gradient" Rule
To elevate the "futuristic" aesthetic, use semi-transparent `surface_variant` colors with a `backdrop-filter: blur(20px)`. Main CTAs should not be flat; apply a subtle linear gradient from `primary` (#3adffa) to `primary_container` (#00cbe6) at a 135-degree angle to provide "soul" and a sense of energy.

---

## 3. Typography
Our typography creates an authoritative yet modern editorial voice, balancing the technical precision of Inter with the futuristic character of Space Grotesk.

*   **Display & Headlines (Space Grotesk):** Used for high-level data summaries and page titles. The wide apertures and geometric shapes of Space Grotesk communicate "High-Tech" without feeling dated.
*   **Body & Titles (Inter):** Used for all functional UI elements. Inter provides the "Highly Readable" foundation required for complex orchestration logic.

**Hierarchy as Identity:**
- **Asymmetric Scaling:** Use `display-lg` (3.5rem) paired with tight `body-sm` metadata to create high-contrast layouts typical of high-end digital journals.
- **Intentional Tracking:** Increase letter-spacing on `label-sm` (1.5% to 3%) for a premium, airy feel in agent status tags.

---

## 4. Elevation & Depth
Depth in this system is achieved through **Tonal Layering** and **Ambient Light Simulation** rather than traditional drop shadows.

*   **The Layering Principle:** Place a `surface_container_lowest` card on a `surface_container_low` section to create a soft "recessed" effect. Conversely, place a `surface_container_highest` element on the `background` to create a "lifted" effect.
*   **Ambient Shadows:** For floating modals, use a shadow with a blur radius of 40px-60px at 6% opacity. The shadow color should be tinted with `primary` (#3adffa) to simulate the glow of the screen reflecting off a surface.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility, use the `outline_variant` token at **15% opacity**. It should be felt, not seen.
*   **Glassmorphism:** Use `surface_bright` at 60% opacity with a blur for all hovering tooltips and orchestration "nodes." This ensures the underlying logic flow remains visible, maintaining the "clean" and "clean" futuristic aesthetic.

---

## 5. Components

### Buttons
*   **Primary:** Gradient (Primary to Primary Container), `rounded-md` (0.375rem). Use `on_primary` for text.
*   **Secondary:** Ghost style. No background, `outline_variant` (15% opacity) border, `primary` text.
*   **Tertiary:** Text-only with `secondary` color, used for low-emphasis actions like "Cancel" or "Clear."

### Chips (Agent Tags)
*   **Selection Chips:** Use `surface_container_highest` with a 2px left-accent border of `secondary`. No full borders.
*   **Status Chips:** Use `tertiary_container` with `on_tertiary_container` text for "Active" agents; `error_container` for "Halted."

### Complex Data Visualization (Flow Nodes)
*   **Nodes:** Use `surface_container_low` as the base. Use `glassmorphism` for the header of the node.
*   **Connectors:** Use `primary` 1.5px paths. For active data transmission, use a CSS "dash-offset" animation to simulate pulses of light traveling through the orchestration flow.

### Input Fields
*   **Design:** A "Bottom-Line Only" approach or a very subtle `surface_container_highest` fill. 
*   **Focus State:** Transition the bottom border from `outline_variant` to a `primary` glow.

### Cards & Lists
*   **No Dividers:** Separate list items with `1rem` of vertical whitespace or a subtle background shift on hover (`surface_container_high`).

---

## 6. Do's and Don'ts

### Do
*   **Do** use extreme whitespace to separate logic blocks. Complex AI data needs room to breathe.
*   **Do** use `primary` and `secondary` gradients sparingly—only on the most important action or data point on the screen.
*   **Do** utilize "Glassmorphism" for floating navigation bars to keep the orchestration canvas visible.

### Don't
*   **Don't** use 100% opaque, high-contrast borders. It breaks the "Synthetic" immersion.
*   **Don't** use pure black (#000000) for backgrounds; always use the `background` slate-blue (#060e20) to maintain tonal depth.
*   **Don't** use standard "drop shadows" (black/grey). Always tint shadows with the surface's core blue or the accent primary.
*   **Don't** clutter the screen with lines. Use the typography scale and background shifts to define hierarchy.