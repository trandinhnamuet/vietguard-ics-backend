import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateAppTotalGoHistoryTable1733270005000 implements MigrationInterface {
  name = 'CreateAppTotalGoHistoryTable1733270005000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'vietguard.app_total_go_history',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'task_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'sequence',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'result',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'executed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['task_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'vietguard.app_total_go_tasks',
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('vietguard.app_total_go_history');
  }
}