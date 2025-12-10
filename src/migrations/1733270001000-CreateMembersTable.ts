import { MigrationInterface, QueryRunner, Table, Index, TableIndex } from 'typeorm';

export class CreateMembersTable1733270001000 implements MigrationInterface {
  name = 'CreateMembersTable1733270001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'vietguard.members',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'dealer_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'external_id',
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
        ],
        foreignKeys: [
          {
            columnNames: ['dealer_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'vietguard.dealers',
            onDelete: 'SET NULL',
          },
        ],
      }),
      true,
    );

      await queryRunner.createIndex(
        'vietguard.members',
        new TableIndex({
          name: 'IDX_MEMBER_NAME',
          columnNames: ['name'],
        }),
      );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('vietguard.members');
  }
}