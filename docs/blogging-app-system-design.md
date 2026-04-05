# Blogging App System Design

## Goal

Design a production-ready blogging platform where users can:

- browse published posts
- search posts by keyword, tag, or author
- authenticate and manage profiles
- create, edit, draft, publish, and delete posts
- upload cover images
- comment on posts
- view analytics on reads and engagement

## Functional Requirements

- Public readers can view published posts
- Authenticated authors can manage their own drafts and posts
- Admins can moderate posts and comments
- Search should return posts quickly
- Images should be stored separately from the app server

## Non-Functional Requirements

- Low-latency reads for published content
- Safe draft and publish workflow
- Horizontal scalability for API layer
- Basic observability and background processing

## Core Components

- `Web App`: React or Next.js frontend for readers, authors, and admins
- `API Gateway / Backend`: REST or GraphQL service handling auth, posts, comments, search, and analytics APIs
- `Auth Service`: session or token management
- `Post Service`: draft/publish lifecycle and content management
- `Comment Service`: create/list/moderate comments
- `Search Service`: indexing and querying posts
- `Cache`: Redis for hot post pages and session/cache data
- `Primary DB`: Postgres for users, posts, comments, tags, and permissions
- `Object Storage`: S3-compatible storage for cover images and media
- `CDN`: serves images and cached public content
- `Queue + Workers`: asynchronous indexing, notifications, and analytics aggregation
- `Analytics Store`: warehouse or event store for traffic and engagement events
- `Monitoring`: logs, metrics, traces, and alerts

## High-Level Request Flow

### Read path

1. Reader opens the web app
2. Web app calls backend for published posts
3. Backend checks Redis for hot content
4. On cache miss, backend reads Postgres
5. Media is served from object storage through CDN

### Write path

1. Author logs in and creates or edits a draft
2. Backend validates permissions and saves draft in Postgres
3. On publish, backend enqueues search indexing and notification jobs
4. Worker updates search index and downstream analytics/reporting systems

## Data Model

### `users`

- `id`
- `name`
- `email`
- `role`
- `created_at`

### `posts`

- `id`
- `author_id`
- `title`
- `slug`
- `content`
- `excerpt`
- `cover_image_url`
- `status` (`draft`, `published`, `archived`)
- `published_at`
- `updated_at`

### `comments`

- `id`
- `post_id`
- `user_id`
- `body`
- `status`
- `created_at`

### `tags`

- `id`
- `name`

### `post_tags`

- `post_id`
- `tag_id`

## Scaling Notes

- Cache published post pages and homepage feeds
- Add read replicas for heavy read traffic
- Move full-text and tag search to OpenSearch or Meilisearch as traffic grows
- Use workers for image processing, indexing, and email notifications
- Partition analytics separately from OLTP data

## Security

- RBAC for reader, author, and admin actions
- Sanitized rich text rendering
- Rate limiting for comments and login endpoints
- Signed upload URLs for media

## Suggested Tech Stack

- Frontend: Next.js
- API: Node.js or Go
- Database: Postgres
- Cache: Redis
- Search: Meilisearch or OpenSearch
- Storage: S3
- Queue: SQS or Redis-backed queue
- Monitoring: OpenTelemetry + Grafana or Datadog
