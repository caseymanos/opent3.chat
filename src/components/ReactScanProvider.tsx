'use client';

import { useEffect } from 'react';

export default function ReactScanProvider() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      import('react-scan').then(({ scan }) => {
        scan({
          enabled: true,
          log: false, // Set to true to see console logs
          onRender: (fiber: any, renders: any[]) => {
            // Check if any render took more than 16ms
            const slowRender = renders.find((r: any) => r.time > 16);
            if (slowRender) {
              console.warn(`Slow render detected: ${fiber.type?.name || 'Unknown'} took ${slowRender.time}ms`);
            }
          }
        });
      });
    }
  }, []);

  return null;
}