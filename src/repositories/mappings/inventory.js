/**
 * MAPPING — collection `inventory` -> table `public.inventory`
 *
 * Branch stock: laptops, monitors, chairs, pantry supplies. One of the three
 * tables added for the ERP migration, so nothing else writes it and the
 * document shape is exactly what InventoryService and the ERP inventory screen
 * already use:
 *
 *   { id, name, category, quantity, minStock, branch, cost }
 *
 * NON-OBVIOUS TRANSLATIONS
 *   minStock -> min_stock
 *   cost     -> unit_cost      (numeric; arrives as a string, so num())
 *   branch   -> branch_id      (the DOCUMENT carries a LABEL, 'Jeddah'; the
 *                               COLUMN is a branches uuid. The label is derived
 *                               from the branch slug — 'jeddah' -> 'Jeddah' —
 *                               and NOT from branches.name, which for the
 *                               Jeddah branch is 'Mars Space — Kings Road
 *                               Tower'. Deriving it from the slug is what makes
 *                               the round trip 'Jeddah' -> uuid -> 'Jeddah'
 *                               exact.)
 *   lowStock -> is_low_stock   (GENERATED ALWAYS AS (quantity <= min_stock):
 *                               read-only, listed in readOnlyColumns. Naming it
 *                               in an INSERT or UPDATE raises 428C9 even when
 *                               set to the value it already holds.)
 *
 * TWO DIFFERENT `status` IDEAS — do not conflate them
 *   The column is a LIFECYCLE: active / on_order / discontinued / retired.
 *   It is NOT the stock level. "Low stock" is is_low_stock, and
 *   InventoryRepository.findLowStock() computes it from quantity vs minStock in
 *   memory (see the comment there). Soft delete is `status = 'retired'`.
 *
 * ENUM CASE (README §2) — categories are Title Case in the document and
 * lowercase snake in the column: 'Office Supplies' <-> 'office_supplies',
 * 'Electronics' <-> 'electronics'. That is what InventoryService.addItem()
 * sends and what src/app/erp/inventory/page.js filters on. Same for status:
 * 'On Order' <-> 'on_order'.
 *
 * KNOWN LOSSES ON WRITE: none. Every field the service reads or writes has a
 * column. The table also carries sku, nameAr, unit, location, locationAr and
 * notes, which the old documents never had; they are projected so nothing is
 * hidden from the ERP, and they are writable.
 */

import { put, num, toTitleCase, toSnakeCase } from './_helpers';
import {
  rememberBranch,
  resolveBranchId,
  branchLabelForDocument,
  branchSlugForId,
} from './resources';

const mapping = {
  table: 'inventory',

  /** The branch is embedded so `branch` can be a name rather than a uuid. */
  selectColumns: ['*', 'branch:branches(id,slug,name,name_ar)'].join(','),

  idColumn: 'id',
  defaultOrder: { column: 'created_at', ascending: false },

  /** GENERATED column: 428C9 if it appears in a write payload at all. */
  readOnlyColumns: ['is_low_stock'],

  toDocument(row) {
    if (!row) return null;
    rememberBranch(row.branch);

    return {
      id: row.id,
      sku: row.sku,
      name: row.name,
      nameAr: row.name_ar,
      // 'office_supplies' -> 'Office Supplies'
      category: toTitleCase(row.category),
      quantity: row.quantity ?? 0,
      minStock: row.min_stock ?? 0,
      unit: row.unit,
      // numeric -> number, or the ERP valuation would concatenate strings.
      cost: num(row.unit_cost) ?? 0,
      branch: branchLabelForDocument(row),
      branchSlug: row.branch?.slug ?? branchSlugForId(row.branch_id),
      location: row.location,
      locationAr: row.location_ar,
      status: toTitleCase(row.status),
      notes: row.notes,
      // The generated column, read-only but worth surfacing.
      lowStock: row.is_low_stock === true,
      // Soft delete is `status = 'retired'` (README §5a).
      isDeleted: row.status === 'retired',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  toRow(doc, mode) {
    const row = {};
    if (!doc) return row;

    put(row, 'sku', doc.sku);
    put(row, 'name', doc.name);
    put(row, 'name_ar', doc.nameAr);
    // 'Office Supplies' -> 'office_supplies' (inventory_category_check).
    put(row, 'category', doc.category, toSnakeCase);
    put(row, 'quantity', doc.quantity, Number);
    put(row, 'min_stock', doc.minStock, Number);
    put(row, 'unit', doc.unit, toSnakeCase);
    put(row, 'unit_cost', doc.cost, Number);
    put(row, 'location', doc.location);
    put(row, 'location_ar', doc.locationAr);
    put(row, 'status', doc.status, toSnakeCase);
    put(row, 'notes', doc.notes);

    // 'Jeddah' | 'jeddah' | uuid -> branches.id. An unresolvable branch throws
    // rather than being dropped: stock filed against the wrong branch, or a
    // patch that silently ignores the branch it was given, is worse than an
    // error naming the value.
    put(row, 'branch_id', resolveBranchId(doc.branch ?? doc.branchSlug ?? doc.branchId));

    if (mode === 'create') {
      // branch_id and name are NOT NULL with no default. Everything else the
      // table defaults (category 'electronics', quantity 0, min_stock 0,
      // unit 'unit', unit_cost 0, status 'active'), so an insert that omits
      // them is still valid.
      if (!row.branch_id) {
        throw new Error(
          'inventory.create requires a branch: pass { branch: "Jeddah" } (or a ' +
            'branches.id uuid). inventory.branch_id is NOT NULL and toRow cannot ' +
            'look one up.'
        );
      }
    }

    // is_low_stock is never emitted; BaseRepository also strips it via
    // readOnlyColumns, but not building it in the first place keeps the payload
    // honest about what this mapping owns.
    return row;
  },

  filters: {
    sku: 'sku',
    name: 'name',
    category: { column: 'category', toColumn: toSnakeCase },
    status: { column: 'status', toColumn: toSnakeCase },
    // 'Jeddah' / 'jeddah' / uuid all resolve to the same branches.id.
    branch: { column: 'branch_id', toColumn: (v) => resolveBranchId(v) ?? v },
    branchSlug: { column: 'branch_id', toColumn: (v) => resolveBranchId(v) ?? v },
    // The generated column. findLowStock() deliberately does NOT use this (see
    // src/repositories/index.js), but it is the pushdown if that ever changes.
    lowStock: { column: 'is_low_stock', toColumn: Boolean },
  },

  /**
   * A retired asset is gone from the stock list — it is not a lifecycle state
   * the ERP still tracks, unlike 'discontinued' or 'on_order', both of which
   * stay visible. Pass { includeDeleted: true } to see retired rows.
   */
  activeFilter: (q) => q.neq('status', 'retired'),

  softDelete: { column: 'status', value: 'retired' },
};

export default mapping;
