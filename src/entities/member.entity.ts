import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Dealer } from './dealer.entity';
import { MemberVerification } from './member-verification.entity';
import { MemberService } from './member-service.entity';
import { AppTotalGoTask } from './app-total-go-task.entity';

@Entity({ schema: 'vietguard', name: 'members' })
export class Member {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255, unique: true })
  name: string; // email duy nhất

  @Column({ length: 255 })
  email: string;

  @Column({ name: 'dealer_id', nullable: true })
  dealer_id: number;

  @Column({ length: 255, nullable: true })
  external_id: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Dealer, (dealer) => dealer.members)
  @JoinColumn({ name: 'dealer_id' })
  dealer: Dealer;

  @OneToMany(() => MemberVerification, (verification) => verification.member)
  verifications: MemberVerification[];

  @OneToMany(() => MemberService, (service) => service.member)
  services: MemberService[];

  @OneToMany(() => AppTotalGoTask, (task) => task.member)
  tasks: AppTotalGoTask[];
}