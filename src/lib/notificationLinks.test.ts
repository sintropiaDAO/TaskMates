import { describe, expect, it } from 'vitest';
import { pushUrlFor } from './notificationLinks';

const U = 'u1';
describe('pushUrlFor', () => {
  it('opens the conversation for messages', () => expect(pushUrlFor('new_message', U, null, 'c1')).toBe('/chat?conversation=c1'));
  it('opens followers for new followers', () => expect(pushUrlFor('new_follower', U, null, null)).toBe('/profile/u1/followers'));
  it('opens the task for task notices', () => expect(pushUrlFor('task_completed', U, 't1', null)).toBe('/dashboard?task=t1'));
  it('opens the poll for poll notices', () => expect(pushUrlFor('poll_invite', U, 'p1', null)).toBe('/dashboard?poll=p1'));
});
