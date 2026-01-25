# Uhum View Specification

This document defines **Uhum View** — the unified visual interface for the Uhum network.

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
│  LAYER 2: PRESENTATION HINTS (Part of Agent Dossier, optional)   │
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

Builder preferences are included in the **Agent Dossier** as optional presentation hints.

### Key Principles

1. **Hints, not commands** — Avatar can override based on user preferences
2. **Part of Dossier** — fetched once during discovery/connection
3. **Not in messages** — never sent with individual decisions/events
4. **Optional** — agents work fine without presentation hints

### Presentation Hints Structure

```prolog
agent(
  id('acme.ecommerce'),
  
  % ... intents, endpoints, etc. (semantic) ...
  
  % Presentation hints (optional)
  presentation([
    % Brand identity
    brand([
      name("Acme Store"),
      logo("https://acme.com/logo.png"),
      primary_color("#FF5733"),
      tone(friendly)
    ]),
    
    % Home/landing suggestions
    home([
      section(welcome, [
        message("Welcome to Acme Store! What can I help you find?")
      ]),
      section(featured, [
        data_source(products, [tag(best_seller)]),
        layout_hint(grid),
        max_items(6)
      ]),
      section(quick_actions, [
        actions([search, view_cart, track_order])
      ])
    ]),
    
    % Layout hints for specific data types
    layouts([
      layout_hint(products, grid, [columns(3)]),
      layout_hint(orders, list, [show_status_badge]),
      layout_hint(messages, conversation, [])
    ])
  ])
).
```

### What Presentation Hints Can Define

| Category | Examples | Avatar Behavior |
|----------|----------|-----------------|
| **Brand** | Logo, colors, name, tone | Always respected (part of agent identity) |
| **Home** | Welcome message, featured sections | Shown unless user has custom shortcuts |
| **Layout hints** | Grid vs list for products | Used as default, user can override |
| **Onboarding** | First-time user flow | Shown once, then remembered |

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

4. Check builder hints (from Dossier)
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

### Why Hints in Dossier, Not Separate?

We considered separating presentation hints into a separate document:

**Pros of separate:**
- Cleaner separation
- Can evolve independently

**Cons of separate:**
- Extra fetch during discovery
- Another thing to maintain
- Agents might forget to create it

**Decision:** Include in Dossier because:
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

**Dossier hint:**
```prolog
layout_hint(products, grid, [columns(3)])
```

**User preference:**
```
layout.default: "carousel"
```

**Avatar decision:**
- User prefers carousel → show as carousel
- Dossier hint is overridden
- Products displayed in horizontal scrollable carousel

### Example 2: First-time User

**Dossier home section:**
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

**Dossier hint:**
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

---

## 10. Summary

| Aspect | Responsibility |
|--------|----------------|
| **What data exists** | Brain (semantic facts) |
| **What the agent looks like** | Dossier (presentation hints) |
| **How user prefers to see things** | Avatar (user preferences) |
| **Final rendering decision** | Avatar (combining all layers) |

**Priority:** User > Builder > Avatar Defaults

**Key Principle:** The Brain never knows or cares about UI. The Avatar is smart enough to make good rendering decisions while respecting both builder intent and user sovereignty.
