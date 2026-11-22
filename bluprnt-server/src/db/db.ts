import fs from 'fs';
import path from 'path';

export interface UserRecord {
  id: string; // user email or uuid
  email: string;
  isPro: boolean;
  stripeCustomerId?: string;
  stripeSessionId?: string;
  proPurchasedAt?: number;
  syncData?: any;
  updatedAt: number;
}

export interface ServerStore {
  users: Record<string, UserRecord>;
  rooms: Record<string, any>;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

class DatabaseStore {
  private store: ServerStore = { users: {}, rooms: {} };

  constructor() {
    this.init();
  }

  private init() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      try {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.store = {
          users: parsed.users || {},
          rooms: parsed.rooms || {},
        };
      } catch (e) {
        console.error('Failed reading database file, starting fresh', e);
        this.store = { users: {}, rooms: {} };
      }
    } else {
      this.save();
    }
  }

  private save() {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.store, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed writing to database store', e);
    }
  }

  getUser(id: string): UserRecord | undefined {
    return this.store.users[id];
  }

  getOrCreateUser(email: string): UserRecord {
    const existing = this.store.users[email];
    if (existing) return existing;

    const newUser: UserRecord = {
      id: email,
      email,
      isPro: false,
      updatedAt: Date.now(),
    };
    this.store.users[email] = newUser;
    this.save();
    return newUser;
  }

  setUserPro(email: string, stripeCustomerId?: string, stripeSessionId?: string): UserRecord {
    const user = this.getOrCreateUser(email);
    user.isPro = true;
    user.stripeCustomerId = stripeCustomerId || user.stripeCustomerId;
    user.stripeSessionId = stripeSessionId || user.stripeSessionId;
    user.proPurchasedAt = Date.now();
    user.updatedAt = Date.now();
    this.save();
    return user;
  }

  saveUserSync(email: string, syncData: any): UserRecord {
    const user = this.getOrCreateUser(email);
    user.syncData = syncData;
    user.updatedAt = Date.now();
    this.save();
    return user;
  }

  // --- Collaborative Rooms ---
  getCollabRoom(id: string): any | undefined {
    return this.store.rooms[id];
  }

  saveCollabRoom(record: any): void {
    this.store.rooms[record.id] = record;
    this.save();
  }

  deleteCollabRoom(id: string): boolean {
    if (this.store.rooms[id]) {
      delete this.store.rooms[id];
      this.save();
      return true;
    }
    return false;
  }

  listUserCollabRooms(email: string): any[] {
    return Object.values(this.store.rooms).filter(
      (r: any) => r.ownerEmail === email || (r.members && r.members[email])
    );
  }
}

export const serverDb = new DatabaseStore();
