# Public Roadmap Feature: Framework Research & Implementation Guide

**Date**: 2025-12-22
**Frameworks Researched**: React Router v7.9.5, Django REST Framework 3.15.2, TanStack Query v5.90.12, Zustand v5.0.9, PostgreSQL (psycopg 3.3.0)

---

## Table of Contents

1. [React Router v7 - Public Routes & SSR/SSG](#1-react-router-v7---public-routes--ssrssg)
2. [Django REST Framework - Public API Endpoints](#2-django-rest-framework---public-api-endpoints)
3. [TanStack Query - Caching & Real-Time Updates](#3-tanstack-query---caching--real-time-updates)
4. [Zustand - Anonymous User State Management](#4-zustand---anonymous-user-state-management)
5. [PostgreSQL - Voting & Subscription Tables](#5-postgresql---voting--subscription-tables)
6. [Implementation Recommendations](#6-implementation-recommendations)

---

## 1. React Router v7 - Public Routes & SSR/SSG

### Version Information
- **React Router**: v7.9.5
- **Mode**: Framework mode (with SSR support)
- **Key Docs**:
  - [Routing](https://raw.githubusercontent.com/remix-run/react-router/main/docs/start/framework/routing.md)
  - [Data Loading](https://raw.githubusercontent.com/remix-run/react-router/main/docs/start/framework/data-loading.md)

### Key Concepts for Public Pages

#### 1.1 Route Configuration

React Router v7 uses a configuration-based routing system in `app/routes.ts`:

```typescript
// app/routes.ts
import { type RouteConfig, route, layout, index } from "@react-router/dev/routes";

export default [
  // Public roadmap routes (no authentication required)
  layout("./public/layout.tsx", [
    route("roadmap", "./public/roadmap/index.tsx"),
    route("roadmap/:itemId", "./public/roadmap/item.tsx"),
  ]),

  // Authenticated routes
  layout("./app/layout.tsx", [
    // ... authenticated routes
  ]),
] satisfies RouteConfig;
```

**Current Plane Pattern** (from `/Users/corcoss/code/plane/apps/space/app/routes.ts`):
```typescript
export default [
  index("./page.tsx"),
  route(":workspaceSlug/:projectId", "./[workspaceSlug]/[projectId]/page.tsx"),
  layout("./issues/[anchor]/layout.tsx", [
    route("issues/:anchor", "./issues/[anchor]/page.tsx")
  ]),
  route("*", "./not-found.tsx"),
] satisfies RouteConfig;
```

#### 1.2 Data Loading Patterns

**Server-Side Rendering (SSR)** - For SEO and initial page load performance:

```typescript
// app/public/roadmap/index.tsx
import type { Route } from "./+types/index";

// Server loader - runs on server for initial SSR, then on client for navigation
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const filter = url.searchParams.get("filter") || "all";

  // Fetch public roadmap data
  const response = await fetch(`${API_URL}/api/public/roadmap?filter=${filter}`);
  if (!response.ok) {
    throw new Response("Not Found", { status: 404 });
  }

  return response.json();
}

export default function RoadmapIndex({ loaderData }: Route.ComponentProps) {
  const { items, stats } = loaderData;

  return (
    <div>
      <h1>Public Roadmap</h1>
      <RoadmapGrid items={items} stats={stats} />
    </div>
  );
}
```

**Current Plane Pattern** (from `/Users/corcoss/code/plane/apps/space/app/[workspaceSlug]/[projectId]/page.tsx`):
```typescript
export const clientLoader = async ({ params, request }: Route.ClientLoaderArgs) => {
  const { workspaceSlug, projectId } = params;

  if (!workspaceSlug || !projectId) {
    throw redirect("/404");
  }

  let response = await publishService.retrieveSettingsByProjectId(workspaceSlug, projectId);
  // ... handle response
};
```

**Client-Side Only Loading** - For dynamic, client-rendered pages:

```typescript
// app/public/roadmap/item.tsx
export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const response = await fetch(`/api/public/roadmap/${params.itemId}`);
  return response.json();
}

// Show loading state during hydration
export function HydrateFallback() {
  return <div>Loading roadmap item...</div>;
}

// Force client loader to run even during hydration
clientLoader.hydrate = true as const;
```

**Static Pre-Rendering** - For content that doesn't change often:

```typescript
// react-router.config.ts
import type { Config } from "@react-router/dev/config";

export default {
  async prerender() {
    // Fetch all roadmap items to pre-render
    const items = await fetchRoadmapItems();
    return items.map((item) => `/roadmap/${item.id}`);
  },
} satisfies Config;
```

#### 1.3 SEO & Meta Tags

```typescript
// app/root.tsx
export const meta: Route.MetaFunction = () => [
  { title: "Public Roadmap | Plane Treasury" },
  { name: "description", content: "View our public product roadmap" },
  { property: "og:title", content: "Public Roadmap | Plane Treasury" },
  { property: "og:description", content: "View our public product roadmap" },
  { name: "robots", content: "index, follow" }, // Allow indexing for public pages
];

// Security headers
export const headers: Route.HeadersFunction = () => ({
  "Referrer-Policy": "origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-DNS-Prefetch-Control": "on",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
});
```

**Current Plane Pattern** (from `/Users/corcoss/code/plane/apps/space/app/root.tsx`):
- Uses `<meta name="robots" content="noindex, nofollow" />` for private content
- For public roadmap, change to `content="index, follow"`

#### 1.4 Layout Patterns

```typescript
// app/public/layout.tsx
import { Outlet } from "react-router";

export default function PublicLayout() {
  return (
    <div className="public-layout">
      <PublicHeader />
      <main>
        <Outlet /> {/* Child routes render here */}
      </main>
      <PublicFooter />
    </div>
  );
}
```

### Implementation Recommendations for Plane

1. **Create separate public routes in `apps/space/app/routes.ts`**:
   ```typescript
   route("public/roadmap/:workspaceSlug/:projectId", "./public/roadmap.tsx"),
   ```

2. **Use `loader` (not `clientLoader`) for SEO**:
   - Server-rendered for search engines
   - Automatic data fetching during navigation
   - Better perceived performance

3. **Add middleware for access control**:
   ```typescript
   export async function loader({ params }: Route.LoaderArgs) {
     // Check if roadmap is public
     const settings = await checkRoadmapPublicSettings(params.projectId);
     if (!settings.isPublic) {
       throw new Response("Not Found", { status: 404 });
     }
     // ... fetch roadmap data
   }
   ```

---

## 2. Django REST Framework - Public API Endpoints

### Version Information
- **Django**: v4.2.27
- **Django REST Framework**: v3.15.2
- **Key Docs**: [Permissions](https://www.django-rest-framework.org/api-guide/permissions/), [Throttling](https://www.django-rest-framework.org/api-guide/throttling/)

### Key Concepts for Public Endpoints

#### 2.1 Permission Classes

**Current Plane Pattern** (from `/Users/corcoss/code/plane/apps/api/plane/app/views/timezone/base.py`):
```python
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

class TimezoneEndpoint(APIView):
    permission_classes = [AllowAny]  # No authentication required
    throttle_classes = [AuthenticationThrottle]  # Rate limiting

    def get(self, request):
        # Public endpoint logic
        return Response({"timezones": timezone_list})
```

**Permission Class Options**:

| Permission Class | Use Case | Example |
|-----------------|----------|---------|
| `AllowAny` | Completely public, no auth required | Public roadmap view |
| `IsAuthenticatedOrReadOnly` | Public read, authenticated write | Public voting (read) but requires auth to vote |
| `IsAuthenticated` | Requires authentication | Admin-only endpoints |

**Custom Permission for Public Roadmap**:
```python
# plane/app/permissions/roadmap.py
from rest_framework import permissions

class IsRoadmapPublicOrAuthenticated(permissions.BasePermission):
    """
    Allow public access to roadmap if project settings allow it,
    otherwise require authentication.
    """

    def has_permission(self, request, view):
        # Check if roadmap is enabled for this project
        project_id = view.kwargs.get('project_id')
        try:
            from plane.db.models import ProjectPublishSettings
            settings = ProjectPublishSettings.objects.get(project_id=project_id)

            # If roadmap is public, allow GET requests
            if settings.is_roadmap_public and request.method in permissions.SAFE_METHODS:
                return True
        except ProjectPublishSettings.DoesNotExist:
            pass

        # Otherwise require authentication
        return request.user and request.user.is_authenticated
```

#### 2.2 Public Roadmap ViewSet Example

```python
# plane/app/views/roadmap/public.py
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from plane.app.permissions import IsRoadmapPublicOrAuthenticated
from plane.app.serializers import RoadmapItemSerializer
from plane.db.models import Issue, ProjectPublishSettings

class PublicRoadmapViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public roadmap endpoint - read-only access to roadmap items.
    """
    serializer_class = RoadmapItemSerializer
    permission_classes = [IsRoadmapPublicOrAuthenticated]
    throttle_classes = [AnonRateThrottle, UserRateThrottle]

    def get_queryset(self):
        workspace_slug = self.kwargs.get("workspace_slug")
        project_id = self.kwargs.get("project_id")

        # Verify roadmap is public
        try:
            settings = ProjectPublishSettings.objects.get(
                workspace__slug=workspace_slug,
                project_id=project_id,
                is_roadmap_public=True,
            )
        except ProjectPublishSettings.DoesNotExist:
            return Issue.objects.none()

        # Return only roadmap-tagged issues
        return Issue.objects.filter(
            project_id=project_id,
            workspace__slug=workspace_slug,
            labels__name__in=settings.roadmap_labels,  # Filter by roadmap labels
            deleted_at__isnull=True,
        ).select_related("state", "project").prefetch_related("labels", "assignees")

    @action(detail=False, methods=["get"])
    def stats(self, request, workspace_slug, project_id):
        """Get roadmap statistics (vote counts, status breakdown)."""
        queryset = self.get_queryset()

        from django.db.models import Count, Sum
        stats = queryset.aggregate(
            total_items=Count("id"),
            total_votes=Sum("votes__vote"),  # Sum of all votes
            completed=Count("id", filter=Q(state__group="completed")),
            in_progress=Count("id", filter=Q(state__group="started")),
        )

        return Response(stats)
```

#### 2.3 Throttling for Public Endpoints

**Plane already uses throttling** (from `/Users/corcoss/code/plane/apps/api/plane/app/views/timezone/base.py`):
```python
from plane.authentication.rate_limit import AuthenticationThrottle

class TimezoneEndpoint(APIView):
    throttle_classes = [AuthenticationThrottle]
```

**Recommended Throttling Configuration**:
```python
# settings/base.py
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',  # Anonymous users: 100 requests per hour
        'user': '1000/hour',  # Authenticated users: 1000 requests per hour
        'voting': '10/minute',  # Voting endpoint: 10 votes per minute
    }
}
```

**Custom Throttle for Voting**:
```python
# plane/app/throttles.py
from rest_framework.throttling import UserRateThrottle

class VotingThrottle(UserRateThrottle):
    rate = '10/minute'  # Prevent vote spamming
    scope = 'voting'
```

Usage:
```python
class RoadmapVoteViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]  # Allow anonymous voting
    throttle_classes = [VotingThrottle]

    def create(self, request, item_id):
        # Handle vote...
        pass
```

#### 2.4 Email Subscription Endpoint

```python
# plane/app/views/roadmap/subscription.py
from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.core.validators import validate_email
from django.core.exceptions import ValidationError

class RoadmapSubscriptionViewSet(viewsets.ViewSet):
    """
    Handle email subscriptions for roadmap updates.
    Anonymous users can subscribe with just an email.
    """
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    def create(self, request, workspace_slug, project_id):
        email = request.data.get("email")

        # Validate email
        try:
            validate_email(email)
        except ValidationError:
            return Response(
                {"error": "Invalid email address"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if roadmap is public
        try:
            settings = ProjectPublishSettings.objects.get(
                workspace__slug=workspace_slug,
                project_id=project_id,
                is_roadmap_public=True,
            )
        except ProjectPublishSettings.DoesNotExist:
            return Response(
                {"error": "Roadmap not found or not public"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Create or update subscription
        subscription, created = RoadmapSubscription.objects.get_or_create(
            project_id=project_id,
            email=email,
            defaults={"is_active": True}
        )

        if not created and not subscription.is_active:
            subscription.is_active = True
            subscription.save()

        # Send confirmation email
        send_subscription_confirmation_email(email, workspace_slug, project_id)

        return Response(
            {"message": "Successfully subscribed to roadmap updates"},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )

    def destroy(self, request, workspace_slug, project_id):
        """Unsubscribe from roadmap updates."""
        email = request.query_params.get("email")
        token = request.query_params.get("token")  # For unsubscribe link security

        # Verify token and deactivate subscription
        # ... implementation

        return Response(status=status.HTTP_204_NO_CONTENT)
```

### Implementation Recommendations for Plane

1. **Create new public API endpoints** in `plane/app/views/roadmap/`:
   - `public.py` - Public roadmap listing
   - `voting.py` - Anonymous voting
   - `subscription.py` - Email subscriptions

2. **Register URLs** in `plane/app/urls/`:
   ```python
   # plane/app/urls/public.py
   from django.urls import path, include
   from rest_framework.routers import DefaultRouter
   from plane.app.views.roadmap import public, voting, subscription

   router = DefaultRouter()
   router.register(
       r"workspaces/(?P<workspace_slug>[\w-]+)/projects/(?P<project_id>[\w-]+)/roadmap",
       public.PublicRoadmapViewSet,
       basename="public-roadmap"
   )

   urlpatterns = [
       path("", include(router.urls)),
       path("workspaces/<str:workspace_slug>/projects/<str:project_id>/roadmap/vote/",
            voting.RoadmapVoteView.as_view()),
       path("workspaces/<str:workspace_slug>/projects/<str:project_id>/roadmap/subscribe/",
            subscription.RoadmapSubscriptionViewSet.as_view({"post": "create"})),
   ]
   ```

3. **Add CORS configuration** for public endpoints:
   ```python
   # settings/base.py
   CORS_ALLOWED_ORIGINS = [
       "https://yourdomain.gov",
       # ... other origins
   ]

   # Allow credentials for voting from anonymous users
   CORS_ALLOW_CREDENTIALS = True
   ```

---

## 3. TanStack Query - Caching & Real-Time Updates

### Version Information
- **TanStack Query**: v5.90.12
- **Key Docs**: [Caching Guide](https://raw.githubusercontent.com/TanStack/query/main/docs/framework/react/guides/caching.md)

### Key Concepts for Public Data

#### 3.1 Caching Strategy

**Default Cache Behavior**:
- `staleTime`: `0` (data immediately stale after fetch)
- `gcTime` (garbage collection): `5 minutes` (cached data retained for 5 minutes after last use)

**For Public Roadmap** (data changes infrequently):
```typescript
// app/hooks/usePublicRoadmap.ts
import { useQuery } from "@tanstack/react-query";

export function usePublicRoadmap(workspaceSlug: string, projectId: string) {
  return useQuery({
    queryKey: ["public-roadmap", workspaceSlug, projectId],
    queryFn: async () => {
      const response = await fetch(
        `/api/public/workspaces/${workspaceSlug}/projects/${projectId}/roadmap`
      );
      if (!response.ok) throw new Error("Failed to fetch roadmap");
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchOnReconnect: true, // Refetch when connection restored
  });
}
```

**Caching Lifecycle Example**:

```typescript
// Component A mounts
const { data } = usePublicRoadmap("treasury", "proj-123");
// → Network request fires, data cached under ["public-roadmap", "treasury", "proj-123"]

// Component B mounts (5 seconds later)
const { data } = usePublicRoadmap("treasury", "proj-123");
// → Returns cached data immediately
// → Background refetch fires (because staleTime expired)
// → Both components update when new data arrives

// Both components unmount
// → gcTime countdown starts (10 minutes)
// → If Component A remounts within 10 minutes, cached data is available
// → After 10 minutes, cache is garbage collected
```

#### 3.2 Polling for Real-Time Updates

**For live vote counts**:
```typescript
export function useRoadmapVotes(itemId: string) {
  return useQuery({
    queryKey: ["roadmap-votes", itemId],
    queryFn: async () => {
      const response = await fetch(`/api/public/roadmap/${itemId}/votes`);
      return response.json();
    },
    refetchInterval: 30000, // Poll every 30 seconds
    refetchIntervalInBackground: false, // Stop polling when tab is hidden
  });
}
```

**Conditional polling** (only when user is viewing):
```typescript
export function useRoadmapVotes(itemId: string, isViewing: boolean) {
  return useQuery({
    queryKey: ["roadmap-votes", itemId],
    queryFn: async () => {
      const response = await fetch(`/api/public/roadmap/${itemId}/votes`);
      return response.json();
    },
    refetchInterval: isViewing ? 30000 : false, // Only poll when viewing
    enabled: isViewing, // Only fetch when enabled
  });
}
```

#### 3.3 Optimistic Updates for Voting

**Immediate UI feedback before server confirmation**:
```typescript
// app/hooks/useRoadmapVote.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useRoadmapVote(itemId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vote: 1 | -1) => {
      const response = await fetch(`/api/public/roadmap/${itemId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote }),
      });
      if (!response.ok) throw new Error("Vote failed");
      return response.json();
    },

    // Optimistically update UI before server responds
    onMutate: async (vote) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["roadmap-votes", itemId] });

      // Snapshot current value
      const previousVotes = queryClient.getQueryData(["roadmap-votes", itemId]);

      // Optimistically update to new value
      queryClient.setQueryData(["roadmap-votes", itemId], (old: any) => ({
        ...old,
        upvotes: old.upvotes + (vote === 1 ? 1 : 0),
        downvotes: old.downvotes + (vote === -1 ? 1 : 0),
        userVote: vote,
      }));

      // Return snapshot for rollback
      return { previousVotes };
    },

    // If mutation fails, rollback to snapshot
    onError: (err, vote, context) => {
      queryClient.setQueryData(["roadmap-votes", itemId], context?.previousVotes);
    },

    // Always refetch after success or error
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmap-votes", itemId] });
    },
  });
}
```

**Usage in component**:
```typescript
function RoadmapItem({ item }) {
  const { data: votes } = useRoadmapVotes(item.id);
  const voteMutation = useRoadmapVote(item.id);

  return (
    <div>
      <h2>{item.title}</h2>
      <div>
        <button
          onClick={() => voteMutation.mutate(1)}
          disabled={voteMutation.isPending}
        >
          👍 {votes?.upvotes || 0}
        </button>
        <button
          onClick={() => voteMutation.mutate(-1)}
          disabled={voteMutation.isPending}
        >
          👎 {votes?.downvotes || 0}
        </button>
      </div>
      {voteMutation.isError && <p>Failed to vote. Please try again.</p>}
    </div>
  );
}
```

#### 3.4 Prefetching for Performance

**Prefetch roadmap items on hover**:
```typescript
// app/components/RoadmapGrid.tsx
import { useQueryClient } from "@tanstack/react-query";

