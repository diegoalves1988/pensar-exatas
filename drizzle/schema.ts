import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extended with additional tables for the ENEM Physics app.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Subjects/Topics table - stores physics topics (Mecânica, Eletromagnetismo, etc)
 */
export const subjects = mysqlTable("subjects", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  icon: varchar("icon", { length: 255 }), // emoji or icon name
  color: varchar("color", { length: 7 }), // hex color for gamification
  order: int("order").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subject = typeof subjects.$inferSelect;
export type InsertSubject = typeof subjects.$inferInsert;

/**
 * Questions table - stores ENEM physics questions with solutions
 */
export const questions = mysqlTable("questions", {
  id: int("id").autoincrement().primaryKey(),
  subjectId: int("subjectId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  statement: text("statement").notNull(), // question text/enunciation
  solution: text("solution").notNull(), // detailed solution
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]).default("medium"),
  year: int("year"), // ENEM year (e.g., 2023)
  sourceUrl: varchar("sourceUrl", { length: 500 }), // link to original source
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Question = typeof questions.$inferSelect;
export type InsertQuestion = typeof questions.$inferInsert;

/**
 * Lessons table - stores educational content links (YouTube videos, articles, etc)
 */
export const lessons = mysqlTable("lessons", {
  id: int("id").autoincrement().primaryKey(),
  subjectId: int("subjectId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  videoUrl: varchar("videoUrl", { length: 500 }), // YouTube or similar
  duration: int("duration"), // in minutes
  order: int("order").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Lesson = typeof lessons.$inferSelect;
export type InsertLesson = typeof lessons.$inferInsert;

/**
 * Question-Lesson relationship table - links questions to related lessons
 */
export const questionLessons = mysqlTable("question_lessons", {
  id: int("id").autoincrement().primaryKey(),
  questionId: int("questionId").notNull(),
  lessonId: int("lessonId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QuestionLesson = typeof questionLessons.$inferSelect;
export type InsertQuestionLesson = typeof questionLessons.$inferInsert;

/**
 * User Progress table - tracks user achievements, points, and badges
 */
export const userProgress = mysqlTable("user_progress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  questionsResolved: int("questionsResolved").default(0),
  totalPoints: int("totalPoints").default(0),
  currentStreak: int("currentStreak").default(0),
  bestStreak: int("bestStreak").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserProgress = typeof userProgress.$inferSelect;
export type InsertUserProgress = typeof userProgress.$inferInsert;

/**
 * User Badges table - tracks earned badges and achievements
 */
export const userBadges = mysqlTable("user_badges", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  badgeType: varchar("badgeType", { length: 50 }).notNull(), // e.g., "first_question", "10_questions", "100_questions"
  earnedAt: timestamp("earnedAt").defaultNow().notNull(),
});

export type UserBadge = typeof userBadges.$inferSelect;
export type InsertUserBadge = typeof userBadges.$inferInsert;

/**
 * User Favorites table - tracks user's favorite questions
 */
export const userFavorites = mysqlTable("user_favorites", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  questionId: int("questionId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserFavorite = typeof userFavorites.$inferSelect;
export type InsertUserFavorite = typeof userFavorites.$inferInsert;

/**
 * Portfolio Items table - stores professional portfolio information
 */
export const portfolioItems = mysqlTable("portfolio_items", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["education", "experience", "project", "social"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  institution: varchar("institution", { length: 255 }), // school, company, etc
  startDate: varchar("startDate", { length: 20 }), // YYYY-MM format
  endDate: varchar("endDate", { length: 20 }), // YYYY-MM format or null for ongoing
  url: varchar("url", { length: 500 }), // link to project, social profile, etc
  icon: varchar("icon", { length: 100 }), // emoji or icon name
  order: int("order").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PortfolioItem = typeof portfolioItems.$inferSelect;
export type InsertPortfolioItem = typeof portfolioItems.$inferInsert;

/**
 * Portfolio Profile table - stores general portfolio information
 */
export const portfolioProfile = mysqlTable("portfolio_profile", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }), // e.g., "Physics Teacher & Content Creator"
  bio: text("bio"),
  profileImage: varchar("profileImage", { length: 500 }), // image URL
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PortfolioProfile = typeof portfolioProfile.$inferSelect;
export type InsertPortfolioProfile = typeof portfolioProfile.$inferInsert;

