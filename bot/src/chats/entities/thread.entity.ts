import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';
import { Chat } from './chat.entity';
import { User } from 'src/users/users.entity';

@Entity('thread')
export class Thread {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.threads)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => Chat, (chat) => chat.thread)
  chats: Chat[];

  @Column({ type: 'timestamptz', nullable: true })
  lastActivityAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
