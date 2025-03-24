# CLAUDE.md - AI Assistant Guidelines

## Development Commands

```bash
# Run the application
deno task deepre                # Run the app with all permissions
deno task install               # Install globally as 'deepre' CLI tool

# Development & Testing
deno task lint                  # Check code for linting issues
deno task check                 # Type check TypeScript code
deno task fmt                   # Format code to Deno standards
deno task test                  # Run all tests with all permissions
deno task test src/grounding_test.ts # Run specific test file
deno task check-all             # Run lint, check, fmt, and test
```

## Code Style Guidelines

- Use TypeScript interfaces for type definitions (see `types.ts`)
- Follow JSDoc comments for functions and interfaces
- Use async/await for asynchronous code
- Handle errors with try/catch blocks and provide meaningful error messages
- Manage API keys via environment variables (GOOGLE_API_KEY, GEMINI_API_KEY)
- Import from JSR/NPM using path aliases (@cliffy/command, @std/*)
- Use camelCase for variables and functions, PascalCase for interfaces/classes
- Use BDD style for tests (describe/it) with clear test descriptions
- Maintain proper error handling with specific error types
- Implement proper input validation for CLI commands
- Organize related functionality into separate modules
- Follow Deno formatting standards
