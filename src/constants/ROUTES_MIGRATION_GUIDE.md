# Routes Constants Migration Guide

## ✅ Benefits of Using Route Constants

### 1. **Consistency & Maintainability**
- All routes defined in one central location
- No more typos in route paths
- Easy to rename routes across the entire application
- IDE autocomplete and IntelliSense support

### 2. **Type Safety**
- TypeScript ensures route paths are correct
- Compile-time checking prevents runtime errors
- Refactoring support with IDE

### 3. **Better Documentation**
- Self-documenting code
- Clear route hierarchy
- Swagger tags consistency

### 4. **DRY Principle**
- No duplication of route strings
- Reusable across frontend and backend
- Single source of truth

## 📁 File Structure

```
src/constants/
├── routes.ts           # Main route constants
└── routeHelpers.ts     # Helper functions
```

## 🚀 Usage Examples

### Basic Route Usage

```typescript
// ❌ Before (hard-coded strings)
fastify.post("/register", { ... });
fastify.get("/users/:id", { ... });

// ✅ After (using constants)
import { ROUTE_SEGMENTS, ROUTE_TAGS } from "../constants/routes";

fastify.post(ROUTE_SEGMENTS.AUTH.REGISTER, {
  schema: {
    tags: [ROUTE_TAGS.AUTH],
    // ...
  }
});

fastify.get(ROUTE_SEGMENTS.USERS.BY_ID, {
  schema: {
    tags: [ROUTE_TAGS.USERS],
    // ...
  }
});
```

### Full URL Building (for client-side)

```typescript
import { ROUTES } from "../constants/routes";

// Get user by ID
const userUrl = ROUTES.USERS.BY_ID("12345");
// Result: "/api/users/12345"

// Get shala classes
const classesUrl = ROUTES.SHALAS.CLASSES("shala123");
// Result: "/api/shalas/shala123/classes"
```

### Route Helpers

```typescript
import { RouteBuilders } from "../constants/routeHelpers";

// Dynamic route building
const cancelBookingUrl = RouteBuilders.booking.cancel("booking123");
const userProfileUrl = RouteBuilders.user.getById("user456");
```

## 🔄 Migration Steps

### Step 1: Import Constants
```typescript
import { ROUTE_SEGMENTS, ROUTE_TAGS } from "../constants/routes";
```

### Step 2: Replace Route Paths
```typescript
// Replace hardcoded paths
fastify.post("/register" → ROUTE_SEGMENTS.AUTH.REGISTER
fastify.get("/:id" → ROUTE_SEGMENTS.USERS.BY_ID
fastify.get("/stats/overview" → ROUTE_SEGMENTS.USERS.STATS.OVERVIEW
```

### Step 3: Replace Swagger Tags
```typescript
// Replace hardcoded tags
tags: ["Users"] → tags: [ROUTE_TAGS.USERS]
tags: ["Authentication"] → tags: [ROUTE_TAGS.AUTH]
tags: ["Shalas"] → tags: [ROUTE_TAGS.SHALAS]
```

## 📝 Quick Reference

### Route Segments (for Fastify routes)
```typescript
ROUTE_SEGMENTS.AUTH.REGISTER        // "/register"
ROUTE_SEGMENTS.AUTH.LOGIN           // "/login"
ROUTE_SEGMENTS.USERS.BY_ID          // "/:id"
ROUTE_SEGMENTS.USERS.STATS.OVERVIEW // "/stats/overview"
ROUTE_SEGMENTS.SHALAS.SEARCH        // "/search"
ROUTE_SEGMENTS.BOOKINGS.MY_BOOKINGS // "/my-bookings"
```

### Full Routes (for client-side)
```typescript
ROUTES.AUTH.REGISTER                // "/api/auth/register"
ROUTES.USERS.BY_ID("123")          // "/api/users/123"
ROUTES.SHALAS.CLASSES("abc")       // "/api/shalas/abc/classes"
```

### Swagger Tags
```typescript
ROUTE_TAGS.AUTH         // "Authentication"
ROUTE_TAGS.USERS        // "Users"
ROUTE_TAGS.SHALAS       // "Shalas"
ROUTE_TAGS.BOOKINGS     // "Bookings"
```

## 🛠️ Bulk Update Commands

You can use find-and-replace to quickly update existing files:

### Replace Route Paths
```regex
Find: "/register"
Replace: ROUTE_SEGMENTS.AUTH.REGISTER

Find: "/:id"
Replace: ROUTE_SEGMENTS.USERS.BY_ID

Find: "/stats/overview"
Replace: ROUTE_SEGMENTS.USERS.STATS.OVERVIEW
```

### Replace Swagger Tags
```regex
Find: tags: \["Users"\]
Replace: tags: [ROUTE_TAGS.USERS]

Find: tags: \["Authentication"\]
Replace: tags: [ROUTE_TAGS.AUTH]
```

## 🎯 Best Practices

1. **Always use constants** - Never hardcode route strings
2. **Import at the top** - Keep imports organized
3. **Use descriptive names** - Make route purpose clear
4. **Group related routes** - Organize by feature/module
5. **Document new routes** - Add to constants file first

## 🔮 Future Benefits

- **Frontend Integration**: Share same constants with React/Next.js
- **API Client Generation**: Auto-generate API clients
- **Testing**: Consistent route testing
- **Monitoring**: Easy route analytics and logging
- **Documentation**: Auto-generated API docs

## 📋 Migration Checklist

- [x] ✅ Created `/src/constants/routes.ts`
- [x] ✅ Created `/src/constants/routeHelpers.ts`
- [x] ✅ Updated `userRoutesFastify.ts`
- [x] ✅ Updated `authRoutesFastify.ts` (partial)
- [ ] ⏳ Update `shalaRoutesFastify.ts`
- [ ] ⏳ Update `bookingRoutesFastify.ts`
- [ ] ⏳ Update all remaining route files
- [ ] ⏳ Update frontend to use same constants

This migration will significantly improve your codebase maintainability and reduce bugs! 🚀
