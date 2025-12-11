import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFileInfoToMemberVerifications1734507600000 implements MigrationInterface {
    name = 'AddFileInfoToMemberVerifications1734507600000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "vietguard"."member_verifications" 
            ADD COLUMN "file_name" varchar(255) NULL,
            ADD COLUMN "file_size" decimal(10,2) NULL
        `);
        
        await queryRunner.query(`
            COMMENT ON COLUMN "vietguard"."member_verifications"."file_name" IS 'Original filename of uploaded file'
        `);
        
        await queryRunner.query(`
            COMMENT ON COLUMN "vietguard"."member_verifications"."file_size" IS 'File size in megabytes (MB)'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "vietguard"."member_verifications" 
            DROP COLUMN "file_name",
            DROP COLUMN "file_size"
        `);
    }
}