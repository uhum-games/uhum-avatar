# Uhum View Specification

This document defines **Uhum View** — the unified visual interface for the Uhum network.

> **Related:**
> - [Architecture Spec](../uhum-brain/specs/ARCHITECTURE.md) — Agent Card, Trust Zones
> - [View Instructions](./VIEW-INSTRUCTIONS.md) — How Brain guides Avatar presentation
> - [Platforms](./PLATFORMS.md) — Platform-specific rendering

---

## 1. Design Philosophy

### The Core Principle: Brain is Pure Semantic

The Brain (server) deals **only** with semantic data:
- Facts, rules, decisions
- Business logic
- Domain knowledge

The Brain **never** returns:
- UI components (carousel, grid, list)
- Layout instructions
- Styling information
- Rendering hints

```prolog
% Brain returns THIS (semantic)
products([
  product("SKU-123", "Widget Pro", 29.99, best_seller),
  product("SKU-124", "Gadget Plus", 49.99, new_arrival)
]).

% Brain NEVER returns THIS (presentational)
render(grid, 3_columns, [card(product(...)), ...]).
```

This separation ensures:
- Brains are portable across any UI paradigm (visual, voice, text)
- Same Brain works for all platforms
- Clean separation of concerns
- Easier testing and reasoning

---

## 2. The Layered Architecture

Uhum View uses a three-layer architecture for rendering decisions:

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 3: USER PREFERENCES (Avatar-local, highest priority)      │
│                                                                  │
│  Stored locally by Avatar. Personal and portable.                │
│  Examples:                                                       │
│  - Layout preference: carousel vs grid vs list                   │
│  - Density: compact vs comfortable vs spacious                   │
│  - Interaction style: conversational vs visual vs hybrid         │
│  - Accessibility: high contrast, large text, screen reader       │
│  - Personal shortcuts and quick actions                          │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 2: PRESENTATION HINTS (Part of Agent Card, optional)       │
│                                                                  │
│  Defined by agent builder. Hints, not commands.                  │
│  Examples:                                                       │
│  - Brand identity: colors, logo, tone                            │
│  - Home/landing configuration                                    │
│  - Layout suggestions for specific data types                    │
│  - Welcome messages and onboarding flows                         │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 1: BRAIN DATA (Pure semantic, lowest priority for UI)     │
│                                                                  │
│  The actual data from the Brain.                                 │
│  Avatar interprets semantically and decides rendering.           │
│  Examples:                                                       │
│  - Lists of products, invoices, messages                         │
│  - Entity details and relationships                              │
│  - Decision results and effects                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Priority Order

**User Preferences > Builder Hints > Avatar Defaults**

The Avatar is smart enough to:
1. Respect user preferences first
2. Consider builder hints when they don't conflict
3. Fall back to sensible defaults
4. Adapt dynamically based on user feedback

---

## 3. User Preferences (Layer 3)

User preferences are stored **locally** by the Avatar and travel with the user across all agents.

### What User Preferences Include

```
UserPreferences:
  layout:
    default: "carousel"           # vs "grid" vs "list" vs "table"
    density: "comfortable"        # vs "compact" vs "spacious"
    
  interaction:
    style: "hybrid"               # vs "conversational" vs "visual"
    voice_enabled: true
    haptic_feedback: true
    
  accessibility:
    high_contrast: false
    large_text: false
    reduce_motion: false
    screen_reader: false
    
  shortcuts:
    - "check balance"
    - "pay invoice"
    - "show recent orders"
    
  history:
    recent_agents: [...]
    frequent_intents: [...]
```

### How Preferences are Learned

The Avatar learns preferences through:
1. **Explicit settings** — user configures in settings
2. **Implicit learning** — "I prefer seeing this as a carousel" during conversation
3. **Behavioral patterns** — user always expands lists, prefers detail views

---

## 4. Presentation Hints (Layer 2)

Builder preferences are included in the **Agent Card** as optional presentation hints.

### Key Principles

1. **Hints, not commands** — Avatar can override based on user preferences
2. **Part of Agent Card** — fetched once during discovery/connection
3. **Not in messages** — never sent with individual decisions/events
4. **Optional** — agents work fine without presentation hints

### Presentation Architecture

The presentation layer has four key concepts:

```
State (global) ──────────────────────────────────────────────────┐
                                                                 │
Components (building blocks)                                     │
  ├── books (list of books)                                      │
  ├── book_detail (single book) ─────────── depends on ──────────┤
  └── add_book_form (create form)                                │
                                                                 │
Views (composition) ←───────────── activated by ─────────────────┘
  ├── home (default) ─────────── shows [books]
  └── book_view ──────────────── shows [books, book_detail]
```

