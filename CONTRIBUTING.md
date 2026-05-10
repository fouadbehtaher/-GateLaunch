# Contributing to GateLaunch

Thank you for your interest in contributing to GateLaunch! 🎉

## Code of Conduct

This project adheres to a Code of Conduct. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples**
- **Describe the behavior you observed and what you expected**
- **Include screenshots if possible**
- **Include your environment details** (OS, Node.js version, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description of the suggested enhancement**
- **Explain why this enhancement would be useful**
- **List some examples of how it would be used**

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Follow the coding style** used throughout the project
3. **Write clear commit messages**
4. **Include tests** for new features
5. **Update documentation** as needed
6. **Ensure all tests pass** before submitting

## Development Setup

1. Clone your fork:
```bash
git clone https://github.com/your-username/gatelaunch.git
cd gatelaunch
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Run the development server:
```bash
npm run dev
```

5. Run tests:
```bash
npm test
```

## Coding Style

- Follow the ESLint configuration
- Use Prettier for code formatting
- Write meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused

### JavaScript Style Guide

```javascript
// Good
const getUserById = async (id) => {
  try {
    const user = await database.findUser(id);
    return { success: true, data: user };
  } catch (error) {
    logger.error('Failed to get user', { error, id });
    return { success: false, error: error.message };
  }
};

// Bad
const getUser = (id) => {
  let user = database.findUser(id);
  return user;
};
```

## Commit Messages

Use clear and meaningful commit messages:

- `feat: add WebSocket support for real-time notifications`
- `fix: resolve memory leak in cache service`
- `docs: update API documentation`
- `test: add tests for auth service`
- `refactor: improve error handling`
- `chore: update dependencies`

## Testing

- Write unit tests for new features
- Ensure all tests pass before submitting PR
- Aim for high code coverage (70%+)

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- auth.test.js
```

## Documentation

- Update README.md if needed
- Add JSDoc comments to functions
- Update API documentation for endpoint changes
- Include usage examples

## Review Process

1. Maintainers will review your PR
2. Address any requested changes
3. Once approved, your PR will be merged

## Questions?

Feel free to open an issue for any questions or concerns.

Thank you for contributing! 🚀
