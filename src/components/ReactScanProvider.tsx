'use client';

import { useEffect } from 'react';

export default function ReactScanProvider() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      import('react-scan').then(({ scan }) => {
        scan({
          enabled: true,
          log: false, // Set to true to see console logs
          includeChildren: true,
          renderCountThreshold: 1,
          // Performance options
          report: true,
          // Show component names
          showComponentName: true,
          // Highlight renders
          onRender: (fiber: any, phase: string, actualDuration: number) => {
            if (actualDuration > 16) { // Log slow renders (> 16ms for 60fps)
              console.warn(`Slow render detected: ${fiber.type?.name || 'Unknown'} took ${actualDuration}ms`);
            }
          }
        });
      });
    }
  }, []);

  return null;
}