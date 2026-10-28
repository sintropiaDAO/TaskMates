import { describe, it, expect } from 'vitest';
import { journeyMultiplier, compareIndicator } from './journeys';
import { EXP_RULES } from './rpg';

describe('journey EXP multiplier', () => {
  it('is x1 with no completed journeys', () => expect(journeyMultiplier(0)).toBe(1));
  it('adds 10% per completed journey', () => expect(journeyMultiplier(3)).toBe(1.3));
  it('caps at x2', () => expect(journeyMultiplier(25)).toBe(2));
  it('awards 15 base EXP per completed journey', () => expect(EXP_RULES.journeyCompleted).toBe(15));
});

describe('indicator comparisons', () => {
  it('equals 0 downvotes', () => expect(compareIndicator(0, 'eq', 0)).toBe(true));
  it('greater than fails on equal', () => expect(compareIndicator(3, 'gt', 3)).toBe(false));
  it('less than', () => expect(compareIndicator(2, 'lt', 3)).toBe(true));
});
