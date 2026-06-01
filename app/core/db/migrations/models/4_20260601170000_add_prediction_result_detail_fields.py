from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE `prediction_tasks` ADD `progress_percent` INT NOT NULL DEFAULT 0;
        ALTER TABLE `prediction_tasks` ADD `current_step` VARCHAR(100);
        ALTER TABLE `prediction_result_items` ADD `risk_factors` JSON;
        """


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE `prediction_result_items` DROP COLUMN `risk_factors`;
        ALTER TABLE `prediction_tasks` DROP COLUMN `current_step`;
        ALTER TABLE `prediction_tasks` DROP COLUMN `progress_percent`;
        """
