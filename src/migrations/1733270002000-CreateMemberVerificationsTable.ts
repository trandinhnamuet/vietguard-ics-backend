import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreateMemberVerificationsTable1733270002000 implements MigrationInterface {
  name = 'CreateMemberVerificationsTable1733270002000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'vietguard.member_verifications',
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
            name: 'otp',
            type: 'varchar',
            length: '6',
            isNullable: false,
          },
          {
            name: 'otp_verified',
            type: 'boolean',
            default: false,
          },
          {
            name: 'full_name',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'company_name',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'note',
            type: 'text',
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
    await queryRunner.dropTable('vietguard.member_verifications');
  }
}