| Concept | Description | Multiplicity |
|---------|-------------|--------------|
| **Brand** | Visual identity (colors, logo, greetings) | Unique (last definition wins) |
| **State** | Global state schema (flows between Avatar and Brain) | Unique (last definition wins) |
| **Component** | Reusable UI building block | Multiple |
| **View** | Composition of components | Multiple (one default) |

### State Schema

State defines **UI state variables** for the Avatar presentation layer. This controls which views and components are shown based on user interactions.

> **Important:** This is **Avatar-only state** — it does NOT flow to the Brain. It is purely for UI behavior defined by the agent author.

```prolog
% State schema - UI state for Avatar (controls which views/components are shown)
state([
    selected_book([
        type(model),           % References a model type
        source(book),          % The model this variable references
        description("Currently selected book for detail view")
    ]),
    filter_status([
        type(atom),
        options([all, reading, completed, wishlist])
    ])
]).
```

**Key concepts:**
- `type(model)` — the variable references an instance of a model (facts are instances of models)
- `source(book)` — specifies which model type this state variable holds
- State is **Avatar-only** — controls UI, not Brain logic

### Components

Components are reusable UI building blocks. They define **what CAN be rendered**.

```prolog
% List component
component(books, [
    title("My Books"),
    description("Browse and manage your collection"),
    type(list),
    source(book),
    fields([
        field(title, string, "Title"),
        field(author, string, "Author"),
        field(status, atom, "Status")
    ]),
    actions([
        action(add_book, "Add Book", plus)
    ])
]).

% Detail component (depends on state)
component(book_detail, [
    title("Book Details"),
    type(detail),
    source(book),
    context(selected_book),    % Shows when selected_book is set
    fields([
        field(title, string, "Title"),
        field(author, string, "Author"),
        field(description, text, "Description"),
        field(cover, image, "Cover")
    ]),
    actions([
        action(edit_book, "Edit", pencil),
        action(delete_book, "Delete", trash, [variant(danger)])
    ])
]).
```

**Component properties:**
- `name` — Unique identifier
- `title` — Human-readable title
- `type` — Component type (list, grid, detail, form, etc.)
- `source` — Data model for this component
- `context` — Optional state variable this component depends on
- `fields` — Field definitions (what to display)
- `actions` — Available actions in this component

**Component types:**
| Type | Description |
|------|-------------|
| `list` | Vertical list of items |
| `grid` | Grid of cards |
| `detail` | Single item detail view |
| `form` | Input form for creating/editing |
| `dashboard` | Multi-widget dashboard |

### Views

Views are **compositions of components**. They suggest which components to show together.

- **One default view** — shown when no specific state is active
- **Other views** — require a state variable to become active

```prolog
% Default view: just the list
view(home, [
    title("Home"),
    is_default(true),
    components([books])
]).

% View activated when a book is selected
view(book_view, [
    title("Book Details"),
    context(selected_book),           % Activates when selected_book is set
    components([books, book_detail]), % Show both components
    layout(split)                     % Side by side
]).
```

**View properties:**
- `name` — Unique identifier
- `title` — Human-readable title
- `context` — State variable that activates this view (not required for default)
- `components` — List of component names to display
- `layout` — How to arrange components
- `is_default` — Whether this is the default view (exactly one)

**View layouts:**
| Layout | Description |
|--------|-------------|
| `single` | One component fills the space |
| `split` | Components side by side |
| `tabs` | Components as tabs |
| `stack` | Components stacked vertically |

### Brand Identity

```prolog
brand([
    name("My Bookshelf"),
    logo("https://example.com/logo.png"),
    primary_color("#2563eb"),
    secondary_color("#1e40af"),
    accent_color("#f59e0b"),
    tone(friendly),
    greetings([
        "What would you like to read today?",
        "Welcome back! Ready to explore?",
        "Your bookshelf awaits!"
    ])
]).
```

### Full Presentation Example

```prolog
% Brand identity
brand([
    name("My Bookshelf"),
    primary_color("#2563eb"),
    greetings(["What would you like to read?"])
]).

% State schema - UI state for Avatar (controls which views/components are shown)
state([
    selected_book([type(model), source(book)])
]).

% Components
component(books, [
    title("My Books"),
    type(list),
    source(book),
    fields([
        field(title, string, "Title"),
        field(author, string, "Author"),
        field(status, atom, "Status")
    ]),
    actions([action(add_book, "Add Book", plus)])
]).

component(book_detail, [
    title("Book Details"),
    type(detail),
    source(book),
    context(selected_book),
    fields([
        field(title, string, "Title"),
        field(author, string, "Author"),
        field(description, text, "Description")
    ]),
    actions([
        action(edit_book, "Edit", pencil),
        action(delete_book, "Delete", trash, [variant(danger)])
    ])
]).

% Views
view(home, [
    title("Home"),
    is_default(true),
    components([books])
]).

view(book_view, [
    title("Book Details"),
    context(selected_book),
    components([books, book_detail]),
    layout(split)
]).
```

