# ARCHITECTURE AND DEVELOPMENT RULES

These rules are **MANDATORY** for the entire project.

Any code generated, modified, refactored, or proposed by the AI must comply with these rules. Before creating a file or implementing a feature, the AI must analyze the existing architecture and determine which layer each responsibility belongs to.

The goal is to keep the project **scalable, decoupled, maintainable, testable, and easy to understand**.

---

## 1. UI components: presentational only

Components responsible for rendering the user interface must be **purely presentational**.

A UI component:

- Must be concerned primarily with rendering.
- Must receive data through `props`.
- Must receive callbacks for events.
- Must not contain business logic.
- Must not make direct API calls.
- Must not contain complex data transformation logic.
- Must not access external services directly.
- Must not implement domain rules of its own.
- Must not contain logic that could be reused outside the UI.

The component's responsibility must be limited to:

**Props → Rendering → Events**

Example:

```tsx
type UserCardProps = {
  name: string;
  email: string;
  onDelete: () => void;
};

export function UserCard({
  name,
  email,
  onDelete,
}: UserCardProps) {
  return (
    <div>
      <h2>{name}</h2>
      <span>{email}</span>

      <button onClick={onDelete}>
        Delete
      </button>
    </div>
  );
}
```

The component must not decide how to delete the user. That responsibility belongs to another layer.

---

# 2. Business logic: Custom Hooks

Client-side business logic must be encapsulated in **custom hooks**.

Hooks may be responsible for:

- State.
- Interaction flows.
- Business rules.
- Data transformation required by the UI.
- Loading states.
- Error handling.
- Orchestration of operations.
- Communication between components and services.
- Execution of user actions.

Example:

```tsx
function useDeleteUser() {
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteUser = async (userId: string) => {
    setIsDeleting(true);

    try {
      await userService.delete(userId);
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    deleteUser,
    isDeleting,
  };
}
```

The UI consumes the hook:

```tsx
const {
  deleteUser,
  isDeleting,
} = useDeleteUser();
```

The general rule is:

```text
UI Component
     ↓
Custom Hook
     ↓
Service / Adapter
     ↓
External API
```

The UI must never skip layers to access external services directly.

---

# 3. Utils and Helpers

All code classified as `utils`, `helpers`, or auxiliary functions must be kept separate from business logic.

Utils/helpers must:

- Be small, reusable functions.
- Be domain-independent whenever possible.
- Hold no state.
- Contain no screen-specific logic.
- Not take on responsibilities that belong to services.
- Not become a place where business logic accumulates.

They must be organized in a dedicated folder:

```text
utils/
├── format-date.ts
├── format-currency.ts
├── string.utils.ts
└── validation.utils.ts
```

Do not use `utils` as a catch-all dumping ground.

If a function represents a business rule, it belongs in the corresponding layer and **not in `utils`**.

---

# 4. Types

TypeScript types must be kept separate from implementation code.

Files intended exclusively for typing must use the extension:

```text
.type.ts
```

Examples:

```text
user.type.ts
auth.type.ts
api-response.type.ts
product.type.ts
```

Example:

```ts
export type User = {
  id: string;
  name: string;
  email: string;
};
```

Avoid defining complex types directly inside components, hooks, or services when those types could be reused.

Types specific to a single file may stay local when reuse would not make sense.

---

# 5. Constants

Reusable constants must be kept separate from implementation code.

Constant files must use:

```text
.constants.ts
```

Examples:

```text
api.constants.ts
routes.constants.ts
app.constants.ts
validation.constants.ts
```

Example:

```ts
export const API_ENDPOINTS = {
  USERS: "/api/users",
  PRODUCTS: "/api/products",
} as const;
```

Do not place large amounts of constants inside components or hooks.

---

# 6. API consumption and Data Fetching

All API access must follow **the official Next.js recommendations and patterns** for the version used in the project.

The AI must first determine:

