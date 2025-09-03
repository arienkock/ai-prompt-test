This is a TODO list  tasks for this project:

  - [ ] Signing in with the - wrong email & passwords redirects you back to the login page. This is bad UX.
  - [ ] Playwright happy-path e2e test.
  - [X] Use cases should indicate whether they are public or private (requiring authentication) and this should determine whether the authentication middleware is added or not.
  - [ ] Split the Dto.ts file. Each DTO should be in its own file.
  - [X] Integration test security API
  - [ ] multi-tenancy support, org table, many2many org link with users, built-into repository method signatures
  - [ ] translations
  - [ ] CMS
  - [ ] Clean up debug logging
  - [ ] Accessibility checks
  - [ ] Tracing
  - [ ] Style guide checks
  - [ ] Stability patterns
  - [ ] Dangerous or backwards-incompatible SQL check
  - [ ] Secrets in code check
  - [ ] Input sanitization
  - [ ] Circuit breaker failing web requests fast while serving static/in-memory error page
  - [ ] user RETURNING in create queries
  - [ ] server generated IDs shouldbe an option
  - [ ] Clean up README
  - new arch rules: 
    - [X] Always use NOW() db time for timestamps (not new Date() in the code)
    - [ ] use case validates entity, not repo.
    - [ ] repository method names should always start with `find`, `update`, `create`, `delete`.
    - [X] repository methods should return either an entity or a paginated list.
    - [X] always use the routeToUseCase helper for use cases that need to access the database

