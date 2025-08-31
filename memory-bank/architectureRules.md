# Architecture Rules
Follow all instructions in this document! During task planning you MUST read these rules. After implementation you MUST read the rules again to see if you missed anything.

If you are missing information needed to satisfy a rule: ASK THE USER!

If rules in this document seem to contradict or conflict: ASK THE USER!

## Domain Layer
### Responsibilities

- Entities and their fields
  - Entity constraints (examples: type, length, format, uniqueness)
- Logic functions
  - Authorization checks (can User X edit Entity Y)
  - Entity Validation (field constraints and relationships)
  - Entity manipulation
  - Entity relationship management
  - Entity consistency checks
- Repository INTERFACES
  - Implementation of data access (database code) is NOT part of the domain model.
- Use case objects
  - With a single public method to be called by controllers, server routes, CLI etc.
- Context object
  - A standard data type to hold information about the current request. The same for all use cases.

### Rules
- Entities are persistent domain types, and therefore MUST have a single identity field, or composite key.
- Entities MUST HAVE a corresponding repository interface with methods for CRUD operations.
- All entity fields MUST have constraints.
- Entity fields that reference other entities by ID, direct object references, or collections, MUST also define relational constraints which are checked by the entity validation function.
- Entity validation functions MUST check all field constraints and return validation results of all fields. This should be implemented as a structured object listing all violations.
- Text (string) fields MUST have a maximum length constraint
- Repository methods that return a list of entities MUST use  pagination.
- Unbounded / unlimited results sets are an ERROR!
- Different repository methods should be used for fetching varying entity graphs. If a use case needs entity relationships to be included, then define a repository method that fetches them at the same time.
- All query objects MUST use the same pagination parameter data structure.
- Use case objects have a single primary method.
- Use case objects MUST all throw the same Unauthenticated error if they expect a user, but none was provided.
- A use case main method MUST take a command or query object as its second argument.
- A use case main MUST receive a context object as its first argument.
- Use case objects MUST call:
  - command / query validation functions
  - entity validation functions
  - use case authorization checks.
- Command & Query validation functions MUST be stateless and MUST NOT require repository usage.
- Command & Query containing pagination data MUST have the page size validated (sanity check) against a globally configured maximum (e.g. 500).
- Use case objects MUST use repository interfaces to access entities.
- Use case objects MAY call other use case objects in order to re-use logic when possible.
- All use case responses MUST use the same pagination metadata data structure.
- Use case objects that load a list of entities MUST use repositories to limit results to what the user is allowed to see.
- Re-use the READ use cases as much as possible. Example: for loading different entity graphs, pass the relationships to include as a property in the query object.
- Use cases for reading data take a query object.
- There MUST exist a transaction helper higher order function that MUST be used to invoke a use case within a transaction. This rule is the responsibility of the calling code (e.g. Web Controller).
- Calling a use case outside of a transaction callback IS AN ERROR. Since the first (top level) use case MUST be called within a transaction, any other use cases in the call tree are implicitly part of the same transaction.
- Command and query objects MUST NOT use / reference entity types. Instead they MUST use DTO types that have a subset of the fields of the entities. Reason: protect internal entity fields from being overridden.
- Mapping logic between DTO and entity types may reside in helper functions near (in the same file as, or even private methods) the use cases, unless the mapping logic is re-usable (e.g. pagination parameters and pagination response metadata). In the latter case the mapping code MUST not be duplicated.
- Mapping DTOs to entities MUST copy fields by explicitly by name. Using object spread or other dynamic property copying is STRICTLY FORBIDDEN. Reason: accepting user-provided undeclared properties at runtime is a security risk.
- If you know that a field is read-only, it should be returned by the use case but never accepted in the DTO.
- If you are unsure if a field needs to be part of DTO or not: ASK THE USER!
- A weak entity cannot exist on its own. Weak entities MUST have at least one non-nullable relationship. (Example: a profile MUST belong to a user)
- The domain layer MUST NOT reference the Data Access layer directly via imports or code dependencies. It may only access it via interfaces (dependency inversion).
- Entities MUST NOT call or reference use case objects.
- Context objects MUST be passed to use case objects.
- Context objects MUST contain the identity of the user requesting the object.
- All preventable domain errors MUST be distinguishable as being: invalid input (will be mapped to 400 status code), authorization and authentication errors (will be mapped to 403 status code), anything else (mapped to 500 status code).
- Code (functions, types, etc.) shared across entities and use cases MUST NOT reference entity and use case types. It MUST be generic and agnostic of the domain model. Example: `validationUtils imports User` ❌ NOT ALLOWED. But `User imports validationUtils` ✅ GOOD.

