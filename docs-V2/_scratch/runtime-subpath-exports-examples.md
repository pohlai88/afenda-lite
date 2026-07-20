# Runtime Subpath Exports: Code Examples

## The Problem in Practice

### Current Situation (Dangerous)

```typescript
// apps/web/middleware.ts (Edge Runtime)
import { recordHttpRequest } from "@afenda/metrics";
import { createLogger } from "@afenda/logger";

export async function middleware(request: NextRequest) {
  // ❌ BREAKS: Edge runtime tries to load prom-client
  // Error: Cannot find module 'prom-client'
  recordHttpRequest({
    method: request.method,
    path: request.nextUrl.pathname,
    status: 200,
    durationMs: 10
  });
}
```

### After Fix (Safe)

```typescript
// apps/web/middleware.ts (Edge Runtime)
import { recordHttpRequest } from "@afenda/metrics/edge";
import { createEdgeLogger } from "@afenda/logger/edge";

export async function middleware(request: NextRequest) {
  // ✅ WORKS: Edge-safe console emit
  recordHttpRequest({
    method: request.method,
    path: request.nextUrl.pathname,
    status: 200,
    durationMs: 10
  });
}
```

## Real-World Usage Patterns

### Pattern 1: API Route (Node Runtime)

```typescript
// apps/web/app/api/users/route.ts
import { recordHttpRequest } from "@afenda/metrics/node";
import { createLogger } from "@afenda/logger";
import { compose, withHttpContext } from "@afenda/http/node";

export const GET = compose(
  withHttpContext(),
  async (request, context) => {
    const logger = createLogger({ service: "api-users" });
    logger.info({ userId: context.userId }, "Fetching users");
    
    // Node Prometheus metrics
    recordHttpRequest({
      method: "GET",
      path: "/api/users",
      status: 200,
      durationMs: 45
    });
    
    return Response.json({ data: [] });
  }
);
```

### Pattern 2: Edge Middleware

```typescript
// apps/web/middleware.ts
import { createEdgeLogger } from "@afenda/logger/edge";
import { recordHttpRequest } from "@afenda/metrics/edge";
import { createCorrelationId } from "@afenda/http";  // Universal

export async function middleware(request: NextRequest) {
  const correlationId = createCorrelationId();
  const logger = createEdgeLogger({ service: "edge-proxy" });
  
  logger.info({ correlationId, path: request.nextUrl.pathname }, "Request");
  
  const response = NextResponse.next();
  
  // Edge-safe metric (console.log or no-op)
  recordHttpRequest({
    method: request.method,
    path: request.nextUrl.pathname,
    status: response.status,
    durationMs: 5
  });
  
  return response;
}
```

### Pattern 3: Server Component (Universal)

```typescript
// apps/web/app/dashboard/page.tsx
import type { RecordHttpRequestInput } from "@afenda/metrics/core";
import type { HttpContext } from "@afenda/http";

// ✅ Only import types in server components
async function DashboardPage() {
  // Server components can use either runtime
  // But prefer types-only imports for reusable utilities
  
  return <div>Dashboard</div>;
}
```

### Pattern 4: Shared Utility (Type-Safe)

```typescript
// apps/web/lib/api-client.ts
import type { HttpContext } from "@afenda/http";
import type { RecordHttpRequestInput } from "@afenda/metrics/core";

/**
 * Shared API utilities use types from /core
 * Actual recording happens at runtime boundaries
 */
export function buildMetricInput(
  context: HttpContext,
  status: number,
  durationMs: number
): RecordHttpRequestInput {
  return {
    method: context.method,
    path: context.path,
    status,
    durationMs
  };
}
```

### Pattern 5: Testing (Isolated)

```typescript
// packages/runtime/http/__tests__/compose.test.ts
import { createMockHttpContext } from "@afenda/http/testing";
import { compose } from "@afenda/http";

test("compose chains middleware", async () => {
  const mockContext = createMockHttpContext({
    method: "GET",
    path: "/test"
  });
  
  // Test without actual metrics/logging
  const handler = compose(/* ... */);
  await handler(new Request("http://localhost/test"), mockContext);
});
```

## Migration Strategy

### Step 1: Find All Metrics Imports

```bash
# Find all @afenda/metrics imports in apps/web
git grep "from ['\"]@afenda/metrics" apps/web/
```

### Step 2: Classify by Runtime

```typescript
// middleware.ts, proxy.ts → /edge
// app/api/*/route.ts → /node
// app/**/page.tsx (if needed) → /core (types only)
```

### Step 3: Update Imports

```bash
# Example: Update middleware
# Before: import { recordHttpRequest } from "@afenda/metrics"
# After:  import { recordHttpRequest } from "@afenda/metrics/edge"
```

### Step 4: Verify

```bash
# Should pass without errors
pnpm --filter @afenda/web build
```

## Edge Runtime Detection Helper

```typescript
// apps/web/lib/runtime.ts
export function isEdgeRuntime(): boolean {
  return typeof EdgeRuntime !== "undefined";
}

// Conditional import helper (if needed)
export async function getMetricsRecorder() {
  if (isEdgeRuntime()) {
    const { recordHttpRequest } = await import("@afenda/metrics/edge");
    return recordHttpRequest;
  }
  const { recordHttpRequest } = await import("@afenda/metrics/node");
  return recordHttpRequest;
}
```

## Bundle Size Impact

### Before (Dangerous)
```
middleware.js: 45kb
  - Includes prom-client (40kb) ❌
  - Fails at runtime
```

### After (Optimized)
```
middleware.js: 5kb ✅
  - Only edge-safe code
  - Console emit or no-op
```

## Common Mistakes to Avoid

### ❌ Mistake 1: Importing Everything from Root

```typescript
// BAD: Pulls entire package
import { everything } from "@afenda/metrics";
```

### ❌ Mistake 2: Dynamic Import Without Type Safety

```typescript
// BAD: No type checking
const metrics = await import("@afenda/metrics");
metrics.recordHttpRequest({
  method: "GET"  // Missing required fields!
});
```

### ❌ Mistake 3: Mixing Runtimes

```typescript
// BAD: Edge middleware importing Node code
import { createLogger } from "@afenda/logger";  // Wrong! Use /edge
```

### ✅ Correct: Explicit Runtime Imports

```typescript
// GOOD: Clear runtime separation
import { recordHttpRequest } from "@afenda/metrics/edge";
import type { RecordHttpRequestInput } from "@afenda/metrics/core";
```

## See Also

- [runtime-subpath-exports-audit.md](./runtime-subpath-exports-audit.md) - Full audit
- [packages/README.md](../../packages/README.md) - Package catalog
- [AGENTS.md](../../AGENTS.md) - Runtime infrastructure requirements