### What Presentation Hints Can Define

| Category | Examples | Avatar Behavior |
|----------|----------|-----------------|
| **Brand** | Logo, colors, name, tone, greetings | Always respected (part of agent identity) |
| **State** | UI state schema | Avatar manages state locally (not sent to Brain) |
| **Components** | UI building blocks | Avatar renders based on state |
| **Views** | Component compositions | Avatar activates based on state |
| **Layout hints** | Grid vs list suggestions | Used as default, user can override |

### What Presentation Hints Cannot Define

- Exact pixel layouts
- Platform-specific code
- Animations or transitions
- Anything that forces a specific rendering

---

## 5. Avatar Rendering Logic

The Avatar combines all three layers to make rendering decisions.

### Decision Flow

```
1. Receive semantic data from Brain
   └── products([product("SKU-123", ...), ...])

2. Identify data type and count
   └── "This is a list of 10 products"

3. Check user preferences
   └── User prefers: grid layout, comfortable density

4. Check builder hints (from Agent Card)
   └── Builder suggests: grid with 3 columns

5. Consider context
   └── Mobile device, portrait orientation

6. Make rendering decision
   └── "Show as 2-column grid (mobile override), comfortable spacing"

7. Render using Uhum View components
   └── <Grid columns={2} density="comfortable">
         <Card>...</Card>
         ...
       </Grid>
```

### Smart Adaptation

The Avatar should adapt dynamically:

```
User: "Show me this as a list instead"

Avatar:
1. Re-renders as list
2. Asks: "Would you like me to always show products as lists?"
3. If yes: Updates user preferences for this data type
```

---

## 6. Uhum View Components

A fixed set of components that all agents can use:

| Component | Description | When to Use |
|-----------|-------------|-------------|
| `message` | Chat bubble | Conversations, responses |
| `card` | Content card | Single items, summaries |
| `carousel` | Horizontal scroll | Browsing, discovery |
| `list` | Vertical scroll | Ordered items, history |
| `grid` | Grid layout | Catalogs, galleries |
| `form` | Input fields | Collecting parameters |
| `action_bar` | Button row | Quick actions |
| `table` | Tabular data | Reports, comparisons |
| `chart` | Visualization | Analytics, trends |
| `media` | Image/video | Rich content |
| `map` | Location | Addresses, routes |
| `status` | Indicator | Progress, states |

### Component Selection Logic

The Avatar chooses components based on:

| Data Pattern | Default Component | User Override |
|--------------|-------------------|---------------|
| List of 1-3 items | Cards | Any |
| List of 4-10 items | Carousel or Grid | Any |
| List of 10+ items | Scrollable List | Any |
| Key-value pairs | Card or Table | Any |
| Geographic data | Map | List of addresses |
| Time series | Chart | Table |
| Conversation | Messages | - |

---

## 7. Design Rationale

### Why Not Let Brain Define UI?

We considered several approaches before settling on the layered architecture:

#### Option Rejected: Brain Returns UI Instructions

```prolog
% We considered this but rejected it
decision(accepted,
  facts([...]),
  ui([
    render(carousel, products),
    toast(success, "Order placed!")
  ])
).
```

**Problems:**
- Brain becomes platform-aware
- Different platforms need different UI
- Breaks separation of concerns
- Brain needs to know about accessibility, screen sizes, etc.

#### Option Rejected: Separate Presentation Agent

```
Avatar → Brain (semantic) → Presentation Agent (UI) → Render
```

**Problems:**
- Added complexity
- Another service to maintain
- Latency for every render decision
- Overkill for most use cases

#### Option Chosen: Layered Preferences

**Benefits:**
- Brain stays purely semantic
- Builder gets some control via hints
- User has ultimate control
- Avatar is smart and adaptive
- Simple to implement and reason about

### Why Hints in Agent Card, Not Separate?

We considered separating presentation hints into a separate document:

**Pros of separate:**
- Cleaner separation
- Can evolve independently

**Cons of separate:**
- Extra fetch during discovery
- Another thing to maintain
- Agents might forget to create it

