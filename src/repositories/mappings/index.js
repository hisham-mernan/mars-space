/**
 * The mapping registry.
 *
 * BaseRepository is storage-generic: it knows how to select, insert, update and
 * soft-delete, but nothing about any particular table. Everything table-shaped
 * -- which Postgres table backs a collection, how a row becomes the camelCase
 * document the services expect, how a document becomes a row, and what "delete"
 * means -- lives in one module per collection in this directory.
 *
 * Keys are the collection names the repositories already use in
 * src/repositories/index.js. They are NOT table names: several differ
 * (users -> profiles, customers -> companies, crm_leads -> leads) and two
 * collections share one table (activities and audit_logs both project
 * public.audit_log, with different document shapes).
 *
 * Every module in this map must satisfy the contract in ./README.md.
 */

import bookings from './bookings';
import resources from './resources';
import users from './users';
import invoices from './invoices';
import contracts from './contracts';
import contract_templates from './contract_templates';
import contract_versions from './contract_versions';
import customers from './customers';
import crm_leads from './crm_leads';
import inventory from './inventory';
import support_tickets from './support_tickets';
import activities from './activities';
import audit_logs from './audit_logs';
import notifications from './notifications';

/** collection name -> mapping module */
export const mappings = {
  bookings,
  resources,
  users,
  invoices,
  contracts,
  contract_templates,
  contract_versions,
  customers,
  crm_leads,
  inventory,
  support_tickets,
  activities,
  audit_logs,
  notifications,
};

/**
 * Look up the mapping for a collection.
 *
 * Throws on an unknown collection rather than returning undefined: a repository
 * constructed with a typo would otherwise fail much later with a null-property
 * error a long way from the cause.
 */
export function getMapping(collectionName) {
  const mapping = mappings[collectionName];
  if (!mapping) {
    throw new Error(
      `Unknown repository collection "${collectionName}". ` +
        `Known collections: ${Object.keys(mappings).join(', ')}. ` +
        `Add a module in src/repositories/mappings/ and register it in this file.`
    );
  }
  return mapping;
}

/** The Postgres table a collection is stored in. Handy in logs and tests. */
export function tableFor(collectionName) {
  return getMapping(collectionName).table;
}
