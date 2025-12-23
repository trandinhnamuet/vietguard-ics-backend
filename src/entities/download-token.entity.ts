import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('download_tokens', { schema: 'vietguard' })
export class DownloadToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  task_id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  @Index()
  token: string;

  @Column({ type: 'timestamp' })
  expires_at: Date;

  @Column({ type: 'boolean', default: false })
  used: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
