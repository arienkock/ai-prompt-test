# Project Architecture

This project follows a strict layered architecture as defined in the custom instructions. The structure enforces separation of concerns and dependency inversion principles.

## Tech Stack
- **Frontend**: VueJS with TypeScript
- **Backend**: Express JS with TypeScript  
- **Database**: PostgreSQL with Prisma ORM

## Directory Structure

### Backend Layers

#### `/src/domain/` - Domain Layer
- **entities/**: Domain entities with identity fields and validation logic
- **use-cases/**: Use case objects with single public methods  
- **repositories/**: Repository interfaces (implementations in data-access layer)
- **types/**: Domain-specific types and DTOs

**Key Rules:**
- Entities must have identity fields and validation methods
- Use cases take context as first argument, command/query as second
- Repository interfaces define CRUD operations with pagination
- No direct dependencies on data-access or web-controller layers

#### `/src/data-access/` - Data Access Layer
- **repositories/**: Repository interface implementations
- **migrations/**: Database migration files
- **config/**: Database configuration and connection setup

**Key Rules:**
- Entity fields must match database columns exactly (camelCase)
- All tables have createdAt/updatedAt timestamps
- Repository methods use pagination for lists
- Implements transaction helper function

#### `/src/web-controller/` - Web Controller Layer
- **routes/**: Express route definitions
- **middleware/**: Authentication, validation middleware
- **types/**: HTTP request/response types

**Key Rules:**
- Constructs context and command/query objects from HTTP requests
- Uses transaction helper to call use cases
- Maps domain errors to proper HTTP status codes

#### `/src/shared/` - Shared Utilities
- **types/**: Common types used across layers
- **utils/**: Generic utility functions
- **validation/**: Reusable validation logic

### Frontend Structure

#### `/frontend/` - VueJS Application
- **src/components/**: Vue components
- **src/views/**: Page-level Vue components
- **src/composables/**: Vue composition functions
- **src/types/**: Frontend TypeScript types
- **src/api/**: API client for backend communication
- **public/**: Static assets

**Key Rules:**
- Client-side validation must match server-side validation
- Use server-side pagination, no client-side pagination
- Commands/queries must match backend type definitions

### Testing Structure

#### `/tests/`
- **unit/**: Unit tests for individual components/functions
- **integration/**: Integration tests for layer interactions
- **e2e/**: End-to-end tests for complete user workflows

**Key Rules:**
- Mock repositories but use real domain logic
- Test web controller without spinning up real server
- Maintain small set of reusable test fixtures

## Architecture Compliance

This structure enforces:
- ✅ Dependency inversion (domain doesn't depend on data-access)
- ✅ Single responsibility per layer
- ✅ Proper separation of concerns
- ✅ Transaction boundary management
- ✅ Consistent error handling across layers
- ✅ Server-side pagination enforcement
- ✅ Validation consistency between frontend/backend
