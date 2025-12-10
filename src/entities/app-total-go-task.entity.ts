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
import { Member } from './member.entity';
import { AppTotalGoHistory } from './app-total-go-history.entity';

@Entity({ schema: 'vietguard', name: 'app_total_go_tasks' })
export class AppTotalGoTask {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'member_id' })
  member_id: number;

  @Column({ length: 255, nullable: true })
  external_task_id: string;

  @Column({ length: 255, nullable: true })
  file_name: string;

  @Column({ length: 50, nullable: true })
  status: string;

  @Column({ length: 255, nullable: true })
  result_url: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @ManyToOne(() => Member, (member) => member.tasks)
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @OneToMany(() => AppTotalGoHistory, (history) => history.task)
  history: AppTotalGoHistory[];
}