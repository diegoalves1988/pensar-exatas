import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { 
  InsertUser, 
  users, 
  subjects, 
  questions, 
  lessons, 
  questionLessons,
  userProgress,
  userBadges,
  userFavorites,
  portfolioItems,
  portfolioProfile,
  type Subject,
  type Question,
  type Lesson,
  type UserProgress,
  type UserBadge,
  type PortfolioItem,
  type PortfolioProfile,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let _client: ReturnType<typeof postgres> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // Ensure sslmode=require for Supabase if not provided
      const raw = process.env.DATABASE_URL;
      const conn = raw!.includes("sslmode=")
        ? raw!
        : raw!.includes("?")
          ? `${raw}&sslmode=require`
          : `${raw}?sslmode=require`;
      _client = postgres(conn);
      _db = drizzle(_client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
      _client = null;
    }
  }
  return _db;
}

// ============= USER FUNCTIONS =============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod", "passwordHash"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function closeDb() {
  if (_client) {
    await _client.end();
    _client = null;
    _db = null;
  }
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============= SUBJECT FUNCTIONS =============

export async function getAllSubjects(): Promise<Subject[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subjects).orderBy(subjects.order);
}

export async function getSubjectById(id: number): Promise<Subject | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(subjects).where(eq(subjects.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createSubject(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(subjects).values(data);
  return result;
}

export async function updateSubject(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(subjects).set(data).where(eq(subjects.id, id));
}

export async function deleteSubject(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(subjects).where(eq(subjects.id, id));
}

// ============= QUESTION FUNCTIONS =============

export async function getQuestionsBySubject(subjectId: number): Promise<Question[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(questions).where(eq(questions.subjectId, subjectId));
}

export async function getQuestionById(id: number): Promise<Question | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(questions).where(eq(questions.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllQuestions(): Promise<Question[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(questions);
}

export async function createQuestion(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(questions).values(data);
  return result;
}

export async function updateQuestion(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(questions).set(data).where(eq(questions.id, id));
}

export async function deleteQuestion(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(questions).where(eq(questions.id, id));
}

// ============= LESSON FUNCTIONS =============

export async function getLessonsBySubject(subjectId: number): Promise<Lesson[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lessons).where(eq(lessons.subjectId, subjectId)).orderBy(lessons.order);
}

export async function getLessonById(id: number): Promise<Lesson | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(lessons).where(eq(lessons.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createLesson(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(lessons).values(data);
}

export async function updateLesson(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(lessons).set(data).where(eq(lessons.id, id));
}

export async function deleteLesson(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(lessons).where(eq(lessons.id, id));
}

// ============= QUESTION-LESSON RELATIONSHIP FUNCTIONS =============

export async function getLessonsByQuestion(questionId: number): Promise<Lesson[]> {
  const db = await getDb();
  if (!db) return [];
  
  const ql = await db.select().from(questionLessons).where(eq(questionLessons.questionId, questionId));
  const lessonIds = ql.map(item => item.lessonId);
  
  if (lessonIds.length === 0) return [];
  
  return db.select().from(lessons).where(eq(lessons.id, lessonIds[0]));
}

export async function linkQuestionToLesson(questionId: number, lessonId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(questionLessons).values({ questionId, lessonId });
}

// ============= USER PROGRESS FUNCTIONS =============

export async function getUserProgress(userId: number): Promise<UserProgress | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(userProgress).where(eq(userProgress.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function initializeUserProgress(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(userProgress).values({ userId });
}

export async function updateUserProgress(userId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(userProgress).set(data).where(eq(userProgress.userId, userId));
}

// ============= USER BADGE FUNCTIONS =============

export async function getUserBadges(userId: number): Promise<UserBadge[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userBadges).where(eq(userBadges.userId, userId));
}

export async function awardBadge(userId: number, badgeType: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(userBadges).values({ userId, badgeType });
}

// ============= USER FAVORITES FUNCTIONS =============

export async function getUserFavorites(userId: number): Promise<Question[]> {
  const db = await getDb();
  if (!db) return [];
  
  const favorites = await db.select().from(userFavorites).where(eq(userFavorites.userId, userId));
  const questionIds = favorites.map(f => f.questionId);
  
  if (questionIds.length === 0) return [];
  
  return db.select().from(questions).where(eq(questions.id, questionIds[0]));
}

export async function addFavorite(userId: number, questionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(userFavorites).values({ userId, questionId });
}

export async function removeFavorite(userId: number, questionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(userFavorites).where(and(eq(userFavorites.userId, userId), eq(userFavorites.questionId, questionId)));
}

// ============= PORTFOLIO FUNCTIONS =============

export async function getPortfolioProfile(): Promise<PortfolioProfile | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(portfolioProfile).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updatePortfolioProfile(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getPortfolioProfile();
  if (existing) {
    return db.update(portfolioProfile).set(data).where(eq(portfolioProfile.id, existing.id));
  } else {
    return db.insert(portfolioProfile).values(data);
  }
}

export async function getPortfolioItems(): Promise<PortfolioItem[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(portfolioItems).orderBy(portfolioItems.order);
}

export async function getPortfolioItemsByType(type: string): Promise<PortfolioItem[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(portfolioItems).where(eq(portfolioItems.type, type as any)).orderBy(portfolioItems.order);
}

export async function createPortfolioItem(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(portfolioItems).values(data);
}

export async function updatePortfolioItem(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(portfolioItems).set(data).where(eq(portfolioItems.id, id));
}

export async function deletePortfolioItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(portfolioItems).where(eq(portfolioItems.id, id));
}

