import { describe, it, expect } from 'vitest';
import { publicJourneyImage } from './journey-preview';

describe('public journey cover URLs', () => {
  it('accepts the public HTTPS cover', () => expect(publicJourneyImage('https://taskmates.app/covers/capy.jpg')).toBe('https://taskmates.app/covers/capy.jpg'));
  it('rejects relative and non-HTTPS covers', () => {
    expect(publicJourneyImage('/covers/capy.jpg')).toBeNull();
    expect(publicJourneyImage('http://localhost/capy.jpg')).toBeNull();
    expect(publicJourneyImage('javascript:alert(1)')).toBeNull();
  });
  it('omits a missing cover', () => expect(publicJourneyImage(null)).toBeNull());
});