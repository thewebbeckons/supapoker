CREATE TABLE `story_expected_voters` (
	`story_id` text NOT NULL,
	`user_id` text NOT NULL,
	`added_at` integer NOT NULL,
	PRIMARY KEY(`story_id`, `user_id`),
	FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `stories` ADD `voting_opened_at` integer;--> statement-breakpoint
ALTER TABLE `stories` ADD `voting_deadline_at` integer;--> statement-breakpoint
ALTER TABLE `stories` ADD `needs_resolution` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `stories_room_status_idx` ON `stories` (`room_id`,`status`);--> statement-breakpoint
CREATE INDEX `stories_deadline_idx` ON `stories` (`voting_deadline_at`);