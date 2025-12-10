import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateDemoTable1701582000000 implements MigrationInterface {
  name = 'CreateDemoTable1701582000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Create demo table with various column types in vietguard schema
    await queryRunner.createTable(
      new Table({
        name: 'vietguard.demo_table',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'age',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
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
        indices: [
          {
            name: 'IDX_DEMO_EMAIL',
            columnNames: ['email'],
          },
          {
            name: 'IDX_DEMO_ACTIVE',
            columnNames: ['is_active'],
          },
        ],
      }),
      true,
    );

    // Insert some demo data
    await queryRunner.query(`
      INSERT INTO vietguard.demo_table (title, description, email, age, metadata) VALUES
      ('Demo User 1', 'This is a demo user for testing', 'demo1@example.com', 25, '{"role": "user", "preferences": {"theme": "dark"}}'),
      ('Demo Admin', 'Admin user for testing', 'admin@example.com', 30, '{"role": "admin", "permissions": ["read", "write", "delete"]}'),
      ('Test User', 'Another test user', 'test@example.com', 28, '{"role": "user", "preferences": {"theme": "light", "language": "en"}}')
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('vietguard.demo_table');
  }
}