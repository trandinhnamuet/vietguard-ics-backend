import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateDownloadTokensTable1735023600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'vietguard.download_tokens',
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
            type: 'varchar',
            length: '255',
          },
          {
            name: 'token',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'expires_at',
            type: 'timestamp',
          },
          {
            name: 'used',
            type: 'boolean',
            default: false,
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
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'vietguard.download_tokens',
      new TableIndex({
        name: 'IDX_download_tokens_task_id',
        columnNames: ['task_id'],
      }),
    );

    await queryRunner.createIndex(
      'vietguard.download_tokens',
      new TableIndex({
        name: 'IDX_download_tokens_token',
        columnNames: ['token'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('vietguard.download_tokens');
  }
}
