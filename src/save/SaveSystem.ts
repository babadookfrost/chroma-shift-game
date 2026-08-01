/**
 * Represents the structured progress/save data of the player.
 */
export interface PlayerProgress {
  completedLevels: Record<string, { stars: number; bestTime: number; moves: number }>;
  unlockedAchievements: string[];
  customLevels: Record<string, string>; // Custom level code keyed by unique ID
  statistics: {
    totalPlayTime: number; // in seconds
    beamsTraced: number;
    elementsPlaced: number;
    levelsCompletedCount: number;
  };
}

/**
 * Universal interface for game save data providers.
 */
export interface ISaveProvider {
  save(data: PlayerProgress): Promise<boolean>;
  load(): Promise<PlayerProgress | null>;
}

/**
 * Local Storage implementation of the Save Provider.
 */
export class LocalStorageProvider implements ISaveProvider {
  private key = 'chroma_shift_progress';

  async save(data: PlayerProgress): Promise<boolean> {
    try {
      localStorage.setItem(this.key, JSON.stringify(data));
      // Try to also backup to IndexedDB if available
      await this.backupToIndexedDB(data);
      return true;
    } catch (e) {
      console.error('[LocalStorageProvider] Save failed: ', e);
      return false;
    }
  }

  async load(): Promise<PlayerProgress | null> {
    try {
      const dataStr = localStorage.getItem(this.key);
      if (dataStr) {
        return JSON.parse(dataStr) as PlayerProgress;
      }
      // Try loading from IndexedDB backup if localStorage was cleared
      return await this.loadFromIndexedDB();
    } catch (e) {
      console.error('[LocalStorageProvider] Load failed: ', e);
      return null;
    }
  }

  private async backupToIndexedDB(data: PlayerProgress): Promise<void> {
    return new Promise((resolve) => {
      const request = indexedDB.open('ChromaShiftBackup', 1);
      request.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('saves')) {
          db.createObjectStore('saves', { keyPath: 'id' });
        }
      };
      request.onsuccess = (e: any) => {
        const db = e.target.result;
        try {
          const transaction = db.transaction(['saves'], 'readwrite');
          const store = transaction.objectStore('saves');
          store.put({ id: 'latest', data, timestamp: Date.now() });
        } catch (err) {
          console.warn('[IndexedDB] Backup writing skipped/failed');
        }
        resolve();
      };
      request.onerror = () => {
        resolve(); // Fail-silent backup
      };
    });
  }

  private async loadFromIndexedDB(): Promise<PlayerProgress | null> {
    return new Promise((resolve) => {
      const request = indexedDB.open('ChromaShiftBackup', 1);
      request.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        db.createObjectStore('saves', { keyPath: 'id' });
      };
      request.onsuccess = (e: any) => {
        const db = e.target.result;
        try {
          const transaction = db.transaction(['saves'], 'readonly');
          const store = transaction.objectStore('saves');
          const getReq = store.get('latest');
          getReq.onsuccess = () => {
            if (getReq.result && getReq.result.data) {
              console.log('[IndexedDB] Successfully restored save backup');
              resolve(getReq.result.data);
            } else {
              resolve(null);
            }
          };
          getReq.onerror = () => resolve(null);
        } catch (err) {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  }
}

/**
 * Mock Cloud Provider with artificial network latency and reliable memory persistence.
 */
export class MockCloudProvider implements ISaveProvider {
  private inMemoryData: PlayerProgress | null = null;
  private latencyMs = 800;

  async save(data: PlayerProgress): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.inMemoryData = JSON.parse(JSON.stringify(data));
        console.log('[MockCloudProvider] Successfully synced progress to the cloud.');
        resolve(true);
      }, this.latencyMs);
    });
  }

  async load(): Promise<PlayerProgress | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this.inMemoryData ? JSON.parse(JSON.stringify(this.inMemoryData)) : null);
      }, this.latencyMs);
    });
  }
}

/**
 * Supabase Cloud Save Provider - Stubbed with clear TODO instructions for client-side configuration.
 */
export class SupabaseProvider implements ISaveProvider {
  // TODO: Add Supabase client dependency: npm i @supabase/supabase-js
  // TODO: Configure environment variables for SUPABASE_URL and SUPABASE_ANON_KEY
  // private supabaseUrl = '';
  // private supabaseAnonKey = '';

