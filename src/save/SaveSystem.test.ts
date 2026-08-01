import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SaveSystem, LocalStorageProvider, PlayerProgress } from './SaveSystem';

describe('SaveSystem and LocalStorageProvider', () => {
  beforeEach(() => {
    // Mock standard LocalStorage APIs
    const storage: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage[key] || null,
      setItem: (key: string, val: string) => { storage[key] = val; },
      removeItem: (key: string) => { delete storage[key]; },
      clear: () => { for (const k in storage) delete storage[k]; }
    });

    // Mock IndexedDB to safely and asynchronously trigger success
    vi.stubGlobal('indexedDB', {
      open: () => {
        const req: any = {};
        setTimeout(() => {
          if (req.onsuccess) {
            req.onsuccess({
              target: {
                result: {
                  objectStoreNames: {
                    contains: () => true
                  },
                  transaction: () => ({
                    objectStore: () => ({
                      put: () => {},
                      get: () => ({
                        onsuccess: null,
                        onerror: null
                      })
                    })
                  })
                }
              }
            });
          }
        }, 10);
        return req;
      }
    });
  });

  it('should generate default progress correctly', () => {
    const progress = SaveSystem.getDefaultProgress();
    expect(progress.completedLevels).toEqual({});
    expect(progress.unlockedAchievements).toEqual([]);
    expect(progress.statistics.levelsCompletedCount).toBe(0);
  });

  it('should write and load data via LocalStorageProvider', async () => {
    const provider = new LocalStorageProvider();
    const mockProgress: PlayerProgress = {
      completedLevels: {
        level_1: { stars: 3, bestTime: 10, moves: 4 }
      },
      unlockedAchievements: ['first_alignment'],
      customLevels: {},
      statistics: {
        totalPlayTime: 300,
        beamsTraced: 12,
        elementsPlaced: 4,
        levelsCompletedCount: 1
      }
    };

    const saved = await provider.save(mockProgress);
    expect(saved).toBe(true);

    const loaded = await provider.load();
    expect(loaded).toEqual(mockProgress);
  });
});
