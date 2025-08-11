import { Controller, Post, Body, Get, Param, Req, Query } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dtos/create-chat.dto';
import { GetUserThreadsQuery } from './dtos/get-user-threads.dto';

@Controller({ path: 'chats', version: '1' })
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // 채팅 생성
  @Post()
  async createChat(@Req() req, @Body() createChatDto: CreateChatDto) {
    const userId = req.user.id; // 인증 미들웨어에서 주입된 유저 ID
    return this.chatService.createChat(userId, createChatDto);
  }

  // 사용자 스레드 조회
  @Get('threads')
  async getUserThreads(@Req() req: any, @Query() query: GetUserThreadsQuery) {
    const userIds = query.userIds
      ? query.userIds
          .split(',')
          .map((id) => Number(id.trim()))
          .filter((id) => !isNaN(id))
      : [];

    return this.chatService.getUserThreads({
      currentUser: req.user,
      userIds: userIds,
      sort: query.sort ?? 'desc',
      page: query.page ?? 1,
      limit: query.limit ?? 10,
    });
  }
}
