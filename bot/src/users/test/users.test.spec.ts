import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { ConflictException } from '@nestjs/common';
import { UsersService } from '../users.service';
import { User } from '../users.entity';
import { CreateUserDto } from '../dtos/create-user.dto';

const mockUserRepository = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
});

describe('UsersService', () => {
  let service: UsersService;
  let repo: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useFactory: mockUserRepository },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repo = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('이메일이 이미 존재하면 ConflictException', async () => {
      repo.findOne.mockResolvedValue({ id: 1 } as User);

      await expect(
        service.create({
          email: 'test@test.com',
          password: '1234',
          name: '테스트 유저',
          role: 'admin', // CreateUserDto에 정의된 필드
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('비밀번호를 해시 후 저장', async () => {
      repo.findOne.mockResolvedValue(null);

      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed_pw' as never);

      // DTO 필드 전부 채워서 타입 맞추기
      const userData: CreateUserDto = {
        email: 'test@test.com',
        password: '1234',
        name: '테스트 유저',
        role: 'admin',
      };

      const createdUser = { ...userData, password: 'hashed_pw' } as User;

      repo.create.mockReturnValue(createdUser);
      repo.save.mockResolvedValue(createdUser);

      const result = await service.create(userData);

      expect(bcrypt.hash).toHaveBeenCalledWith('1234', 10);
      expect(repo.create).toHaveBeenCalledWith({
        ...userData,
        password: 'hashed_pw',
      });
      expect(repo.save).toHaveBeenCalledWith(createdUser);
      expect(result).toEqual(createdUser);
    });
  });

  describe('findByEmail', () => {
    it('이메일로 유저 조회', async () => {
      const user = { id: 1, email: 'test@test.com' } as User;
      repo.findOne.mockResolvedValue(user);

      const result = await service.findByEmail('test@test.com');
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { email: 'test@test.com' },
      });
      expect(result).toEqual(user);
    });
  });

  describe('findById', () => {
    it('ID로 유저 조회', async () => {
      const user = { id: 1, email: 'test@test.com' } as User;
      repo.findOne.mockResolvedValue(user);

      const result = await service.findById(1);
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(user);
    });
  });

  describe('updateRefreshToken', () => {
    it('refreshToken이 있으면 해시 후 저장', async () => {
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed_token' as never);

      await service.updateRefreshToken(1, 'refresh_token');

      expect(bcrypt.hash).toHaveBeenCalledWith('refresh_token', 10);
      expect(repo.update).toHaveBeenCalledWith(1, {
        refreshToken: 'hashed_token',
      });
    });

    it('refreshToken이 null이면 null 저장', async () => {
      await service.updateRefreshToken(1, null);

      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(repo.update).toHaveBeenCalledWith(1, {
        refreshToken: null,
      });
    });
  });
});
