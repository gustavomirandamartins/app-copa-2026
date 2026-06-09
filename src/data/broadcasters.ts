import type { Broadcaster } from '@/lib/types';

export const broadcasters: Broadcaster[] = [
  {
    id: 'cazetv',
    name: 'CazéTV',
    games: 104,
    platform: 'YouTube',
    url: 'https://www.youtube.com/@CazeTV',
    type: 'free',
  },
  {
    id: 'amazon-prime',
    name: 'Amazon Prime Video',
    games: 104,
    platform: 'Streaming',
    url: 'https://www.primevideo.com/',
    type: 'subscription',
  },
  {
    id: 'tv-globo',
    name: 'TV Globo',
    games: 56,
    platform: 'TV aberta',
    url: null,
    type: 'free',
  },
  {
    id: 'sportv',
    name: 'SporTV',
    games: 56,
    platform: 'TV paga',
    url: 'https://globoplay.globo.com/',
    type: 'subscription',
  },
  {
    id: 'globoplay',
    name: 'Globoplay',
    games: 56,
    platform: 'Streaming',
    url: 'https://globoplay.globo.com/',
    type: 'subscription',
  },
  {
    id: 'sbt',
    name: 'SBT',
    games: 32,
    platform: 'TV aberta',
    url: 'https://www.sbt.com.br/',
    type: 'free',
  },
];
