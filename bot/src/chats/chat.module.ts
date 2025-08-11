import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
// import { ThreadService } from './thread.service';
import { Chat } from './entities/chat.entity';
import { Thread } from './entities/thread.entity';
import { User } from '../users/users.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Chat, Thread, User])],
  // controllers: [ChatController],
  // providers: [ChatService, ThreadService],
  // exports: [ChatService, ThreadService],
})
export class ChatModule {}