**Decision:** Include in Agent Card because:
1. Single document to fetch and cache
2. Presentation hints are tightly coupled to agent identity
3. Optional section doesn't pollute semantic parts
4. Easier for builders (one place to define everything)

### Why User > Builder > Defaults?

This priority order reflects the Uhum philosophy:

1. **User is sovereign** — their preferences always win
2. **Builder knows their domain** — good defaults for their use case
3. **Avatar is capable** — sensible fallbacks when nothing is specified

This mirrors how the web evolved:
- Websites (builders) define appearance
- But users can override with browser settings
- And browsers have sensible defaults

---

## 8. Examples

### Example 1: E-commerce Product List

**Brain returns:**
```prolog
memory([
  event(42, products_listed, [
    product("SKU-123", "Widget Pro", 29.99, [best_seller]),
    product("SKU-124", "Gadget Plus", 49.99, [new_arrival]),
    product("SKU-125", "Thing Max", 19.99, [on_sale])
  ])
]).
```

**Agent Card hint:**
```prolog
layout_hint(products, grid, [columns(3)])
```

**User preference:**
```
layout.default: "carousel"
```

**Avatar decision:**
- User prefers carousel → show as carousel
- Agent Card hint is overridden
- Products displayed in horizontal scrollable carousel

### Example 2: First-time User

**Agent Card home section:**
```prolog
home([
  section(welcome, [
    message("Welcome to Acme! I can help you find products, track orders, or answer questions.")
  ]),
  section(quick_actions, [
    actions([browse_products, track_order, contact_support])
  ])
])
```

**User has no preferences yet.**

**Avatar decision:**
- Show welcome message (builder hint)
- Show quick action buttons
- Use Avatar defaults for layout

### Example 3: Accessibility Override

**User preferences:**
```
accessibility.high_contrast: true
accessibility.large_text: true
accessibility.reduce_motion: true
```

**Agent Card hint:**
```prolog
home([
  section(featured, [
    layout_hint(carousel),
    auto_scroll(true)
  ])
])
```

**Avatar decision:**
- High contrast colors applied
- Large text rendered
- Auto-scroll DISABLED (reduce_motion overrides)
- Carousel shown but static

---

## 9. Future Considerations

### Multi-View Merge Logic (v2+)

**Current implementation (v1):** The Avatar displays exactly one view at a time, selected by the presentation engine based on which context variables are set.

**Future enhancement (v2+):** Multiple views could be active simultaneously with a "merge logic" for combining their components.

#### Use Cases for Multi-View

1. **Master-Detail with Sidebar** — Show a navigation list, a main list, and detail panel all at once
2. **Dashboard with Overlays** — Dashboard view with a form modal overlaid
3. **Split-Screen Editing** — Two related detail views side by side

#### Merge Logic Design

When multiple views are active:

```
┌─────────────────────────────────────────────────────────────────┐
│                    MULTI-VIEW MERGE LOGIC                       │
│                                                                 │
│  View A (active)          View B (active)                       │
│  components: [a, b]       components: [b, c]                    │
│       │                         │                               │
│       └──────────┬──────────────┘                               │
│                  │                                              │
│                  ▼                                              │
│           ┌─────────────┐                                       │
│           │  MERGE STEP │                                       │
│           └─────────────┘                                       │
│                  │                                              │
│         1. Union of components: [a, b, c]                       │
│         2. Deduplicate: component 'b' appears once              │
│         3. Priority ordering: views have priority weight        │
│         4. Layout merging: combine layout hints                 │
│                  │                                              │
│                  ▼                                              │
│           Final render: [a, b, c] with merged layout            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Merge Rules

| Rule | Description |
|------|-------------|
| **Component deduplication** | Same component in multiple views is rendered once |
| **Priority ordering** | Higher-priority views' components come first |
| **Layout combination** | `split` + `stack` → `split` with stacked panels |
| **Conflict resolution** | Most specific view wins for conflicting hints |

#### Activation Logic

```prolog
% View activates when ALL its contexts are set
view(book_view, [
    context([selected_book, filter_status]),  % Both must be set
    components([books, book_detail])
]).

