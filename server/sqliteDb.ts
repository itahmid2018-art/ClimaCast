/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

export interface SqliteUserRecord {
  id: string;
  machine_id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  country_code: string;
  state: string;
  state_code?: string;
  district?: string;
  city?: string;
  default_zip_pin?: string;
  auto_resolve: number;
  wttr_precision: number;
  created_at: string;
  updated_at: string;
}

export interface TwilioLogRecord {
  id: string;
  timestamp: string;
  to_phone: string;
  from_phone: string;
  message_body: string;
  status: 'sent' | 'delivered' | 'failed' | 'trial_template_restricted' | 'error';
  error_code?: number | null;
  error_message?: string | null;
  sid?: string | null;
  raw_response?: string | null;
}

let dbInstance: DatabaseSync | null = null;
let activeDbPath: string = '';

export function getSqliteDb(customPath?: string): DatabaseSync {
  if (dbInstance) {
    return dbInstance;
  }

  const resolvedPath =
    customPath ||
    process.env.SQLITE_DB_PATH ||
    path.join(process.cwd(), 'climacast.sqlite');

  activeDbPath = resolvedPath;
  const dir = path.dirname(resolvedPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  dbInstance = new DatabaseSync(resolvedPath);
  initializeSchema(dbInstance);
  return dbInstance;
}

function initializeSchema(db: DatabaseSync) {
  db.exec(`
    -- 1. Machine Nodes & Hardware/Container Registry
    CREATE TABLE IF NOT EXISTS machine_nodes (
      machine_id TEXT PRIMARY KEY,
      app_url TEXT,
      port INTEGER DEFAULT 3000,
      node_env TEXT,
      sqlite_db_path TEXT,
      last_heartbeat TEXT
    );

    -- 2. System Configuration & Default Fallbacks
    CREATE TABLE IF NOT EXISTS system_config (
      key TEXT PRIMARY KEY,
      value TEXT,
      category TEXT,
      updated_at TEXT
    );

    -- 3. Users & Identity Registry
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      machine_id TEXT,
      name TEXT,
      email TEXT,
      phone TEXT,
      country TEXT,
      country_code TEXT,
      state TEXT,
      state_code TEXT,
      district TEXT,
      city TEXT,
      default_zip_pin TEXT,
      auto_resolve INTEGER DEFAULT 1,
      wttr_precision INTEGER DEFAULT 1,
      created_at TEXT,
      updated_at TEXT
    );

    -- 4. Saved Locations
    CREATE TABLE IF NOT EXISTS saved_locations (
      id INTEGER PRIMARY KEY,
      name TEXT,
      country TEXT,
      admin1 TEXT,
      latitude REAL,
      longitude REAL,
      timezone TEXT,
      created_at TEXT
    );

    -- 5. Saved Postal / PIN Codes
    CREATE TABLE IF NOT EXISTS saved_postal_pins (
      code TEXT PRIMARY KEY,
      name TEXT,
      state TEXT,
      country TEXT,
      latitude REAL,
      longitude REAL,
      created_at TEXT
    );

    -- 6. Notification Settings
    CREATE TABLE IF NOT EXISTS notification_settings (
      id TEXT PRIMARY KEY,
      enabled INTEGER DEFAULT 1,
      morning_tip_enabled INTEGER DEFAULT 1,
      severe_alerts_only INTEGER DEFAULT 1,
      last_morning_tip_date TEXT,
      updated_at TEXT
    );

    -- 7. Twilio SMS & WhatsApp Log Registry
    CREATE TABLE IF NOT EXISTS twilio_messages_log (
      id TEXT PRIMARY KEY,
      timestamp TEXT,
      to_phone TEXT,
      from_phone TEXT,
      message_body TEXT,
      status TEXT,
      error_code INTEGER,
      error_message TEXT,
      sid TEXT,
      raw_response TEXT
    );

    -- 8. Weather News Dispatches
    CREATE TABLE IF NOT EXISTS weather_news_dispatches (
      id TEXT PRIMARY KEY,
      timestamp TEXT,
      location_name TEXT,
      condition TEXT,
      temperature REAL,
      unit TEXT,
      channel TEXT,
      recipient TEXT,
      anchor_name TEXT,
      headline TEXT,
      report_text TEXT
    );
  `);
}

/**
 * Syncs all JSON and Environment variables into SQLite tables.
 */
export function syncAllDataToSqlite() {
  const db = getSqliteDb();

  const machineId = process.env.MACHINE_ID || 'climacast-dev-srv-asia-southeast1';
  const uniqueUserId = process.env.UNIQUE_USER_ID || 'usr_itahmid_8197845321';
  const appUrl = process.env.APP_URL || 'https://ais-dev-2j5vkz47k6lszvoh3n7nws-1038819846954.asia-southeast1.run.app';
  const now = new Date().toISOString();

  // 1. Sync machine node
  const upsertMachine = db.prepare(`
    INSERT INTO machine_nodes (machine_id, app_url, port, node_env, sqlite_db_path, last_heartbeat)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(machine_id) DO UPDATE SET
      app_url=excluded.app_url,
      port=excluded.port,
      node_env=excluded.node_env,
      sqlite_db_path=excluded.sqlite_db_path,
      last_heartbeat=excluded.last_heartbeat;
  `);
  upsertMachine.run(
    machineId,
    appUrl,
    parseInt(process.env.PORT || '3000', 10),
    process.env.NODE_ENV || 'development',
    activeDbPath,
    now
  );

  // 2. Sync system configs
  const upsertConfig = db.prepare(`
    INSERT INTO system_config (key, value, category, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value=excluded.value,
      category=excluded.category,
      updated_at=excluded.updated_at;
  `);

  const configsToSave = [
    { key: 'PORT', value: process.env.PORT || '3000', category: 'server' },
    { key: 'NODE_ENV', value: process.env.NODE_ENV || 'production', category: 'server' },
    { key: 'APP_URL', value: appUrl, category: 'network' },
    { key: 'MACHINE_ID', value: machineId, category: 'identity' },
    { key: 'UNIQUE_USER_ID', value: uniqueUserId, category: 'identity' },
    { key: 'AUTHORIZED_USER_PHONE', value: process.env.AUTHORIZED_USER_PHONE || '+918197845321', category: 'user' },
    { key: 'AUTHORIZED_USER_EMAIL', value: process.env.AUTHORIZED_USER_EMAIL || 'itahmid2018@gmail.com', category: 'user' },
    { key: 'AUTHORIZED_USER_NAME', value: process.env.AUTHORIZED_USER_NAME || 'Tahmid', category: 'user' },
    { key: 'TWILIO_PHONE_NUMBER', value: process.env.TWILIO_PHONE_NUMBER || '8197845321', category: 'twilio' },
    { key: 'TWILIO_ACCOUNT_SID_SET', value: process.env.TWILIO_ACCOUNT_SID ? 'true' : 'false', category: 'twilio' },
    { key: 'GEMINI_API_KEY_SET', value: process.env.GEMINI_API_KEY ? 'true' : 'false', category: 'ai' },
    { key: 'SQLITE_DB_PATH', value: activeDbPath, category: 'database' },
  ];

  for (const c of configsToSave) {
    upsertConfig.run(c.key, c.value, c.category, now);
  }

  // 3. Sync User Profile from user-db.json
  const userDbFile = path.join(process.cwd(), 'user-db.json');
  if (fs.existsSync(userDbFile)) {
    try {
      const userDb = JSON.parse(fs.readFileSync(userDbFile, 'utf-8'));
      const profile = userDb.profile || {};
      const authUser = userDb.authorizedUser || {};

      const upsertUser = db.prepare(`
        INSERT INTO users (id, machine_id, name, email, phone, country, country_code, state, state_code, district, city, default_zip_pin, auto_resolve, wttr_precision, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          machine_id=excluded.machine_id,
          name=excluded.name,
          email=excluded.email,
          phone=excluded.phone,
          country=excluded.country,
          country_code=excluded.country_code,
          state=excluded.state,
          state_code=excluded.state_code,
          district=excluded.district,
          city=excluded.city,
          default_zip_pin=excluded.default_zip_pin,
          auto_resolve=excluded.auto_resolve,
          wttr_precision=excluded.wttr_precision,
          updated_at=excluded.updated_at;
      `);

      upsertUser.run(
        authUser.userId || uniqueUserId,
        authUser.machineId || machineId,
        authUser.name || profile.name || 'Tahmid',
        authUser.email || profile.email || 'itahmid2018@gmail.com',
        authUser.phone || profile.phone || '+918197845321',
        profile.country || 'India',
        profile.countryCode || 'IN',
        profile.state || 'Karnataka',
        profile.stateCode || 'KA',
        profile.district || 'Bengaluru Urban',
        profile.city || 'Bengaluru',
        profile.defaultZipPin || '560001',
        profile.autoResolveOnZipInput ? 1 : 0,
        profile.wttrPrecisionMode ? 1 : 0,
        authUser.registeredAt || now,
        profile.lastUpdated || now
      );

      // Sync Postal PINs
      if (Array.isArray(userDb.savedZipPins)) {
        const upsertPin = db.prepare(`
          INSERT INTO saved_postal_pins (code, name, state, country, latitude, longitude, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(code) DO UPDATE SET
            name=excluded.name,
            state=excluded.state,
            country=excluded.country,
            latitude=excluded.latitude,
            longitude=excluded.longitude;
        `);

        for (const pin of userDb.savedZipPins) {
          upsertPin.run(
            pin.code,
            pin.name || pin.code,
            pin.state || '',
            pin.country || '',
            typeof pin.latitude === 'number' ? pin.latitude : parseFloat(pin.latitude) || 0,
            typeof pin.longitude === 'number' ? pin.longitude : parseFloat(pin.longitude) || 0,
            now
          );
        }
      }
    } catch (e) {
      console.warn('Could not sync user-db.json to SQLite:', e);
    }
  }

  // 4. Sync Saved Locations & Notifications from db.json
  const dbFile = path.join(process.cwd(), 'db.json');
  if (fs.existsSync(dbFile)) {
    try {
      const mainDb = JSON.parse(fs.readFileSync(dbFile, 'utf-8'));

      if (Array.isArray(mainDb.savedLocations)) {
        const upsertLocation = db.prepare(`
          INSERT INTO saved_locations (id, name, country, admin1, latitude, longitude, timezone, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name=excluded.name,
            country=excluded.country,
            admin1=excluded.admin1,
            latitude=excluded.latitude,
            longitude=excluded.longitude,
            timezone=excluded.timezone;
        `);

        for (const loc of mainDb.savedLocations) {
          upsertLocation.run(
            loc.id,
            loc.name,
            loc.country || '',
            loc.admin1 || '',
            loc.latitude,
            loc.longitude,
            loc.timezone || 'UTC',
            now
          );
        }
      }

      const notif = mainDb.notificationSettings || {};
      const upsertNotif = db.prepare(`
        INSERT INTO notification_settings (id, enabled, morning_tip_enabled, severe_alerts_only, last_morning_tip_date, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          enabled=excluded.enabled,
          morning_tip_enabled=excluded.morning_tip_enabled,
          severe_alerts_only=excluded.severe_alerts_only,
          last_morning_tip_date=excluded.last_morning_tip_date,
          updated_at=excluded.updated_at;
      `);

      upsertNotif.run(
        'global_settings',
        notif.enabled !== false ? 1 : 0,
        notif.morningTipEnabled !== false ? 1 : 0,
        notif.severeAlertsOnly !== false ? 1 : 0,
        mainDb.lastMorningTipDate || null,
        now
      );

      // Check if twilioIntegration test data exists in db.json to record in twilio_messages_log
      if (mainDb.twilioIntegration) {
        const ti = mainDb.twilioIntegration;
        logTwilioMessage({
          id: `log_init_${Date.now()}`,
          timestamp: ti.lastTestedAt || now,
          to_phone: ti.authorizedRecipient || '+918197845321',
          from_phone: ti.fromPhone || '8197845321',
          message_body: ti.helloMessage || 'Hello from ClimaCast Weather test.',
          status: ti.testStatus || 'trial_template_restricted',
          error_code: ti.testErrorCode || 572006,
          error_message: ti.testErrorMessage || 'Invalid template name. Trial accounts can only use predefined SMS templates.',
          sid: null,
          raw_response: JSON.stringify(ti),
        });
      }
    } catch (e) {
      console.warn('Could not sync db.json to SQLite:', e);
    }
  }

  return getSqliteStats();
}

/**
 * Logs a Twilio message dispatch or test attempt to SQLite
 */
export function logTwilioMessage(record: TwilioLogRecord) {
  const db = getSqliteDb();
  const insert = db.prepare(`
    INSERT INTO twilio_messages_log (id, timestamp, to_phone, from_phone, message_body, status, error_code, error_message, sid, raw_response)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      status=excluded.status,
      error_code=excluded.error_code,
      error_message=excluded.error_message,
      sid=excluded.sid,
      raw_response=excluded.raw_response;
  `);

  insert.run(
    record.id,
    record.timestamp,
    record.to_phone,
    record.from_phone,
    record.message_body,
    record.status,
    record.error_code ?? null,
    record.error_message ?? null,
    record.sid ?? null,
    record.raw_response ?? null
  );
}

/**
 * Logs a shared weather news report dispatch to SQLite
 */
export function logWeatherNewsDispatch(data: {
  id?: string;
  timestamp?: string;
  location_name: string;
  condition: string;
  temperature: number;
  unit: string;
  channel: string;
  recipient?: string;
  anchor_name?: string;
  headline?: string;
  report_text: string;
}) {
  const db = getSqliteDb();
  const insert = db.prepare(`
    INSERT INTO weather_news_dispatches (id, timestamp, location_name, condition, temperature, unit, channel, recipient, anchor_name, headline, report_text)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const id = data.id || `dispatch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const timestamp = data.timestamp || new Date().toISOString();

  insert.run(
    id,
    timestamp,
    data.location_name,
    data.condition,
    data.temperature,
    data.unit,
    data.channel,
    data.recipient || '',
    data.anchor_name || '',
    data.headline || '',
    data.report_text
  );
  return id;
}

/**
 * Returns database summary and row counts
 */
export function getSqliteStats() {
  const db = getSqliteDb();

  const getCount = (tableName: string): number => {
    try {
      const res = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as any;
      return res ? Number(res.count) : 0;
    } catch {
      return 0;
    }
  };

  return {
    databasePath: activeDbPath,
    initialized: true,
    tables: {
      users: getCount('users'),
      machine_nodes: getCount('machine_nodes'),
      system_config: getCount('system_config'),
      saved_locations: getCount('saved_locations'),
      saved_postal_pins: getCount('saved_postal_pins'),
      notification_settings: getCount('notification_settings'),
      twilio_messages_log: getCount('twilio_messages_log'),
      weather_news_dispatches: getCount('weather_news_dispatches'),
    },
  };
}

/**
 * Returns complete database snapshot
 */
export function getAllSqliteData() {
  const db = getSqliteDb();
  return {
    stats: getSqliteStats(),
    machine_nodes: db.prepare('SELECT * FROM machine_nodes').all(),
    users: db.prepare('SELECT * FROM users').all(),
    system_config: db.prepare('SELECT * FROM system_config').all(),
    saved_locations: db.prepare('SELECT * FROM saved_locations').all(),
    saved_postal_pins: db.prepare('SELECT * FROM saved_postal_pins').all(),
    notification_settings: db.prepare('SELECT * FROM notification_settings').all(),
    twilio_messages_log: db.prepare('SELECT * FROM twilio_messages_log ORDER BY timestamp DESC LIMIT 50').all(),
    weather_news_dispatches: db.prepare('SELECT * FROM weather_news_dispatches ORDER BY timestamp DESC LIMIT 50').all(),
  };
}
