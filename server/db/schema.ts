import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const user = sqliteTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: integer("emailVerified", { mode: "boolean" }).notNull().default(false),
    isAnonymous: integer("isAnonymous", { mode: "boolean" }).default(false),
    image: text("image"),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  },
  table => ({
    emailIdx: uniqueIndex("user_email_idx").on(table.email),
  }),
);

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
    token: text("token").notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  },
  table => ({
    tokenIdx: uniqueIndex("session_token_idx").on(table.token),
    userIdIdx: index("session_userId_idx").on(table.userId),
  }),
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: integer("accessTokenExpiresAt", { mode: "timestamp" }),
    refreshTokenExpiresAt: integer("refreshTokenExpiresAt", { mode: "timestamp" }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  },
  table => ({
    providerAccountIdx: uniqueIndex("account_providerId_accountId_idx").on(table.providerId, table.accountId),
    userIdIdx: index("account_userId_idx").on(table.userId),
  }),
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  },
  table => ({
    identifierIdx: index("verification_identifier_idx").on(table.identifier),
  }),
);

export const rateLimit = sqliteTable(
  "rateLimit",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull(),
    count: integer("count").notNull(),
    lastRequest: integer("lastRequest").notNull(),
  },
  table => ({
    keyIdx: uniqueIndex("rate_limit_key_idx").on(table.key),
  }),
);

export const profiles = sqliteTable("profiles", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  avatarPath: text("avatar_path"),
  lastActiveAt: integer("last_active_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const rooms = sqliteTable("rooms", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  adminUserId: text("admin_user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  mode: text("mode", { enum: ["realtime", "async"] }).notNull().default("realtime"),
  cardDeckId: text("card_deck_id", {
    enum: ["modified-fibonacci", "fibonacci", "t-shirt", "effort", "powers-of-two", "linear", "custom"],
  }).notNull().default("modified-fibonacci"),
  cardValues: text("card_values").notNull().default('["0","0.5","1","2","3","5","8","13","20","40","100","?","☕"]'),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const roomParticipants = sqliteTable(
  "room_participants",
  {
    roomId: text("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    joinedAt: integer("joined_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  },
  table => ({
    pk: primaryKey({ columns: [table.roomId, table.userId] }),
  }),
);

export const guestRoomOwnerships = sqliteTable(
  "guest_room_ownerships",
  {
    userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
    roomId: text("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  },
  table => ({
    roomIdIdx: uniqueIndex("guest_room_ownerships_room_id_idx").on(table.roomId),
  }),
);

export const stories = sqliteTable(
  "stories",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    status: text("status", { enum: ["pending", "active", "voting", "voted", "completed"] }).notNull().default("pending"),
    sortOrder: integer("sort_order").notNull().default(0),
    finalEstimate: real("final_estimate"),
    // The raw card the team settled on. Non-numeric decks (t-shirt, effort) have
    // no meaningful `final_estimate`, so the label is the only faithful record.
    finalEstimateLabel: text("final_estimate_label"),
    finalEstimateSource: text("final_estimate_source", {
      enum: ["consensus", "manual", "average"],
    }),
    voteAverage: real("vote_average"),
    voteCount: integer("vote_count").notNull().default(0),
    votingOpenedAt: integer("voting_opened_at", { mode: "timestamp" }),
    votingDeadlineAt: integer("voting_deadline_at", { mode: "timestamp" }),
    // A flag rather than a `status` value on purpose: the realtime wire protocol
    // rejects any unknown status and silently drops the whole snapshot, which
    // would freeze every browser tab open across the deploy.
    needsResolution: integer("needs_resolution", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  },
  table => ({
    roomIdIdx: index("stories_room_id_idx").on(table.roomId),
    roomStatusIdx: index("stories_room_status_idx").on(table.roomId, table.status),
    deadlineIdx: index("stories_deadline_idx").on(table.votingDeadlineAt),
  }),
);

/**
 * Who must vote before an async story closes, snapshotted from the participant
 * roster when voting opens. Kept in D1 rather than the Durable Object because
 * the DO wipes its own storage when a room is deleted, and because the
 * denominator must not drift as people join later.
 */
export const storyExpectedVoters = sqliteTable(
  "story_expected_voters",
  {
    storyId: text("story_id").notNull().references(() => stories.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    addedAt: integer("added_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  },
  table => ({
    pk: primaryKey({ columns: [table.storyId, table.userId] }),
  }),
);

export const storyVoteSnapshots = sqliteTable(
  "story_vote_snapshots",
  {
    storyId: text("story_id").notNull().references(() => stories.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    voteValue: text("vote_value").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  },
  table => ({
    pk: primaryKey({ columns: [table.storyId, table.userId] }),
  }),
);