- Whether the query should run in Server Components.
- Whether Server Actions are appropriate.
- Whether Route Handlers are appropriate.
- Whether the operation requires client-side execution.
- Whether caching should be used.
- Whether revalidation should be used.
- Whether streaming is appropriate.
- Whether an external fetching library should be used.

Do not introduce arbitrary fetching patterns without justification.

### Important rule

Visual components must not make direct calls to external APIs.

Communication must go through the corresponding architecture:

```text
Component
   ↓
Hook (if applicable)
   ↓
Service / Adapter
   ↓
Next.js server layer
   ↓
External API
```

When an operation can safely run on the server, the server must be preferred over the client.

Never expose secrets, API keys, private tokens, or credentials in code that runs in the browser.

---

# 7. Services

Operations related to a domain must be encapsulated in **services** where appropriate.

A service may be responsible for:

- Executing business operations against a data source.
- Coordinating calls.
- Communicating with adapters.
- Encapsulating infrastructure details.
- Exposing a clean interface to hooks or server-side code.

Example:

```text
services/
├── user/
│   ├── user.service.ts
│   └── user.type.ts
```

A service must not contain presentation responsibilities.

---

# 8. Adapters

When there is a need to adapt an API, SDK, external provider, or external data structure to the application's domain, use **Adapters**.

Adapters must live in their own folder and file.

Example:

```text
adapters/
├── stripe/
│   └── stripe.adapter.ts
├── openai/
│   └── openai.adapter.ts
└── database/
    └── database.adapter.ts
```

The purpose of an adapter is to insulate the rest of the application from the external provider's specific details.

Conceptual example:

```text
Application
     ↓
Service
     ↓
Adapter
     ↓
External Provider
```

If the external provider changes in the future, it should ideally be possible to modify the adapter without having to modify the whole application.

---

# 9. Separation of responsibilities

Every file must have a clear responsibility.

Avoid files that mix:

- UI.
- State.
- business logic.
- API calls.
- data transformation.
- constants.
- types.
- third-party integration.

For example, avoid:

```text
UserPage.tsx
```

containing all of the following at once:

```text
UI
+ API calls
+ business logic
+ types
+ constants
+ data transformation
```

Prefer:

```text
UserPage.tsx
use-user.hook.ts
user.service.ts
user.adapter.ts
user.type.ts
user.constants.ts
user.utils.ts
```

---

# 10. Structure by responsibility

The exact folder structure may be adapted to the size of the project, but it must always respect the separation of responsibilities.

A reference structure could be:

```text
src/
├── app/
│   ├── api/
│   ├── layout.tsx
│   └── page.tsx
│
├── components/
│   ├── ui/
│   └── shared/
│
├── hooks/
│
├── services/
│
├── adapters/
│
├── utils/
│
├── types/
│
├── constants/
│
├── lib/
│
└── ...
```

When a feature is large enough, it can be organized by domain/feature:

```text
features/
└── users/
    ├── components/
    ├── hooks/
    ├── services/
    ├── adapters/
    ├── utils/
    ├── user.type.ts
    └── user.constants.ts
```

The AI must choose the structure that best preserves decoupling and scalability, avoiding unnecessary folders for small features.

---

# 11. Dependency rule

Dependencies between layers must follow a clear direction.

Preferably:

```text
UI
 ↓
Hooks
 ↓
Services
 ↓
Adapters
 ↓
External Providers
```

Lower layers must not depend on higher layers.

For example:

❌ A service importing a React component.

❌ An adapter importing a hook.

❌ A util depending on a component.

❌ A component accessing an external API directly when a service layer exists.

---

# 12. Do not duplicate logic

Before creating a new function, hook, service, adapter, utility, or component, the AI must check whether a reusable implementation already exists.

Do not duplicate:

- business logic;
- API calls;
- validations;
- data transformation;
- constants;
- types;
- utilities.

If a suitable implementation exists, reuse it.

---

# 13. Naming conventions

File names must clearly indicate their responsibility.

Examples:

```text
user.type.ts
user.constants.ts
user.service.ts
user.adapter.ts
user.utils.ts
use-user.hook.ts
```

Names must be consistent across the whole project.

Do not use generic names such as:

```text
helpers.ts
common.ts
misc.ts
stuff.ts
functions.ts
```

when the file could have a name that clearly describes its responsibility.

---

# 14. Avoid "God Files"

Do not create excessively large files that accumulate multiple responsibilities.

If a file starts to contain too much logic, splitting it must be considered.

For example:

```text
❌ user.ts
```

containing:

- types;
- constants;
- API;
- validations;
- transformation;
- business logic;
- UI.

It must be split into independent responsibilities.

---

# 15. Server vs Client Components

Use Next.js Server Components by default where appropriate.

Add:

```tsx
"use client";
```

only when necessary.

A Client Component must be used when required, for example, for:

- client state;
- effects;
- browser events;
- browser APIs;
- interaction that necessarily happens on the client.

Do not turn components into Client Components without a concrete reason.

---

# 16. Reuse and composition

Prefer composition over duplication.

Components must be small and composable.

If several screens share visual behavior, create a reusable component.

If they share logical behavior, create a reusable hook.

If they share an infrastructure operation, create or reuse a service/adapter.

---

# 17. Validation and error handling

Error handling must be done in the appropriate layer.

Do not swallow errors silently.

Avoid:

```ts
try {
  ...
} catch {
  return null;
}
```

without a valid reason.

Errors must:

- be handled;
- be propagated when appropriate;
- be transformed when necessary;
- present an appropriate state to the UI.

The UI must display the state it receives, not interpret internal infrastructure details.

---

# 18. Security

Never place the following in client code:

- private API keys;
- secrets;
- sensitive tokens;
- credentials;
- private environment variables.

Sensitive operations must run on the server.

The AI must assume that any code reaching the browser can be inspected by the user.

---

# 19. Changes and refactors

Before modifying existing code, the AI must:

1. Analyze the current structure.
2. Identify the existing responsibilities.
3. Detect violations of these rules.
4. Determine the correct layer.
5. Reuse existing code where possible.
6. Avoid introducing unnecessary new abstractions.
7. Stay consistent with the existing architecture.

Do not perform massive refactors if they are not necessary to accomplish the requested goal.

---

# 20. Golden rule

Before creating any file or writing any code, the AI must ask itself:

> **What exactly is this code's responsibility, and which is the correct layer to place it in?**

The AI must avoid placing code somewhere simply because "it works".

Code must live where it **architecturally belongs**.

---

# 21. Mandatory checklist before delivering code

Before delivering any implementation, the AI must verify:

- [ ] Is the UI purely presentational?
- [ ] Is business logic kept out of the components?
- [ ] Is client logic encapsulated in custom hooks where appropriate?
- [ ] Are the utils really utils?
- [ ] Are reusable types in `.type.ts` files?
- [ ] Are reusable constants in `.constants.ts` files?
- [ ] Do API calls follow the patterns recommended by Next.js?
- [ ] Are services separated from the UI?
- [ ] Are adapters isolated in their own layer?
- [ ] Are the dependencies between layers respected?
- [ ] Is logic duplication avoided?
- [ ] Is existing code reused?
- [ ] Are files with multiple responsibilities avoided?
- [ ] Is a Server Component used where appropriate?
- [ ] Is unnecessary `"use client"` avoided?
- [ ] Are no secrets exposed on the client?
- [ ] Does the solution preserve the project's scalability?
- [ ] Is the implementation consistent with the rest of the architecture?

If any answer is **NO**, the AI must correct the implementation before delivering it.

---

## FUNDAMENTAL PRINCIPLE

**Do not prioritize merely making the code work.**

The solution must work **and also respect the architecture, separation of responsibilities, maintainability, scalability, and conventions established in this document.**

When several technically valid solutions exist, choose the one with **the lowest coupling, the clearest responsibilities, and the best alignment with the official Next.js and TypeScript conventions**.
