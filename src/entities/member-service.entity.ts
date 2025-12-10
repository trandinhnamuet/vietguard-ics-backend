import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Member } from './member.entity';

@Entity({ schema: 'vietguard', name: 'member_services' })
export class MemberService {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'member_id' })
  member_id: number;

  @Column()
  service_type: number;

  @Column({ nullable: true })
  usage_limit: number;

  @CreateDateColumn()
  assigned_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Member, (member) => member.services)
  @JoinColumn({ name: 'member_id' })
  member: Member;
}