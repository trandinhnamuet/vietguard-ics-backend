import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddOtpExpiresAtToMemberVerifications1733344800000 implements MigrationInterface {
  name = 'AddOtpExpiresAtToMemberVerifications1733344800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'vietguard.member_verifications',
      new TableColumn({
        name: 'otp_expires_at',
        type: 'timestamp',
        isNullable: true,
        comment: 'OTP expiration time (10 minutes after creation)',
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('vietguard.member_verifications', 'otp_expires_at');
  }
}
