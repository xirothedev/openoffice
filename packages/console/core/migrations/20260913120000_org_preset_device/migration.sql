CREATE TABLE `preset` (
	`id` varchar(30) NOT NULL,
	`workspace_id` varchar(30) NOT NULL,
	`time_created` timestamp(3) NOT NULL DEFAULT (now()),
	`time_updated` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`time_deleted` timestamp(3),
	`model` varchar(255),
	`key_ref` varchar(255),
	`allowed_folders` json,
	`auto_update` boolean,
	`capabilities` json,
	CONSTRAINT PRIMARY KEY(`workspace_id`,`id`),
	CONSTRAINT `preset_workspace` UNIQUE INDEX(`workspace_id`)
);
--> statement-breakpoint
CREATE TABLE `device` (
	`id` varchar(30) NOT NULL,
	`workspace_id` varchar(30) NOT NULL,
	`time_created` timestamp(3) NOT NULL DEFAULT (now()),
	`time_updated` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`time_deleted` timestamp(3),
	`device_id` varchar(64) NOT NULL,
	`user_id` varchar(30) NOT NULL,
	`last_seen` timestamp(3) NOT NULL DEFAULT (now()),
	`app_version` varchar(32),
	CONSTRAINT PRIMARY KEY(`workspace_id`,`id`),
	CONSTRAINT `device_workspace_device` UNIQUE INDEX(`workspace_id`,`device_id`)
);
