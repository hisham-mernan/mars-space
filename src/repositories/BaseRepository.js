import { getDb, saveDb } from '@/lib/db';

/**
 * BaseRepository implementing the IRepository interface pattern.
 * Decouples all business & domain logic from the underlying storage mechanism.
 */
export class BaseRepository {
  constructor(collectionName) {
    this.collectionName = collectionName;
  }

  /**
   * Helper to fetch current database state
   */
  _readDb() {
    const db = getDb();
    if (!db[this.collectionName]) {
      db[this.collectionName] = [];
    }
    return db;
  }

  /**
   * Helper to persist database state
   */
  _writeDb(db) {
    return saveDb(db);
  }

  /**
   * Retrieve all active items (excluding soft deleted items)
   */
  async findAll(filterFn = null) {
    const db = this._readDb();
    let items = db[this.collectionName].filter(item => !item.isDeleted);
    if (filterFn) {
      items = items.filter(filterFn);
    }
    return items;
  }

  /**
   * Find item by unique ID
   */
  async findById(id) {
    const items = await this.findAll();
    return items.find(item => item.id === id) || null;
  }

  /**
   * Create a new entity record
   */
  async create(data) {
    const db = this._readDb();
    const now = new Date().toISOString();
    
    const newItem = {
      id: data.id || `${this.collectionName}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      ...data,
      isDeleted: false,
      createdAt: data.createdAt || now,
      updatedAt: now
    };

    if (!db[this.collectionName]) {
      db[this.collectionName] = [];
    }

    db[this.collectionName].unshift(newItem);
    this._writeDb(db);
    return newItem;
  }

  /**
   * Update an existing entity by ID
   */
  async update(id, updates) {
    const db = this._readDb();
    const index = db[this.collectionName].findIndex(item => item.id === id && !item.isDeleted);

    if (index === -1) return null;

    const updatedItem = {
      ...db[this.collectionName][index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    db[this.collectionName][index] = updatedItem;
    this._writeDb(db);
    return updatedItem;
  }

  /**
   * Soft delete an entity (preserves historical integrity for audit)
   */
  async softDelete(id) {
    return this.update(id, { isDeleted: true, deletedAt: new Date().toISOString() });
  }
}
