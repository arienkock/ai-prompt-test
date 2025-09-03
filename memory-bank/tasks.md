This is a TODO list  tasks for this project:

  - [ ] Signing in with the - wrong email & passwords redirects you back to the login page. This is bad UX.
  - [ ] Playwright happy-path e2e test.
  - [X] Use cases should indicate whether they are public or private (requiring authentication) and this should determine whether the authentication middleware is added or not.
  - [ ] Split the Dto.ts file. Each DTO should be in its own file.
  - [X] Integration test security API
  - [ ] Clean up debug logging
  - [ ] Accessibility checks
  - [ ] Tracing
  - [ ] Style guide checks
  - [ ] Stability patterns
  - [ ] Dangerous SQL
  - [ ] Secrets in code check
  - [ ] Input sanitization
  - [ ] Circuit breaker failing web requests fast while serving static/in-memory error page
  - [ ] new arch rule: use case validates entity, not repo.
  - [ ] user RETURNING in create queries
  - [ ] server generated IDs shouldbe an option
  - [ ] new arch rule: use NOW() db time for timestamps