### Implementation Advice & Examples
- Define a standard return type:

  ```ts
  type ValidationResult = { valid: boolean; errors: ValidationError[] };
  class ValidationError { field: string; message: string; }
  ```

  Entities always return a `ValidationResult`. Use cases decide whether to throw or return errors.
- Define an abstract Entity class:

  ```ts
  abstract class Entity { id: string; }
  class ValueObject {} // never persisted
  ```

  Only `Entity` subclasses are candidates for persistence. Value objects are not.
- Example relational validation:

  ```ts
  class Profile extends Entity {
    userId: string;
    validate(): ValidationResult {
      if (!this.userId) return { valid: false, errors: [{ field: "userId", message: "Required" }] };
      return { valid: true, errors: [] };
    }
  }
  ```
- Define one pagination DTO:

  ```ts
  type PaginationParams = { page: number; pageSize: number };
  type PaginationMeta = { total: number; page: number; pageSize: number };
  ```

- Repositories expose flexible read with `includeRelations: string[]` param.

  ```ts
  interface UserRepository {
    findById(id: string, opts?: { includeRelations?: ("profile" | "posts")[] }): Promise<User>;
  }
  ```

- Standardize the use case structure:

  ```ts
  interface UseCase<CQ, R> {
    execute(ctx: Context, commandOrQuery: CQ): Promise<R>;
  }
  ```
- Standardize DTO and entity mappers:

  ```ts
  interface Mapper<D, E> { toEntity(dto: D): E; toDTO(entity: E): D; }
  ```
- Example context type:

  ```ts
  interface Context { userId?: string; requestId: string; }
  ```

-

## Data Access Layer

### Responsibilities

Data access is a layer of the architecture consisting of:

- Implementations of repositories
- Database access and connection management
- Implementation of the transaction function
- Configuration of the database client
- Configuration of the database schema
- Database migrations

### Rules

- All (non function) entity fields of a persisted entity MUST exist in the database schema. Calculated fields should be implemented as methods/function.
- The names of entity fields and database columns MUST be identical and in camelCase (despite this going against most RDBMS conventions!). If they don’t: it’s an ERROR!
- All column names and aliases in SQL queries and migrations MUST be quoted so they match the code.
- If a persisted entity has a real field (not a calculated property) that is not part of the database schema: this is an ERROR!
- Database tables MUST have timestamp columns for creation (createdAt) and update times (updatedAt) that are set BY THE DATABASE.
- The updatedAt and createdAt columns reside in the tables, and are only included on the entity objects if the entity type defines fields of the same name.
- Entity field constraints (examples: type, length, nullability, format etc.), including relationship fields, MUST match the database schema and constraints as close as possible.
  - It is possible that an entity constraint implemented in code cannot be implemented as database constraint. This is acceptable.
  - The database constraints MUST NOT be more strict than the entity validations. Otherwise a preventable error will be shown to the user as a server-side error.
- If you are unsure if a column should map to or from an entity field: ASK THE USER!
- If a repository method should return an entity including some relationships, then try to fetch all rows at once (using joins).
- Create indices for common access patterns if the where clause is fixed or predictable.
- Only apply UNIQUE constraints to columns if you are SURE they are globally unique (e.g. across all users)

## UI Layer

### Responsibilities

- Access the Web Controller (server-side) via an API Client
- Implement UI components to display and enable editing of domain data

### Rules

- Client-side validation MUST match server-side validation in logic. Changes to server side validation MUST also be applied to frontend validation.
- Command and Query objects sent to the API MUST match the server side type definitions.
- UI components MUST NOT perform client-side sorting and pagination of domain data loaded via the API. Since there is a rule to enforce server side pagination, this option should always be available.

### Implementation Guidance & Examples

- Generate client validators from shared schema definitions (e.g., Zod, JSON schema) to simplify matching server-side validation.
- Q: Can client-side filtering (like search in dropdowns) be allowed?
  
  A: Yes, but only after server-paginated data is loaded. Filtering cannot bypass pagination.

## Web Controller Layer

### Responsibilities

- Constructs context and command or query object from an HTTP Request or WebSocket message.
- Instantiates use case objects and provides them with their dependencies.
- Distinguish errors thrown by the use cases to the correct HTTP status codes.

### Rules

- MUST use the transaction helper function to call a use-case within a transaction.
- MUST NOT use any type reflection on errors to determine any error handling logic. If error handling logic needs to be conditional, that condition needs to be exposed by the domain layer.

### Implementation Guidance & Examples

- Domain errors expose a `code` property.

  ```ts
  if (err instanceof DomainError) {
    if (err.code === "VALIDATION") return res.status(400).json(err);
    if (err.code === "AUTH") return res.status(403).json(err);
  }
  return res.status(500).json({ message: "Server error" });
  ```