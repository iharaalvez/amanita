import type { GistEntry } from './types';

export const GIST_CATALOG: GistEntry[] = [
  // Regular mode
  { url: 'https://gist.github.com/Lusamine/eed85a54b6bc9f68945ab86b8fce0cea', category: 'tera-shard', mode: 'regular', print_count: 5 },
  { url: 'https://gist.github.com/Lusamine/baf7be6bb6277ba08a44de47cbdf97d8', category: 'tera-shard', mode: 'regular', print_count: 10 },
  { url: 'https://gist.github.com/Lusamine/044418b752eccc7d7dd611a4112fed1a', category: 'ability-patch', mode: 'regular', print_count: 5 },
  { url: 'https://gist.github.com/Lusamine/eeff1e8f35f080d5ba7db2d15a84d0c7', category: 'exp-candy', mode: 'regular', print_count: 5 },
  { url: 'https://gist.github.com/Lusamine/f148fd901117efb3daca889eb2b74c2d', category: 'gold-bottle-cap', mode: 'regular', print_count: 5 },
  { url: 'https://gist.github.com/Lusamine/6f4403a49181d322ba7e2156e6beb74d', category: 'pp-max', mode: 'regular', print_count: 5 },
  { url: 'https://gist.github.com/Lusamine/22575987228daf029078804348d8dbbe', category: 'evolution-item', mode: 'regular', print_count: 5 },
  { url: 'https://gist.github.com/Lusamine/7d83b073881f1e63cbc7cdaf4e8b8da1', category: 'alcremie-sweet', mode: 'regular', print_count: 5 },

  // 2× Item Bonus
  { url: 'https://gist.github.com/Lusamine/a78b87cf72526aa9c3d01e30653eaddc', category: 'tera-shard', mode: 'item-bonus', print_count: 5 },
  { url: 'https://gist.github.com/Lusamine/9a52305451f27c89265fd769f666206f', category: 'tera-shard', mode: 'item-bonus', print_count: 10 },
  { url: 'https://gist.github.com/Lusamine/dd0d3645416698b0f59c1879c3b85dcc', category: 'ability-patch', mode: 'item-bonus', print_count: 5 },
  { url: 'https://gist.github.com/Lusamine/25f5eb30e7d6dace1828283795aae456', category: 'exp-candy', mode: 'item-bonus', print_count: 5 },
  { url: 'https://gist.github.com/Lusamine/ef0ec9059dadba98c439a2e6c15f4275', category: 'gold-bottle-cap', mode: 'item-bonus', print_count: 5 },
  { url: 'https://gist.github.com/Lusamine/968577b5ccb4403afb9f4b6a0051863a', category: 'pp-max', mode: 'item-bonus', print_count: 5 },

  // Poké Ball Lotto
  { url: 'https://gist.github.com/Lusamine/6b1f6eb4348fc5e93b491828f9439e1c', category: 'rare-ball', mode: 'ball-lotto', print_count: 5 },
  { url: 'https://gist.github.com/Lusamine/0c5ce90a2dcfa06b4bc5717194935af3', category: 'rare-ball', mode: 'ball-lotto', print_count: 10 },

  // Combo
  { url: 'https://gist.github.com/Lusamine/c05d5807eaa0cca7c0a3bebc0d0b611f', category: 'tera-shard', mode: 'combo', print_count: 5 },
  { url: 'https://gist.github.com/Lusamine/a095adb40f19e37f5714009714e364ad', category: 'tera-shard', mode: 'combo', print_count: 10 },
  { url: 'https://gist.github.com/Lusamine/bcb6e0595519e1b482e4c2a3044ee886', category: 'ability-patch', mode: 'combo', print_count: 5 },
  { url: 'https://gist.github.com/Lusamine/36661ee878ab91f6c5ac06addb6abb28', category: 'exp-candy', mode: 'combo', print_count: 5 },
  { url: 'https://gist.github.com/Lusamine/9933a23ae51a38dee88fc1e28d6e0bda', category: 'exp-candy', mode: 'combo', print_count: 10 },
  { url: 'https://gist.github.com/Lusamine/0fed115ddfbbf3c09a071b1e7f5a37b4', category: 'gold-bottle-cap', mode: 'combo', print_count: 5 },
  { url: 'https://gist.github.com/Lusamine/cbca28d9f52e9d094d86074e2eea671c', category: 'pp-max', mode: 'combo', print_count: 5 },
  { url: 'https://gist.github.com/Lusamine/c61d3e0c42984ef8e7c1cda716c3b32a', category: 'rare-ball', mode: 'combo', print_count: 5 },
  { url: 'https://gist.github.com/Lusamine/918867a70e7261b023cad1a7d9f3c9fb', category: 'rare-ball', mode: 'combo', print_count: 10 },
];

export function rawGistUrl(gistPageUrl: string): string {
  const id = gistPageUrl.split('/').at(-1)!;
  return `https://gist.githubusercontent.com/Lusamine/${id}/raw/`;
}
