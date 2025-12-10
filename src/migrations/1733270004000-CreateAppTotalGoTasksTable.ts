import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateAppTotalGoTasksTable1733270004000 implements MigrationInterface {
  name = 'CreateAppTotalGoTasksTable1733270004000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'vietguard.app_total_go_tasks',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'member_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'external_task_id',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'file_name',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'result_url',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['member_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'vietguard.members',
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('vietguard.app_total_go_tasks');
  }
}