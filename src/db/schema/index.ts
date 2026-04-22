import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const bookingStatusEnum = pgEnum("booking_status", [
  "pending",
  "confirmed",
  "seated",
  "completed",
  "cancelled",
  "no_show",
]);

export const waiterStatusEnum = pgEnum("waiter_status", ["new", "in_progress", "done"]);
export const tableStatusEnum = pgEnum("table_status", ["available", "reserved", "occupied", "cleaning"]);

export const zones = pgTable("zones", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tables = pgTable("tables", {
  id: serial("id").primaryKey(),
  zoneId: integer("zone_id").references(() => zones.id, { onDelete: "set null" }),
  code: varchar("code", { length: 20 }).notNull().unique(),
  seats: integer("seats").notNull(),
  status: tableStatusEnum("status").default("available").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 40 }).notNull().unique(),
  customerName: varchar("customer_name", { length: 160 }).notNull(),
  customerPhone: varchar("customer_phone", { length: 40 }).notNull(),
  bookingDate: varchar("booking_date", { length: 20 }).notNull(),
  bookingTime: varchar("booking_time", { length: 20 }).notNull(),
  guestCount: integer("guest_count").notNull(),
  zoneId: integer("zone_id").references(() => zones.id, { onDelete: "set null" }),
  tableId: integer("table_id").references(() => tables.id, { onDelete: "set null" }),
  status: bookingStatusEnum("status").default("pending").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const bookingStatusHistory = pgTable("booking_status_history", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").references(() => bookings.id, { onDelete: "cascade" }).notNull(),
  status: bookingStatusEnum("status").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const waiterRequests = pgTable("waiter_requests", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 40 }).notNull().unique(),
  tableId: integer("table_id").references(() => tables.id, { onDelete: "set null" }),
  zoneId: integer("zone_id").references(() => zones.id, { onDelete: "set null" }),
  need: varchar("need", { length: 200 }).notNull(),
  note: text("note"),
  status: waiterStatusEnum("status").default("new").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const waiterRequestEvents = pgTable("waiter_request_events", {
  id: serial("id").primaryKey(),
  waiterRequestId: integer("waiter_request_id").references(() => waiterRequests.id, { onDelete: "cascade" }).notNull(),
  status: waiterStatusEnum("status").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  slug: varchar("slug", { length: 160 }).notNull().unique(),
  category: varchar("category", { length: 120 }).notNull(),
  description: text("description"),
  priceLabel: varchar("price_label", { length: 120 }).notNull(),
  imagePath: text("image_path"),
  visible: boolean("visible").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const localeKeys = pgTable("locale_keys", {
  id: serial("id").primaryKey(),
  namespace: varchar("namespace", { length: 120 }).notNull(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  description: text("description"),
  deprecated: boolean("deprecated").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const localeTranslations = pgTable("locale_translations", {
  id: serial("id").primaryKey(),
  localeKeyId: integer("locale_key_id").references(() => localeKeys.id, { onDelete: "cascade" }).notNull(),
  locale: varchar("locale", { length: 20 }).notNull(),
  value: text("value"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const localePublishLogs = pgTable("locale_publish_logs", {
  id: serial("id").primaryKey(),
  locale: varchar("locale", { length: 20 }).notNull(),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
