import { Thread } from 'src/chats/entities/thread.entity';
import { Chat } from 'src/chats/entities/chat.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  refreshToken: string | null;

  @Column({ type: 'varchar', length: 20, default: 'member' })
  role: 'member' | 'admin';

  // 유저 → 스레드 (1:N)
  @OneToMany(() => Thread, (thread) => thread.user)
  threads: Thread[];

  // 유저 → 채팅 (1:N)
  @OneToMany(() => Chat, (chat) => chat.user)
  chats: Chat[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
