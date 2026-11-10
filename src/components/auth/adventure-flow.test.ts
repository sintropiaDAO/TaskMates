import { describe, expect, it } from 'vitest';
import { canCreateAdventurer, nextAccessStep, previousAccessStep } from './adventure-flow';

describe('adventurer access flow', () => {
  it('keeps name, email, password and agreement in separate signup screens', () => {
    expect(nextAccessStep('name', false)).toBe('email');
    expect(nextAccessStep('email', false)).toBe('password');
    expect(nextAccessStep('password', false)).toBe('agreement');
  });
  it('does not add a signup agreement screen to returning email login', () => {
    expect(nextAccessStep('password', true)).toBe('password');
    expect(previousAccessStep('email', true, 'email')).toBe('welcome');
  });
  it('requires an explicit yes to create an adventurer', () => {
    expect(canCreateAdventurer(null)).toBe(false);
    expect(canCreateAdventurer('no')).toBe(false);
    expect(canCreateAdventurer('yes')).toBe(true);
  });
  it('returns Google signup from agreement to name without asking for a password', () => {
    expect(previousAccessStep('agreement', false, 'google')).toBe('name');
    expect(previousAccessStep('agreement', false, 'email')).toBe('password');
  });
});