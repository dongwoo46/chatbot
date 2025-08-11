import { ForbiddenException, Injectable } from '@nestjs/common';
import { CreateChatDto } from './dtos/create-chat.dto';
import { Chat } from './entities/chat.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { User } from 'src/users/users.entity';
import { Thread } from './entities/thread.entity';
interface GetUserThreadsParams {
  currentUser: { id: number; role: string; email: string };
  userIds?: number[];
  sort: 'asc' | 'desc';
  page: number;
  limit: number;
}
@Injectable()
export class ChatService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Thread)
    private readonly threadRepository: Repository<Thread>,
  ) {}

  async createChat(userId: number, dto: CreateChatDto) {
    return this.dataSource.transaction(async (manager) => {
      const { question } = dto;

      // 1. 유저 락 + 30분 내 스레드 조회/생성
      const thread = await this.findOrCreateActiveThread(userId, manager);

      // 2. 기존 대화 불러오기
      const previousChats = await manager.getRepository(Chat).find({
        where: { thread: { id: thread.id } },
        order: { createdAt: 'ASC' },
      });

      // 3. 메시지 구성
      const messages = [
        { role: 'system', content: 'You are a helpful assistant.' },
      ];
      for (const chat of previousChats) {
        messages.push({ role: 'user', content: chat.question });
        messages.push({ role: 'assistant', content: chat.answer });
      }
      messages.push({ role: 'user', content: question });

      // 4. OpenAI 호출 (Mock)
      const completion = {
        choices: [
          {
            message: {
              content: `이건 임시 응답입니다. 질문: "${question}" 에 대해 GPT가 답변한 것처럼 보입니다.`,
            },
          },
        ],
      };
      const answer = completion.choices[0]?.message?.content ?? '';

      // 5. 채팅 생성
      const chat = manager.create(Chat, {
        threadId: thread.id,
        userId,
        question,
        answer,
      });
      await manager.save(chat);

      // 6. 스레드에 채팅 추가
      thread.chats.push(chat);

      // 7. 스레드 마지막 활동 시간 갱신
      thread.lastActivityAt = new Date();
      await manager.save(thread);

      return chat;
    });
  }

  // chat.service.ts 내부
  private async findOrCreateActiveThread(
    userId: number,
    manager: EntityManager,
  ) {
    const user = await manager.getRepository(User).findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new ForbiddenException('유저가 존재하지 않습니다.');
    }

    // 유저 행 락
    await manager
      .getRepository(User)
      .createQueryBuilder('user')
      .where('user.id = :userId', { userId })
      .setLock('pessimistic_write')
      .getOneOrFail();

    const cutoff = new Date(Date.now() - 30 * 60 * 1000);

    let thread = await manager
      .getRepository(Thread)
      .createQueryBuilder('thread')
      .leftJoinAndSelect('thread.chats', 'chat') // chats도 같이 조회
      .where('thread.user_id = :userId', { userId })
      .andWhere('thread.lastActivityAt >= :cutoff', { cutoff })
      .orderBy('thread.lastActivityAt', 'DESC')
      .getOne();

    if (!thread) {
      thread = manager.create(Thread, {
        user: user,
        lastActivityAt: new Date(),
        chats: [],
      });
      await manager.save(thread);
    }

    return thread;
  }

  /**
   * 스레드 목록 조회
   * - 일반 유저: 본인이 생성한 스레드만 조회
   * - 관리자: 모든 스레드 조회 가능
   * - 생성일 기준 정렬 (ASC/DESC)
   * - 페이지네이션
   */
  async getUserThreads(params: GetUserThreadsParams) {
    const { currentUser, userIds, sort, page, limit } = params;

    const qb = this.threadRepository
      .createQueryBuilder('thread')
      .leftJoin('thread.user', 'user')
      .leftJoinAndSelect('thread.chats', 'chats');

    if (userIds?.length) {
      // userIds가 지정된 경우
      if (currentUser.role === 'admin') {
        // admin이면 userIds 전체 조회 가능
        qb.where('user.id IN (:...userIds)', { userIds });
      } else {
        // admin이 아닌 경우 → userIds에 본인만 포함되어 있어야 함
        if (userIds.length !== 1 || userIds[0] !== currentUser.id) {
          throw new ForbiddenException('본인 스레드만 조회할 수 있습니다.');
        }
        qb.where('user.id = :userId', { userId: currentUser.id });
      }
    } else {
      // userIds가 없는 경우
      if (currentUser.role === 'admin') {
        // admin이면 전체 스레드 조회 (조건 없음)
      } else {
        // admin이 아니면 본인 스레드만
        qb.where('user.id = :userId', { userId: currentUser.id });
      }
    }

    qb.orderBy('thread.lastActivityAt', 'DESC')
      .addOrderBy('chats.createdAt', sort.toUpperCase() as 'ASC' | 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    return qb.getMany();
  }
}