  async save(data: PlayerProgress): Promise<boolean> {
    console.warn('[SupabaseProvider] Save stub triggered. Needs configuration for data: ', data);
    // TODO: Implement Supabase Database Upsert:
    // const { error } = await this.supabase
    //   .from('user_saves')
    //   .upsert({ user_id: 'current-user-uuid', progress: data });
    // return !error;
    return true;
  }

  async load(): Promise<PlayerProgress | null> {
    console.warn('[SupabaseProvider] Load stub triggered. Needs configuration.');
    // TODO: Implement Supabase Database Fetch:
    // const { data, error } = await this.supabase
    //   .from('user_saves')
    //   .select('progress')
    //   .single();
    // if (data) return data.progress;
    return null;
  }
}

/**
 * Main Save System interface used throughout Chroma Shift.
 */
export class SaveSystem {
  private static localProvider = new LocalStorageProvider();
  private static cloudProvider = new MockCloudProvider();
  private static activeProgress: PlayerProgress = SaveSystem.getDefaultProgress();

  /**
   * Generates a clean default progress template.
   */
  static getDefaultProgress(): PlayerProgress {
    return {
      completedLevels: {},
      unlockedAchievements: [],
      customLevels: {},
      statistics: {
        totalPlayTime: 0,
        beamsTraced: 0,
        elementsPlaced: 0,
        levelsCompletedCount: 0
      }
    };
  }

  /**
   * Loads user progress from Local Storage & IndexDB backup.
   */
  static async loadProgress(): Promise<PlayerProgress> {
    const loaded = await this.localProvider.load();
    if (loaded) {
      this.activeProgress = this.mergeDefaults(loaded);
    } else {
      this.activeProgress = this.getDefaultProgress();
    }
    return this.activeProgress;
  }

  /**
   * Saves active user progress and triggers background cloud syncing.
   */
  static async saveProgress(progress?: PlayerProgress): Promise<boolean> {
    if (progress) {
      this.activeProgress = progress;
    }
    const localSaved = await this.localProvider.save(this.activeProgress);
    // Silent asynchronous background cloud sync with MockCloudProvider
    this.cloudProvider.save(this.activeProgress).catch((e) => {
      console.warn('[SaveSystem] Background cloud sync failed: ', e);
    });
    return localSaved;
  }

  /**
   * Retrieves the current loaded memory progress.
   */
  static getProgress(): PlayerProgress {
    return this.activeProgress;
  }

  /**
   * Marks a level as complete and returns whether a record was broken.
   */
  static completeLevel(levelId: string, stars: number, timeSpent: number, moves: number): boolean {
    const record = this.activeProgress.completedLevels[levelId];
    let isNewRecord = false;

    if (!record) {
      this.activeProgress.completedLevels[levelId] = { stars, bestTime: timeSpent, moves };
      isNewRecord = true;
      this.activeProgress.statistics.levelsCompletedCount++;
    } else {
      const improvedStars = stars > record.stars;
      const improvedTime = timeSpent < record.bestTime;
      if (improvedStars || improvedTime) {
        this.activeProgress.completedLevels[levelId] = {
          stars: Math.max(record.stars, stars),
          bestTime: Math.min(record.bestTime, timeSpent),
          moves: Math.min(record.moves, moves)
        };
        isNewRecord = true;
      }
    }

    this.saveProgress();
    return isNewRecord;
  }

  /**
   * Merges custom structure with missing properties from older versions.
   */
  private static mergeDefaults(data: any): PlayerProgress {
    const def = this.getDefaultProgress();
    return {
      completedLevels: data.completedLevels || def.completedLevels,
      unlockedAchievements: data.unlockedAchievements || def.unlockedAchievements,
      customLevels: data.customLevels || def.customLevels,
      statistics: {
        totalPlayTime: data.statistics?.totalPlayTime || def.statistics.totalPlayTime,
        beamsTraced: data.statistics?.beamsTraced || def.statistics.beamsTraced,
        elementsPlaced: data.statistics?.elementsPlaced || def.statistics.elementsPlaced,
        levelsCompletedCount: data.statistics?.levelsCompletedCount || def.statistics.levelsCompletedCount
      }
    };
  }
}
