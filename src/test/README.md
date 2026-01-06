# Test Suite Documentation

## Overview

This test suite covers the Google Maps Places API integration and LLM categorization system for the atCollege webapp.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run tests:**
   ```bash
   npm test              # Watch mode
   npm run test:run      # Run once
   npm run test:ui       # Interactive UI
   npm run test:coverage # With coverage report
   ```

## Test Structure

```
src/
├── api/
│   └── __tests__/
│       ├── googlePlaces.test.js       # Google Places API tests
│       ├── llmCategorization.test.js   # LLM categorization tests
│       └── entities.test.js           # Database entity tests
├── utils/
│   └── __tests__/
│       └── categorizationQueue.test.js # Queue management tests
└── test/
    ├── setup.js                        # Test configuration
    └── README.md                       # This file
```

## Test Files

### 1. Google Places API Tests
Tests for the Google Places API wrapper service:
- Text search functionality
- Nearby search by category
- Place details fetching
- Category mapping
- Distance conversion
- Error handling
- Caching

### 2. LLM Categorization Tests
Tests for the Anthropic Claude integration:
- Place categorization via Edge Function
- Error handling
- Confidence score processing
- Batch processing
- Uncategorized places fetching

### 3. Entity Tests
Tests for database operations:
- Finding places by Google Place ID
- Creating places from Google data
- Updating categorization status

### 4. Queue Tests
Tests for background processing:
- Queue management
- Batch processing
- Error handling
- Event subscription

## Mocking

All external dependencies are mocked:
- **Google Places API**: Mocked `fetch` calls
- **Supabase**: Mocked client methods
- **Edge Functions**: Mocked `supabase.functions.invoke`
- **Environment Variables**: Stubbed in setup

## Writing New Tests

1. Create test file in appropriate `__tests__` directory
2. Import testing utilities from `vitest`
3. Mock external dependencies
4. Write descriptive test cases
5. Run tests to verify

Example:
```javascript
import { describe, it, expect, vi } from 'vitest'

describe('MyFeature', () => {
  it('should do something', () => {
    expect(true).toBe(true)
  })
})
```

## Coverage Goals

- **Unit Tests**: 80%+ coverage
- **Critical Paths**: 100% coverage
- **Error Handling**: All error cases tested

## Continuous Integration

Tests should run automatically on:
- Pull requests
- Before merging to main
- On deployment

## Troubleshooting

**Tests failing?**
- Check that all dependencies are installed
- Verify mocks are set up correctly
- Check test environment variables

**Slow tests?**
- Reduce timeout values if appropriate
- Check for unnecessary async operations
- Verify mocks are not making real API calls

