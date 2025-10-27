CREATE TABLE `lessons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subjectId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`videoUrl` varchar(500),
	`duration` int,
	`order` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lessons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `portfolio_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('education','experience','project','social') NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`institution` varchar(255),
	`startDate` varchar(20),
	`endDate` varchar(20),
	`url` varchar(500),
	`icon` varchar(100),
	`order` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `portfolio_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `portfolio_profile` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`title` varchar(255),
	`bio` text,
	`profileImage` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `portfolio_profile_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `question_lessons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`questionId` int NOT NULL,
	`lessonId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `question_lessons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subjectId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`statement` text NOT NULL,
	`solution` text NOT NULL,
	`difficulty` enum('easy','medium','hard') DEFAULT 'medium',
	`year` int,
	`sourceUrl` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`icon` varchar(255),
	`color` varchar(7),
	`order` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subjects_id` PRIMARY KEY(`id`),
	CONSTRAINT `subjects_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `user_badges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`badgeType` varchar(50) NOT NULL,
	`earnedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_badges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`questionId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_favorites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`questionsResolved` int DEFAULT 0,
	`totalPoints` int DEFAULT 0,
	`currentStreak` int DEFAULT 0,
	`bestStreak` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_progress_id` PRIMARY KEY(`id`)
);
