import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateAccessLogsTable1735024800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'vietguard.access_logs',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'ipv4',
            type: 'varchar',
            length: '45',
            isNullable: true,
          },
          {
            name: 'ipv6',
            type: 'varchar',
            length: '45',
            isNullable: true,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'access_count',
            type: 'int',
            default: 1,
          },
          {
            name: 'last_access_time',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
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
      'vietguard.access_logs',
      new TableIndex({
        name: 'IDX_access_logs_ipv4',
        columnNames: ['ipv4'],
      }),
    );

    await queryRunner.createIndex(
      'vietguard.access_logs',
      new TableIndex({
        name: 'IDX_access_logs_ipv6',
        columnNames: ['ipv6'],
      }),
    );

    await queryRunner.createIndex(
      'vietguard.access_logs',
      new TableIndex({
        name: 'IDX_access_logs_email',
        columnNames: ['email'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('vietguard.access_logs');
  }
}
