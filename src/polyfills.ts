import { Buffer } from 'buffer';

// Ensure Buffer exists in the browser for libs like gray-matter
if (typeof (globalThis as any).Buffer === 'undefined') {
  (globalThis as any).Buffer = Buffer;
}
