import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateVietguardSchema1701581000000 implements MigrationInterface {
  name = 'CreateVietguardSchema1701581000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Create vietguard schema
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "vietguard"`);
    
    // Set default search_path to include vietguard schema first
    await queryRunner.query(`ALTER DATABASE ${queryRunner.connection.driver.database} SET search_path TO vietguard, "public"`);
    
    console.log('Created vietguard schema successfully');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Reset search_path to default
    await queryRunner.query(`ALTER DATABASE ${queryRunner.connection.driver.database} SET search_path TO "public"`);
    
    // Drop vietguard schema (cascade will drop all objects in the schema)
    await queryRunner.query(`DROP SCHEMA IF EXISTS "vietguard" CASCADE`);
    
    console.log('Dropped vietguard schema successfully');
  }
}