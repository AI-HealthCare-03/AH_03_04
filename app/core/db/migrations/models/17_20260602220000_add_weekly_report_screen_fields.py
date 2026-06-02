from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE `weekly_reports`
            ADD COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE' AFTER `week_end_date`,
            ADD COLUMN `summary_cards` JSON AFTER `source_summary`,
            ADD COLUMN `metric_summaries` JSON AFTER `summary_cards`,
            ADD COLUMN `trend_summary` JSON AFTER `metric_summaries`,
            ADD COLUMN `challenge_summary` JSON AFTER `trend_summary`;
        UPDATE `weekly_reports`
            SET
                `summary_cards` = COALESCE(`summary_cards`, JSON_ARRAY()),
                `metric_summaries` = COALESCE(`metric_summaries`, JSON_ARRAY()),
                `trend_summary` = JSON_OBJECT(
                    'status', 'UNAVAILABLE',
                    'message', '전주 리포트가 없어 추이 비교는 제공하지 않습니다.',
                    'previous_week_report_id', NULL
                ),
                `challenge_summary` = JSON_OBJECT(
                    'checkin_count', 0,
                    'completion_rate', 0.0,
                    'status', 'UNAVAILABLE',
                    'message', '이번 주 챌린지 체크인이 없습니다.'
                )
            WHERE `summary_cards` IS NULL
               OR `metric_summaries` IS NULL
               OR `trend_summary` IS NULL
               OR `challenge_summary` IS NULL;
        ALTER TABLE `weekly_reports`
            MODIFY COLUMN `summary_cards` JSON NOT NULL,
            MODIFY COLUMN `metric_summaries` JSON NOT NULL,
            MODIFY COLUMN `trend_summary` JSON NOT NULL,
            MODIFY COLUMN `challenge_summary` JSON NOT NULL;
        """


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE `weekly_reports`
            DROP COLUMN `challenge_summary`,
            DROP COLUMN `trend_summary`,
            DROP COLUMN `metric_summaries`,
            DROP COLUMN `summary_cards`,
            DROP COLUMN `status`;
        """
