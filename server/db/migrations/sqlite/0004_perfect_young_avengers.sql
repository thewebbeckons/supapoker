CREATE TABLE `guest_room_ownerships` (
	`user_id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `guest_room_ownerships_room_id_idx` ON `guest_room_ownerships` (`room_id`);--> statement-breakpoint
ALTER TABLE `profiles` ADD `last_active_at` integer;--> statement-breakpoint
ALTER TABLE `user` ADD `isAnonymous` integer DEFAULT false;