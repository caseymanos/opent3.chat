# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

**Project Type:** Next.js Application
**Branch:** speech
**Focus Area:** Development work on speech

## Project Overview

This is a Next.js React application with server-side rendering capabilities.

## Branch Purpose

This branch (speech) is focused on: Development work on speech

## Development Guidelines

### Getting Started
1. Check package.json for available scripts and dependencies
2. Look for README.md for project-specific documentation
3. Review any testing setup and linting configuration

### Common Commands
```bash
npm run dev, npm run build, npm run start
```

### Code Standards
- Follow existing code style and patterns
- Write tests for new functionality when feasible
- Ensure all linting and type checking passes before committing
- Keep commits focused and descriptive

## Architecture Notes

### Key Directories
- `/src` - Main source code
- `/components` - Reusable UI components (if applicable)
- `/pages` or `/app` - Application pages/routes (if applicable)
- `/lib` or `/utils` - Utility functions and shared logic
- `/types` - TypeScript type definitions (if applicable)

### Important Files
- Check for configuration files like `next.config.js`, `vite.config.js`, etc.
- Look for environment files (`.env.local`, `.env.example`)
- Review package.json for project scripts and dependencies

## Testing Strategy

- Always run existing tests before making changes
- Add tests for new features and bug fixes
- Ensure all tests pass before committing
- Look for test files in `__tests__`, `test/`, or alongside source files

## Deployment Notes

- Follow the existing build and deployment process
- Check for CI/CD configuration in `.github/workflows/` or similar
- Ensure environment variables are properly configured

## Memories

- Always verify functionality in the development environment
- Run linting and type checking before committing
- Create meaningful commit messages that describe the changes
- Focus on the specific goals of this branch: Development work on speech
