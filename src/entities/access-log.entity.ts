import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('access_logs', { schema: 'vietguard' })
export class AccessLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 45, nullable: true })
  @Index()
  ipv4: string | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  @Index()
  ipv6: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Index()
  email: string | null;

  @Column({ type: 'int', default: 1 })
  access_count: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  last_access_time: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