export function RoadmapGrid({ items }) {
  const queryClient = useQueryClient();

  const prefetchItem = (itemId: string) => {
    queryClient.prefetchQuery({
      queryKey: ["roadmap-item", itemId],
      queryFn: () => fetch(`/api/public/roadmap/${itemId}`).then(r => r.json()),
      staleTime: 5 * 60 * 1000,
    });
  };

  return (
    <div className="grid">
      {items.map((item) => (
        <div
          key={item.id}
          onMouseEnter={() => prefetchItem(item.id)}
        >
          <Link to={`/roadmap/${item.id}`}>{item.title}</Link>
        </div>
      ))}
    </div>
  );
}
```

### Implementation Recommendations for Plane

1. **Wrap app with QueryClientProvider** (already exists in Plane):
   ```typescript
   // app/root.tsx
   import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

   const queryClient = new QueryClient({
     defaultOptions: {
       queries: {
         staleTime: 60 * 1000, // Default 1 minute
         gcTime: 5 * 60 * 1000, // Default 5 minutes
       },
     },
   });

   export function Root() {
     return (
       <QueryClientProvider client={queryClient}>
         <Outlet />
       </QueryClientProvider>
     );
   }
   ```

2. **Create query hooks** in `apps/space/core/hooks/`:
   - `usePublicRoadmap.ts` - Fetch roadmap items
   - `useRoadmapVotes.ts` - Fetch vote counts
   - `useRoadmapVote.ts` - Submit votes
   - `useRoadmapSubscription.ts` - Subscribe to updates

3. **Use React Query DevTools** (already available):
   ```typescript
   import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

   <ReactQueryDevtools initialIsOpen={false} />
   ```

---

## 4. Zustand - Anonymous User State Management

### Version Information
- **Zustand**: v5.0.9
- **Key Docs**: [README](https://github.com/pmndrs/zustand)

### Key Concepts for Anonymous State

#### 4.1 Basic Store Creation

```typescript
// app/stores/roadmapStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface RoadmapState {
  // Anonymous user voting state
  votes: Record<string, 1 | -1>; // itemId -> vote value
  viewedItems: Set<string>; // Track which items user has viewed

  // Actions
  addVote: (itemId: string, vote: 1 | -1) => void;
  removeVote: (itemId: string) => void;
  markAsViewed: (itemId: string) => void;
}

