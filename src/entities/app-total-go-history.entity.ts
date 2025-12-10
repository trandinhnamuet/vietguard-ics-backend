import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AppTotalGoTask } from './app-total-go-task.entity';

@Entity({ schema: 'vietguard', name: 'app_total_go_history' })
export class AppTotalGoHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'task_id' })
  task_id: number;

  @Column({ length: 50, nullable: true })
  sequence: string;

  @Column({ length: 50, nullable: true })
  result: string;

  @Column({ type: 'timestamp', nullable: true })
  executed_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => AppTotalGoTask, (task) => task.history)
  @JoinColumn({ name: 'task_id' })
  task: AppTotalGoTask;
}