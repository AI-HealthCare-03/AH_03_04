from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS `data_exports` (
            `id` BIGINT NOT NULL PRIMARY KEY AUTO_INCREMENT,
            `export_id` VARCHAR(50) NOT NULL UNIQUE,
            `format` VARCHAR(20) NOT NULL,
            `start_date` DATE NOT NULL,
            `end_date` DATE NOT NULL,
            `data_types` JSON NOT NULL,
            `status` VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
            `file_path` VARCHAR(500),
            `file_size_bytes` BIGINT,
            `download_count` INT NOT NULL DEFAULT 0,
            `send_email` BOOL NOT NULL DEFAULT 0,
            `password_protected` BOOL NOT NULL DEFAULT 0,
            `expires_at` DATETIME(6) NOT NULL,
            `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
            `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
            `user_id` BIGINT NOT NULL,
            CONSTRAINT `fk_data_exports_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
            INDEX `idx_data_exports_user_created` (`user_id`, `created_at`),
            INDEX `idx_data_exports_status` (`status`),
            INDEX `idx_data_exports_expires` (`expires_at`)
        ) CHARACTER SET utf8mb4;
        CREATE TABLE IF NOT EXISTS `data_export_logs` (
            `id` BIGINT NOT NULL PRIMARY KEY AUTO_INCREMENT,
            `export_id` VARCHAR(50) NOT NULL,
            `event` VARCHAR(50) NOT NULL,
            `error_message` LONGTEXT,
            `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
            INDEX `idx_data_export_logs_export_id` (`export_id`)
        ) CHARACTER SET utf8mb4;"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP TABLE IF EXISTS `data_export_logs`;
        DROP TABLE IF EXISTS `data_exports`;"""


MODELS_STATE = (
    "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"
    "7Y9h++9df/A18JIRA="
)