export const useRoadmapStore = create<RoadmapState>()(
  persist(
    (set) => ({
      votes: {},
      viewedItems: new Set(),

      addVote: (itemId, vote) =>
        set((state) => ({
          votes: { ...state.votes, [itemId]: vote },
        })),

      removeVote: (itemId) =>
        set((state) => {
          const { [itemId]: removed, ...rest } = state.votes;
          return { votes: rest };
        }),

      markAsViewed: (itemId) =>
        set((state) => ({
          viewedItems: new Set(state.viewedItems).add(itemId),
        })),
    }),
    {
      name: "roadmap-storage", // localStorage key
      storage: createJSONStorage(() => localStorage),

      // Serialize Set to Array for localStorage
      partialize: (state) => ({
        votes: state.votes,
        viewedItems: Array.from(state.viewedItems),
      }),

      // Deserialize Array back to Set
      merge: (persistedState: any, currentState) => ({
        ...currentState,
        ...persistedState,
        viewedItems: new Set(persistedState.viewedItems || []),
      }),
    }
  )
);
```

#### 4.2 Usage in Components

```typescript
// app/components/RoadmapItem.tsx
import { useRoadmapStore } from "../stores/roadmapStore";

export function RoadmapItem({ item }) {
  // Select only the state you need (prevents unnecessary re-renders)
  const vote = useRoadmapStore((state) => state.votes[item.id]);
  const addVote = useRoadmapStore((state) => state.addVote);
  const removeVote = useRoadmapStore((state) => state.removeVote);

  const handleVote = (newVote: 1 | -1) => {
    if (vote === newVote) {
      // Remove vote if clicking same button
      removeVote(item.id);
    } else {
      // Add or update vote
      addVote(item.id, newVote);
    }
  };

  return (
    <div>
      <h2>{item.title}</h2>
      <button
        onClick={() => handleVote(1)}
        className={vote === 1 ? "active" : ""}
      >
        👍
      </button>
      <button
        onClick={() => handleVote(-1)}
        className={vote === -1 ? "active" : ""}
      >
        👎
      </button>
    </div>
  );
}
```

#### 4.3 Syncing Local State with Server

```typescript
// app/stores/roadmapStore.ts
export const useRoadmapStore = create<RoadmapState>()(
  persist(
    (set, get) => ({
      votes: {},
      isSyncing: false,
      lastSyncedAt: null,

      addVote: (itemId, vote) => {
        set((state) => ({
          votes: { ...state.votes, [itemId]: vote },
        }));

        // Sync with server
        get().syncVoteWithServer(itemId, vote);
      },

      syncVoteWithServer: async (itemId, vote) => {
        set({ isSyncing: true });

        try {
          await fetch(`/api/public/roadmap/${itemId}/vote`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ vote }),
          });

          set({
            isSyncing: false,
            lastSyncedAt: Date.now(),
          });
        } catch (error) {
          console.error("Failed to sync vote:", error);

          // Optionally: retry logic or remove vote from local state
          set({ isSyncing: false });
        }
      },
    }),
    {
      name: "roadmap-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

#### 4.4 Advanced: Transient Updates (No Re-Render)

**For frequently changing state** (like scroll position, hover state):

```typescript
// app/stores/roadmapUIStore.ts
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export const useRoadmapUIStore = create(
  subscribeWithSelector<{
    hoveredItemId: string | null;
    scrollPosition: number;
    setHoveredItem: (id: string | null) => void;
    setScrollPosition: (pos: number) => void;
  }>((set) => ({
    hoveredItemId: null,
    scrollPosition: 0,
    setHoveredItem: (id) => set({ hoveredItemId: id }),
    setScrollPosition: (pos) => set({ scrollPosition: pos }),
  }))
);

// Usage: Subscribe without causing re-render
function RoadmapGrid() {
  const scrollRef = useRef(0);

  useEffect(() => {
    // Subscribe to scroll position changes without re-rendering
    const unsub = useRoadmapUIStore.subscribe(
      (state) => state.scrollPosition,
      (scrollPosition) => {
        scrollRef.current = scrollPosition;
        // Update DOM directly without triggering React re-render
        window.scrollTo(0, scrollPosition);
      }
    );

    return unsub;
  }, []);

  return <div>...</div>;
}
```

#### 4.5 Integration with TanStack Query

**Combine Zustand (UI state) with TanStack Query (server state)**:

```typescript
// app/components/RoadmapItem.tsx
import { useRoadmapStore } from "../stores/roadmapStore";
import { useRoadmapVotes, useRoadmapVote } from "../hooks/useRoadmapVotes";

export function RoadmapItem({ item }) {
  // Local state: User's vote (from localStorage)
  const localVote = useRoadmapStore((state) => state.votes[item.id]);
  const addVote = useRoadmapStore((state) => state.addVote);

  // Server state: Vote counts (from API)
  const { data: votes } = useRoadmapVotes(item.id);
  const voteMutation = useRoadmapVote(item.id);

  const handleVote = (newVote: 1 | -1) => {
    // Update local state immediately
    addVote(item.id, newVote);

    // Sync with server (optimistic update)
    voteMutation.mutate(newVote);
  };

  return (
    <div>
      <h2>{item.title}</h2>
      <div>
        <button
          onClick={() => handleVote(1)}
          className={localVote === 1 ? "active" : ""}
        >
          👍 {votes?.upvotes || 0}
        </button>
        <button
          onClick={() => handleVote(-1)}
          className={localVote === -1 ? "active" : ""}
        >
          👎 {votes?.downvotes || 0}
        </button>
      </div>
    </div>
  );
}
```

### Implementation Recommendations for Plane

1. **Create Zustand stores** in `apps/space/core/stores/`:
   - `roadmapStore.ts` - Anonymous user votes, viewed items
   - `roadmapUIStore.ts` - UI state (filters, sort, layout)

2. **Use `persist` middleware** for localStorage:
   - Store votes locally
   - Survive page refreshes
   - Sync with server on next visit

3. **Combine with TanStack Query**:
   - Zustand: Client-side state (user preferences, votes)
   - TanStack Query: Server-side state (roadmap data, vote counts)

---

## 5. PostgreSQL - Voting & Subscription Tables

### Version Information
- **PostgreSQL**: via psycopg v3.3.0
- **Django**: v4.2.27

### Existing Plane Models

**Plane already has voting models!** (from `/Users/corcoss/code/plane/apps/api/plane/db/models/issue.py`):

```python
class IssueVote(ProjectBaseModel):
    issue = models.ForeignKey(Issue, on_delete=models.CASCADE, related_name="votes")
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="votes")
    vote = models.IntegerField(choices=((-1, "DOWNVOTE"), (1, "UPVOTE")), default=1)

    class Meta:
        unique_together = ["issue", "actor", "deleted_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["issue", "actor"],
                condition=models.Q(deleted_at__isnull=True),
                name="issue_vote_unique_issue_actor_when_deleted_at_null",
            )
        ]
        db_table = "issue_votes"
        ordering = ("-created_at",)
```

**Plane also has reaction models**:
```python
class IssueReaction(ProjectBaseModel):
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="issue_reactions")
    issue = models.ForeignKey(Issue, on_delete=models.CASCADE, related_name="issue_reactions")
    reaction = models.TextField()

    class Meta:
        unique_together = ["issue", "actor", "reaction", "deleted_at"]
        db_table = "issue_reactions"
```

### Adaptations Needed for Public Roadmap

#### 5.1 Anonymous Voting Table

**New model for anonymous votes** (no user account required):

```python
# plane/db/models/roadmap.py
from django.db import models
from django.conf import settings
from .project import ProjectBaseModel

class RoadmapItemVote(ProjectBaseModel):
    """
    Anonymous voting for public roadmap items.
    Uses session ID or fingerprint to prevent duplicate votes.
    """
    issue = models.ForeignKey("db.Issue", on_delete=models.CASCADE, related_name="roadmap_votes")

    # For authenticated users
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="roadmap_votes",
        null=True,
        blank=True,
    )

    # For anonymous users (use browser fingerprint or session ID)
    session_id = models.CharField(max_length=255, null=True, blank=True)
    fingerprint = models.CharField(max_length=255, null=True, blank=True)  # Browser fingerprint
    ip_address = models.GenericIPAddressField(null=True, blank=True)  # Optional, for rate limiting

    vote = models.IntegerField(choices=((-1, "DOWNVOTE"), (1, "UPVOTE")), default=1)

    class Meta:
        constraints = [
            # Ensure one vote per authenticated user
            models.UniqueConstraint(
                fields=["issue", "actor"],
                condition=models.Q(deleted_at__isnull=True, actor__isnull=False),
                name="roadmap_vote_unique_issue_actor_when_deleted_at_null",
            ),
            # Ensure one vote per anonymous session
            models.UniqueConstraint(
                fields=["issue", "session_id"],
                condition=models.Q(deleted_at__isnull=True, session_id__isnull=False),
                name="roadmap_vote_unique_issue_session_when_deleted_at_null",
            ),
            # Ensure one vote per fingerprint (backup for session)
            models.UniqueConstraint(
                fields=["issue", "fingerprint"],
                condition=models.Q(deleted_at__isnull=True, fingerprint__isnull=False),
                name="roadmap_vote_unique_issue_fingerprint_when_deleted_at_null",
            ),
        ]
        db_table = "roadmap_item_votes"
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["issue", "actor"]),
            models.Index(fields=["issue", "session_id"]),
            models.Index(fields=["fingerprint"]),
        ]

    def __str__(self):
        if self.actor:
            return f"{self.issue.name} - {self.actor.email} - {self.get_vote_display()}"
        return f"{self.issue.name} - Anonymous - {self.get_vote_display()}"
```

**Migration**:
```python
# plane/db/migrations/0XXX_add_roadmap_voting.py
from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):
    dependencies = [
        ('db', '0XXX_previous_migration'),
    ]

    operations = [
        migrations.CreateModel(
            name='RoadmapItemVote',
            fields=[
                # ... fields from model above
            ],
            options={
                'db_table': 'roadmap_item_votes',
                'ordering': ('-created_at',),
            },
        ),
        migrations.AddIndex(
            model_name='roadmapitemvote',
            index=models.Index(fields=['issue', 'actor'], name='roadmap_vote_issue_actor_idx'),
        ),
        # ... more indexes
    ]
```

#### 5.2 Email Subscription Table

```python
# plane/db/models/roadmap.py
class RoadmapSubscription(ProjectBaseModel):
    """
    Email subscriptions for roadmap updates.
    Anonymous users can subscribe with just an email.
    """
    project = models.ForeignKey("db.Project", on_delete=models.CASCADE, related_name="roadmap_subscriptions")

    # Email (required)
    email = models.EmailField()

    # Optional: Link to user account if they sign up later
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="roadmap_subscriptions",
        null=True,
        blank=True,
    )

    # Subscription preferences
    is_active = models.BooleanField(default=True)
    frequency = models.CharField(
        max_length=20,
        choices=[
            ("immediate", "Immediate"),
            ("daily", "Daily Digest"),
            ("weekly", "Weekly Digest"),
        ],
        default="weekly",
    )

    # Tracking
    confirmed_at = models.DateTimeField(null=True, blank=True)  # Email confirmation
    unsubscribe_token = models.UUIDField(default=uuid.uuid4, unique=True)  # For unsubscribe links
    last_email_sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["project", "email"],
                condition=models.Q(deleted_at__isnull=True),
                name="roadmap_subscription_unique_project_email_when_deleted_at_null",
            ),
        ]
        db_table = "roadmap_subscriptions"
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["project", "email"]),
            models.Index(fields=["unsubscribe_token"]),
            models.Index(fields=["is_active", "frequency"]),
        ]

    def __str__(self):
        return f"{self.project.name} - {self.email}"
```

#### 5.3 Efficient Vote Counting Query

**Aggregate vote counts with Django ORM**:

```python
# plane/app/views/roadmap/public.py
from django.db.models import Count, Sum, Q

def get_roadmap_items_with_votes(workspace_slug, project_id):
    """
    Fetch roadmap items with aggregated vote counts.
    """
    from plane.db.models import Issue, RoadmapItemVote

    items = Issue.objects.filter(
        project_id=project_id,
        workspace__slug=workspace_slug,
        deleted_at__isnull=True,
        # ... other filters
    ).annotate(
        # Count total votes
        total_votes=Count("roadmap_votes", filter=Q(roadmap_votes__deleted_at__isnull=True)),

        # Count upvotes only
        upvote_count=Count(
            "roadmap_votes",
            filter=Q(roadmap_votes__vote=1, roadmap_votes__deleted_at__isnull=True)
        ),

        # Count downvotes only
        downvote_count=Count(
            "roadmap_votes",
            filter=Q(roadmap_votes__vote=-1, roadmap_votes__deleted_at__isnull=True)
        ),

        # Calculate net score (upvotes - downvotes)
        vote_score=Sum("roadmap_votes__vote", filter=Q(roadmap_votes__deleted_at__isnull=True)),
    ).select_related("state", "project").prefetch_related("labels")

    return items
```

**Raw SQL for complex queries**:

```python
from django.db import connection

def get_trending_roadmap_items(project_id, days=7):
    """
    Get roadmap items with most votes in last N days.
    Uses raw SQL for performance.
    """
    query = """
        SELECT
            i.id,
            i.name,
            i.description_stripped,
            COUNT(DISTINCT rv.id) as vote_count,
            SUM(rv.vote) as vote_score
        FROM issues i
        LEFT JOIN roadmap_item_votes rv ON rv.issue_id = i.id
            AND rv.deleted_at IS NULL
            AND rv.created_at > NOW() - INTERVAL '%s days'
        WHERE i.project_id = %s
            AND i.deleted_at IS NULL
        GROUP BY i.id, i.name, i.description_stripped
        HAVING COUNT(DISTINCT rv.id) > 0
        ORDER BY vote_score DESC, vote_count DESC
        LIMIT 10
    """

    with connection.cursor() as cursor:
        cursor.execute(query, [days, project_id])
        rows = cursor.fetchall()

        # Convert to dict
        columns = [col[0] for col in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
```

#### 5.4 Database Indexes for Performance

**Add indexes to migration**:

```python
# plane/db/migrations/0XXX_add_roadmap_indexes.py
from django.db import migrations, models

class Migration(migrations.Migration):
    operations = [
        # Index for vote counting
        migrations.AddIndex(
            model_name='roadmapitemvote',
            index=models.Index(
                fields=['issue', 'vote', 'created_at'],
                name='roadmap_vote_issue_vote_created_idx',
            ),
        ),

        # Index for session lookup
        migrations.AddIndex(
            model_name='roadmapitemvote',
            index=models.Index(
                fields=['session_id', 'issue'],
                name='roadmap_vote_session_issue_idx',
            ),
        ),

        # Index for subscription queries
        migrations.AddIndex(
            model_name='roadmapsubscription',
            index=models.Index(
                fields=['project', 'is_active', 'frequency'],
                name='roadmap_sub_project_active_freq_idx',
            ),
        ),
    ]
```

### Implementation Recommendations for Plane

1. **Reuse existing `IssueVote` model** for authenticated users
2. **Create new `RoadmapItemVote` model** for anonymous users
3. **Add `RoadmapSubscription` model** for email subscriptions
4. **Use database indexes** for efficient vote counting
5. **Implement rate limiting** using IP address + fingerprint

---

## 6. Implementation Recommendations

### 6.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (Anonymous User)                │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │ React Router v7  │  │  TanStack Query  │               │
│  │  Public Routes   │  │   + Zustand      │               │
│  │   (SSR/SSG)      │  │  (State Mgmt)    │               │
│  └────────┬─────────┘  └────────┬─────────┘               │
│           │                     │                          │
│           └─────────┬───────────┘                          │
│                     │                                      │
└─────────────────────┼──────────────────────────────────────┘
                      │
                      │ HTTPS
                      │
┌─────────────────────┼──────────────────────────────────────┐
│                     ▼                                      │
│              Django REST API                               │
│                                                            │
│  ┌──────────────────────────────────────────────────┐    │
│  │  Public Endpoints (AllowAny + Throttling)         │    │
│  │  • GET /api/public/roadmap/:projectId            │    │
│  │  • POST /api/public/roadmap/:itemId/vote         │    │
│  │  • POST /api/public/roadmap/:projectId/subscribe │    │
│  └──────────────────┬───────────────────────────────┘    │
│                     │                                      │
│                     ▼                                      │
│  ┌──────────────────────────────────────────────────┐    │
│  │  PostgreSQL Database                              │    │
│  │  • issues (roadmap items)                        │    │
│  │  • roadmap_item_votes (anonymous + auth voting)  │    │
│  │  • roadmap_subscriptions (email notifications)   │    │
│  └──────────────────────────────────────────────────┘    │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 6.2 Step-by-Step Implementation Plan

#### Phase 1: Backend API (Week 1-2)

1. **Create database models**:
   - `RoadmapItemVote` (anonymous voting)
   - `RoadmapSubscription` (email subscriptions)
   - Run migrations

2. **Create API endpoints**:
   - `PublicRoadmapViewSet` (list, retrieve, stats)
   - `RoadmapVoteView` (create/update/delete votes)
   - `RoadmapSubscriptionView` (subscribe/unsubscribe)

3. **Add permissions & throttling**:
   - `IsRoadmapPublicOrAuthenticated` permission
   - `VotingThrottle` (10/minute)
   - `AnonRateThrottle` (100/hour)

4. **Write tests**:
   - Unit tests for models
   - API tests for public endpoints
   - Test anonymous vs authenticated voting
   - Test throttling limits

#### Phase 2: Frontend Routes (Week 3)

1. **Create React Router routes**:
   - `/public/roadmap/:workspaceSlug/:projectId` (list view)
   - `/public/roadmap/:workspaceSlug/:projectId/:itemId` (detail view)

2. **Implement loaders**:
   - Server-side `loader` for SSR
   - Add meta tags for SEO
   - Handle error states (404, 403)

3. **Add public layout**:
   - Public header (no auth required)
   - Public footer
   - Different from authenticated app layout

#### Phase 3: State Management (Week 4)

1. **Create Zustand stores**:
   - `roadmapStore.ts` (votes, viewed items)
   - `roadmapUIStore.ts` (filters, sort)

2. **Implement TanStack Query hooks**:
   - `usePublicRoadmap.ts` (fetch roadmap items)
   - `useRoadmapVotes.ts` (fetch vote counts)
   - `useRoadmapVote.ts` (submit votes with optimistic updates)
   - `useRoadmapSubscription.ts` (email subscription)

3. **Add persistence**:
   - LocalStorage for anonymous votes
   - SessionStorage for temporary UI state

#### Phase 4: UI Components (Week 5-6)

1. **Build roadmap components**:
   - `RoadmapGrid` (list view with filters)
   - `RoadmapItem` (card with voting buttons)
   - `RoadmapDetail` (full item view)
   - `VoteButton` (with optimistic updates)
   - `SubscribeForm` (email subscription)

2. **Add features**:
   - Voting (upvote/downvote with visual feedback)
   - Filtering (by status, category, votes)
   - Sorting (by votes, date, trending)
   - Search (full-text search)

3. **Polish UI**:
   - Loading states
   - Error states
   - Empty states
   - Responsive design

#### Phase 5: Email Notifications (Week 7)

1. **Set up email service**:
   - Configure Django email backend
   - Create email templates
   - Test email delivery

2. **Implement notifications**:
   - Welcome email (subscription confirmation)
   - Update emails (when roadmap items change status)
   - Digest emails (weekly summary)
   - Unsubscribe flow

#### Phase 6: Testing & Optimization (Week 8)

1. **Performance testing**:
   - Load testing (1000+ concurrent users)
   - Query optimization (vote counting)
   - Caching strategy (CDN, Redis)

2. **Security testing**:
   - Rate limit testing
   - Anonymous voting abuse prevention
   - SQL injection testing
   - XSS testing

3. **Accessibility testing**:
   - Screen reader testing
   - Keyboard navigation
   - Color contrast
   - ARIA labels

### 6.3 Security Considerations

1. **Anonymous Voting Protection**:
   - Use session ID + browser fingerprint
   - Rate limiting (10 votes/minute)
   - IP-based throttling for extreme abuse
   - Detect and block bot traffic

2. **Email Subscription Protection**:
   - Email verification (send confirmation link)
   - Rate limit subscriptions (5/hour per IP)
   - Implement unsubscribe tokens
   - Prevent spam sign-ups

3. **Data Privacy**:
   - No PII collection for anonymous users
   - Clear privacy policy
   - GDPR compliance (right to deletion)
   - Log retention policy

### 6.4 Government-Specific Considerations

1. **robots.txt for public pages**:
   ```
   # Allow indexing of public roadmap
   User-agent: *
   Allow: /public/roadmap/

   # Disallow private areas
   Disallow: /app/
   Disallow: /admin/
   ```

2. **Accessibility (Section 508)**:
   - WCAG 2.1 Level AA compliance
   - Keyboard navigation
   - Screen reader support
   - High contrast mode

3. **No external dependencies**:
   - Host all assets locally
   - No third-party analytics (already done in Plane)
   - No external CDNs
   - No social media integrations

### 6.5 Monitoring & Observability

1. **Metrics to track**:
   - Total roadmap views (per day/week/month)
   - Vote counts (upvotes, downvotes)
   - Subscription signups
   - API response times
   - Error rates

2. **Alerts to configure**:
   - High error rate (>5% of requests)
   - Slow API responses (>2 seconds)
   - Vote spam detection (>100 votes/minute)
   - Email delivery failures

3. **Logging**:
   - Public API access logs
   - Vote creation/deletion events
   - Subscription events
   - Error logs with stack traces

---

## 7. Code Examples from Plane Codebase

### 7.1 Existing Patterns to Follow

**Current Space App Route** (`/Users/corcoss/code/plane/apps/space/app/[workspaceSlug]/[projectId]/page.tsx`):
```typescript
export const clientLoader = async ({ params, request }: Route.ClientLoaderArgs) => {
  const { workspaceSlug, projectId } = params;

  if (!workspaceSlug || !projectId) {
    throw redirect("/404");
  }

  let response = await publishService.retrieveSettingsByProjectId(workspaceSlug, projectId);

  if (response?.entity_name === "project") {
    throw redirect(`/issues/${response?.anchor}`);
  } else {
    throw redirect("/404");
  }
};
```

**Adapt for public roadmap**:
```typescript
export const loader = async ({ params }: Route.LoaderArgs) => {
  const { workspaceSlug, projectId } = params;

  // Check if roadmap is public
  const settings = await publishService.retrieveRoadmapSettings(workspaceSlug, projectId);
  if (!settings.isRoadmapPublic) {
    throw new Response("Not Found", { status: 404 });
  }

  // Fetch roadmap items
  const items = await roadmapService.getPublicRoadmap(workspaceSlug, projectId);
  return { items, settings };
};
```

### 7.2 Existing Models to Reference

**IssueVote model** (`/Users/corcoss/code/plane/apps/api/plane/db/models/issue.py:678-699`):
```python
class IssueVote(ProjectBaseModel):
    issue = models.ForeignKey(Issue, on_delete=models.CASCADE, related_name="votes")
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="votes")
    vote = models.IntegerField(choices=((-1, "DOWNVOTE"), (1, "UPVOTE")), default=1)

    class Meta:
        unique_together = ["issue", "actor", "deleted_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["issue", "actor"],
                condition=models.Q(deleted_at__isnull=True),
                name="issue_vote_unique_issue_actor_when_deleted_at_null",
            )
        ]
        db_table = "issue_votes"
        ordering = ("-created_at",)
```

**Adapt for anonymous voting**: See Section 5.1 above.

### 7.3 Existing Permission Patterns

**Public timezone endpoint** (`/Users/corcoss/code/plane/apps/api/plane/app/views/timezone/base.py`):
```python
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

class TimezoneEndpoint(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthenticationThrottle]

    @method_decorator(cache_page(60 * 60 * 2))
    def get(self, request):
        # ... public endpoint logic
        return Response({"timezones": timezone_list})
```

**Adapt for public roadmap**: See Section 2.2 above.

---

## 8. References & Documentation Links

### Official Documentation

1. **React Router v7**:
   - [Routing Guide](https://raw.githubusercontent.com/remix-run/react-router/main/docs/start/framework/routing.md)
   - [Data Loading Guide](https://raw.githubusercontent.com/remix-run/react-router/main/docs/start/framework/data-loading.md)
   - [API Reference](https://api.reactrouter.com/v7/)

2. **Django REST Framework**:
   - [Permissions Guide](https://www.django-rest-framework.org/api-guide/permissions/)
   - [Throttling Guide](https://www.django-rest-framework.org/api-guide/throttling/)
   - [ViewSets Guide](https://www.django-rest-framework.org/api-guide/viewsets/)

3. **TanStack Query**:
   - [Caching Guide](https://raw.githubusercontent.com/TanStack/query/main/docs/framework/react/guides/caching.md)
   - [Mutations Guide](https://tanstack.com/query/latest/docs/framework/react/guides/mutations)
   - [Overview](https://tanstack.com/query/latest/docs/framework/react/overview)

4. **Zustand**:
   - [README](https://github.com/pmndrs/zustand)
   - [TypeScript Guide](https://github.com/pmndrs/zustand/blob/main/docs/guides/beginner-typescript.md)
   - [Persist Middleware](https://github.com/pmndrs/zustand/blob/main/docs/integrations/persisting-store-data.md)

5. **PostgreSQL**:
   - [Django ORM Aggregation](https://docs.djangoproject.com/en/4.2/topics/db/aggregation/)
   - [Django Indexes](https://docs.djangoproject.com/en/4.2/ref/models/indexes/)
   - [Unique Constraints](https://docs.djangoproject.com/en/4.2/ref/models/constraints/)

### Plane Codebase References

1. **Route Configuration**: `/Users/corcoss/code/plane/apps/space/app/routes.ts`
2. **Client Loader Example**: `/Users/corcoss/code/plane/apps/space/app/[workspaceSlug]/[projectId]/page.tsx`
3. **Root Layout**: `/Users/corcoss/code/plane/apps/space/app/root.tsx`
4. **Public API Example**: `/Users/corcoss/code/plane/apps/api/plane/app/views/timezone/base.py`
5. **Issue Models**: `/Users/corcoss/code/plane/apps/api/plane/db/models/issue.py`
6. **Permission Classes**: `/Users/corcoss/code/plane/apps/api/plane/app/permissions/`

---

## Summary

This research provides a comprehensive guide for implementing a public roadmap feature in Plane using:

1. **React Router v7** for SSR/SSG public routes with SEO optimization
2. **Django REST Framework** for public API endpoints with throttling and permission control
3. **TanStack Query** for efficient caching, polling, and optimistic updates
4. **Zustand** for anonymous user state management with localStorage persistence
5. **PostgreSQL** models adapted from Plane's existing voting system

All patterns are based on Plane's current architecture and follow government security requirements (no external dependencies, Section 508 compliance, FISMA-ready).

**Key Takeaways**:
- Reuse Plane's existing `IssueVote` model for authenticated users
- Add new `RoadmapItemVote` model for anonymous voting
- Use React Router `loader` (not `clientLoader`) for SEO
- Implement optimistic updates with TanStack Query
- Store anonymous votes in Zustand + localStorage
- Apply strict rate limiting and throttling for public endpoints

**Next Steps**:
1. Review with team
2. Prioritize features (MVP: view + vote, Phase 2: email subscriptions)
3. Create GitHub issues for each phase
4. Start with backend API (Phase 1)
