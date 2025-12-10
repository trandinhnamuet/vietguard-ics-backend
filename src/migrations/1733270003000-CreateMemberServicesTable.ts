import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateMemberServicesTable1733270003000 implements MigrationInterface {
  name = 'CreateMemberServicesTable1733270003000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'vietguard.member_services',
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
            name: 'service_type',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'usage_limit',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'assigned_at',
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
    await queryRunner.dropTable('vietguard.member_services');
  }
}