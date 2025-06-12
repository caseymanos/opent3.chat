'use client'

import { useState } from 'react'
import MessageList from '@/components/MessageList'
import type { Database } from '@/lib/supabase'

type DBMessage = Database['public']['Tables']['messages']['Row']

export default function TestMarkdown() {
  const testMessages: DBMessage[] = [
    {
      id: '1',
      conversation_id: 'test',
      parent_id: null,
      role: 'user',
      content: { text: 'Show me a JavaScript function that calculates fibonacci numbers' },
      created_at: new Date().toISOString(),
      model_metadata: null,
      attachments: null,
      branch_index: 0
    },
    {
      id: '2',
      conversation_id: 'test',
      parent_id: '1',
      role: 'assistant',
      content: { 
        text: `Here's a JavaScript function to calculate Fibonacci numbers:

\`\`\`javascript
function fibonacci(n) {
  if (n <= 1) return n;
  
  let prev = 0;
  let current = 1;
  
  for (let i = 2; i <= n; i++) {
    let temp = current;
    current = prev + current;
    prev = temp;
  }
  
  return current;
}

// Example usage
console.log(fibonacci(10)); // 55
console.log(fibonacci(20)); // 6765
\`\`\`

This is an **iterative** approach with O(n) time complexity. For large numbers, you might also consider:

1. **Recursive approach** (less efficient):
\`\`\`javascript
function fibRecursive(n) {
  if (n <= 1) return n;
  return fibRecursive(n - 1) + fibRecursive(n - 2);
}
\`\`\`

2. **Memoized version** for better performance:
\`\`\`javascript
const fibMemo = (() => {
  const cache = {};
  return function fib(n) {
    if (n in cache) return cache[n];
    if (n <= 1) return n;
    cache[n] = fib(n - 1) + fib(n - 2);
    return cache[n];
  };
})();
\`\`\`

### Time Complexities:
- Iterative: O(n)
- Recursive: O(2^n)
- Memoized: O(n)`
      },
      created_at: new Date().toISOString(),
      model_metadata: { model: 'gpt-4' },
      attachments: null,
      branch_index: 0
    },
    {
      id: '3',
      conversation_id: 'test',
      parent_id: '2',
      role: 'user',
      content: { text: 'Can you show me a Python version with type hints?' },
      created_at: new Date().toISOString(),
      model_metadata: null,
      attachments: null,
      branch_index: 0
    },
    {
      id: '4',
      conversation_id: 'test',
      parent_id: '3',
      role: 'assistant',
      content: { 
        text: `Sure! Here's a Python implementation with type hints:

\`\`\`python
from typing import Dict, Callable

def fibonacci_iterative(n: int) -> int:
    """Calculate nth Fibonacci number iteratively."""
    if n <= 1:
        return n
    
    prev: int = 0
    current: int = 1
    
    for _ in range(2, n + 1):
        prev, current = current, prev + current
    
    return current


def fibonacci_recursive(n: int) -> int:
    """Calculate nth Fibonacci number recursively."""
    if n <= 1:
        return n
    return fibonacci_recursive(n - 1) + fibonacci_recursive(n - 2)


def fibonacci_memoized() -> Callable[[int], int]:
    """Create a memoized Fibonacci function."""
    cache: Dict[int, int] = {}
    
    def fib(n: int) -> int:
        if n in cache:
            return cache[n]
        if n <= 1:
            return n
        cache[n] = fib(n - 1) + fib(n - 2)
        return cache[n]
    
    return fib


# Example usage
if __name__ == "__main__":
    # Test all implementations
    n = 10
    
    print(f"Fibonacci({n}) using iterative: {fibonacci_iterative(n)}")
    print(f"Fibonacci({n}) using recursive: {fibonacci_recursive(n)}")
    
    fib_memo = fibonacci_memoized()
    print(f"Fibonacci({n}) using memoized: {fib_memo(n)}")
    
    # Performance comparison for larger numbers
    import time
    
    n = 30
    
    start = time.time()
    result_iter = fibonacci_iterative(n)
    time_iter = time.time() - start
    
    start = time.time()
    result_memo = fib_memo(n)
    time_memo = time.time() - start
    
    print(f"\\nFor n={n}:")
    print(f"Iterative: {result_iter} (Time: {time_iter:.6f}s)")
    print(f"Memoized: {result_memo} (Time: {time_memo:.6f}s)")
\`\`\`

### Additional Features:

You can also use Python's built-in \`@lru_cache\` decorator for automatic memoization:

\`\`\`python
from functools import lru_cache

@lru_cache(maxsize=None)
def fibonacci_cached(n: int) -> int:
    """Fibonacci with automatic memoization."""
    if n <= 1:
        return n
    return fibonacci_cached(n - 1) + fibonacci_cached(n - 2)
\`\`\`

This approach is clean and efficient!`
      },
      created_at: new Date().toISOString(),
      model_metadata: { model: 'claude-3-sonnet' },
      attachments: null,
      branch_index: 0
    }
  ]

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-semibold">Markdown & Code Highlighting Test</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Testing syntax highlighting and copy buttons</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        <MessageList messages={testMessages} />
      </div>
    </div>
  )
}