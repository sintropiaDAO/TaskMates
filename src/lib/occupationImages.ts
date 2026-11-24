import leadership from '@/assets/capyvera/occupations/leadership.png.asset.json';
import collaboration from '@/assets/capyvera/occupations/collaboration.png.asset.json';
import positive_impact from '@/assets/capyvera/occupations/positive_impact.png.asset.json';
import sociability from '@/assets/capyvera/occupations/sociability.png.asset.json';
import reliability from '@/assets/capyvera/occupations/reliability.png.asset.json';
import consistency from '@/assets/capyvera/occupations/consistency.png.asset.json';
import proactivity from '@/assets/capyvera/occupations/proactivity.png.asset.json';
import habits from '@/assets/capyvera/occupations/habits.png.asset.json';
import communities from '@/assets/capyvera/occupations/communities.png.asset.json';
import taskmates from '@/assets/capyvera/occupations/taskmates.png.asset.json';
import type { VocationCategory } from '@/lib/guildQuiz';

/** Capyvera dressed as each occupation title (same character as the app mascot). */
export const OCCUPATION_IMAGES: Record<VocationCategory | 'taskmates', string> = {
  leadership: leadership.url, collaboration: collaboration.url, positive_impact: positive_impact.url,
  sociability: sociability.url, reliability: reliability.url, consistency: consistency.url,
  proactivity: proactivity.url, habits: habits.url, communities: communities.url, taskmates: taskmates.url,
};