% OR-style activation (any context activates)
view(search_results, [
    context_any([search_query, filter_active]),  % Either activates
    components([search_list])
]).
```

#### Implementation Notes

The presentation engine will need:
1. **View scoring** — Calculate activation score based on how many contexts match
2. **Priority weights** — Views can have explicit priority for ordering
3. **Layout resolver** — Combine multiple layout hints into final arrangement
4. **Component allocator** — Assign components to layout regions

### Voice and Non-Visual Interfaces

The layered architecture supports non-visual interfaces:

- Voice assistant: No visual components, but same semantic data
- Screen reader: Components announce content appropriately
- Minimal UI: Text-only rendering for low-bandwidth

### Multi-Agent Scenarios

When connected to multiple agents:
- Each agent has its own presentation hints
- User preferences are global
- Avatar manages the combined experience

### Theming and Customization

Future enhancement: Users could define custom themes that override builder brand colors while maintaining accessibility and readability.

### Component Library Extensions

The Avatar has a fixed UI component library, but future versions may support:

1. **Custom component registration** — Agent-specific components (with security sandboxing)
2. **Component variants** — Same type with different visual styles
3. **Animated transitions** — Smooth view switching animations
4. **Responsive layouts** — Automatic layout adjustment based on screen size

---

## 10. Presentation Layer Implementation

The Avatar implements the view rendering through a **presentation layer** with the following components:

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                           │
│                                                                 │
│  ┌─────────────────┐     ┌──────────────────┐                  │
│  │ PresentationState│ ─▶ │ PresentationEngine│                  │
│  │  (UI state)      │     │  (view selection) │                  │
│  └─────────────────┘     └────────┬─────────┘                  │
│                                   │                             │
│                                   ▼                             │
│                         ┌─────────────────┐                     │
│                         │  ViewRenderer   │                     │
│                         │  (orchestrates) │                     │
│                         └────────┬────────┘                     │
│                                  │                              │
│          ┌───────────────────────┴───────────────────────┐      │
│          ▼                       ▼                       ▼      │
│  ┌─────────────┐         ┌─────────────┐         ┌───────────┐ │
│  │ListComponent│         │GridComponent│         │DetailComp │ │
│  └─────────────┘         └─────────────┘         └───────────┘ │
│          │                       │                       │      │
│          └───────────────────────┴───────────────────────┘      │
│                                  │                              │
│                          ComponentRegistry                      │
│                       (type → React component)                  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Purpose |
|-----------|---------|
| **PresentationStateManager** | Manages UI state variables (separate from Brain state) |
| **PresentationEngine** | Selects which view to display based on current state |
| **ComponentRegistry** | Maps component types to React components |
| **ViewRenderer** | Orchestrates rendering, ties everything together |

### Component Type Mapping

| Type | React Component | Description |
|------|-----------------|-------------|
| `list` | ListComponent | Vertical list of items with fields |
| `grid` | GridComponent | Responsive card grid |
| `detail` | DetailComponent | Single item detail view |
| `form` | FormComponent | Input form for creating/editing |
| `dashboard` | DashboardComponent | Summary widgets and stats |
| `chat` | ChatComponent | Conversational interface |

### Usage Example

```tsx
import { ViewRenderer } from '@uhum/avatar';

function App() {
  const { state } = useAvatar();
  
  return (
    <ViewRenderer
      presentation={state.dossier?.presentation}
      facts={state.facts}
      onIntent={(intent, params) => avatar.sendIntention(intent, params)}
    />
  );
}
```

### State Flow

1. **Agent Card loads** → Engine loads views and components
2. **State initializes** → All state variables start as `null`
3. **User selects item** → State variable set (e.g., `selected_book`)
4. **Engine re-evaluates** → Finds view matching new state
5. **ViewRenderer updates** → Renders new view's components

---

## 11. Summary

| Aspect | Responsibility |
|--------|----------------|
| **What data exists** | Brain (semantic facts) |
| **What can be rendered** | Agent Card (components) |
| **How to compose UI** | Agent Card (views) |
| **What controls UI state** | Agent Card (state schema) |
| **What the agent looks like** | Agent Card (brand) |
| **How user prefers to see things** | Avatar (user preferences) |
| **Final rendering decision** | Avatar (combining all layers) |

### Presentation Concepts

| Concept | Description | Scope |
|---------|-------------|-------|
| **Brand** | Visual identity, greetings | Unique (last wins) |
| **State** | UI state schema (Avatar-only) | Unique (last wins) |
| **Component** | Reusable UI building block | Multiple |
| **View** | Composition of components | Multiple (one default) |

### Priority

**User > Builder > Avatar Defaults**

### Key Principles

1. **Brain is pure semantic** — never sends UI instructions
2. **State is Avatar-only** — controls which views/components are shown, NOT Brain state
3. **Components are building blocks** — reusable, can depend on state
4. **Views are compositions** — suggest which components to show together
5. **One default view** — other views require state to activate
6. **User is sovereign** — preferences always override builder hints
