import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Member } from './member.entity';

@Entity({ schema: 'vietguard', name: 'member_verifications' })
export class MemberVerification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'member_id' })
  member_id: number;

  @Column({ length: 6 })
  otp: string;

  @Column({ default: false })
  otp_verified: boolean;

  @Column({ length: 255, nullable: true })
  full_name: string;

  @Column({ length: 255, nullable: true })
  company_name: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ name: 'otp_expires_at', type: 'timestamp', nullable: true })
  otp_expires_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Member, (member) => member.verifications)
  @JoinColumn({ name: 'member_id' })
  member: Member;
}