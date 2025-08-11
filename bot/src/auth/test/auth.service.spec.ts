import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { UsersService } from 'src/users/users.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            updateRefreshToken: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => defaultValue),
            getOrThrow: jest.fn((key: string) => `${key}_VALUE`),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
  });

  describe('validateUser', () => {
    it('이메일이 존재하지 않으면 UnauthorizedException', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.validateUser('test@test.com', '1234'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('비밀번호가 일치하지 않으면 UnauthorizedException', async () => {
      usersService.findByEmail.mockResolvedValue({ password: 'hashed' } as any);
      jest.spyOn(bcrypt, 'compare').mockImplementation(async () => false);

      await expect(
        service.validateUser('test@test.com', 'wrong'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('정상적인 유저면 user 반환', async () => {
      const user = { id: 1, email: 'test@test.com', password: 'hashed' };
      usersService.findByEmail.mockResolvedValue(user as any);
      jest.spyOn(bcrypt, 'compare').mockImplementation(async () => true);

      const result = await service.validateUser(user.email, '1234');
      expect(result).toEqual(user);
    });
  });

  describe('getTokens', () => {
    it('accessToken, refreshToken 반환', () => {
      jwtService.sign
        .mockReturnValueOnce('access_token')
        .mockReturnValueOnce('refresh_token');

      const tokens = service.getTokens(1, 'test@test.com', 'user');
      expect(tokens).toEqual({
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      });
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
    });
  });

  describe('login', () => {
    it('로그인 성공 시 토큰 발급 및 refresh 토큰 저장', async () => {
      const user = {
        id: 1,
        email: 'test@test.com',
        password: 'hashed',
        role: 'user',
      };
      jest.spyOn(service, 'validateUser').mockResolvedValue(user as any);
      jest.spyOn(service, 'getTokens').mockReturnValue({
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      });

      await service.login({ email: user.email, password: '1234' });

      expect(service.validateUser).toHaveBeenCalled();
      expect(usersService.updateRefreshToken).toHaveBeenCalledWith(
        user.id,
        'refresh_token',
      );
    });
  });

  describe('refresh', () => {
    it('유저 없음 → UnauthorizedException', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      await expect(service.refresh('1', 'token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('refreshToken 불일치 → UnauthorizedException', async () => {
      const user = { refreshToken: 'hashed' };
      usersService.findByEmail.mockResolvedValue(user as any);
      jest.spyOn(bcrypt, 'compare').mockImplementation(async () => false);
      await expect(service.refresh('1', 'wrong')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('정상 → 토큰 재발급 및 저장', async () => {
      const user = {
        id: 1,
        email: 'test@test.com',
        role: 'user',
        refreshToken: 'hashed',
      };
      usersService.findByEmail.mockResolvedValue(user as any);
      jest.spyOn(bcrypt, 'compare').mockImplementation(async () => true);
      jest.spyOn(service, 'getTokens').mockReturnValue({
        accessToken: 'new_access',
        refreshToken: 'new_refresh',
      });

      const tokens = await service.refresh('1', 'refresh');
      expect(tokens.accessToken).toBe('new_access');
      expect(usersService.updateRefreshToken).toHaveBeenCalledWith(
        user.id,
        'new_refresh',
      );
    });
  });

  describe('logout', () => {
    it('refresh 토큰 null로 업데이트', async () => {
      await service.logout(1);
      expect(usersService.updateRefreshToken).toHaveBeenCalledWith(1, null);
    });
  });

  describe('generateAccessToken', () => {
    it('단일 accessToken 발급', async () => {
      jwtService.sign.mockReturnValue('access_token');
      const token = await service.generateAccessToken(
        1,
        'test@test.com',
        'user',
      );
      expect(token).toBe('access_token');
    });
  });
});
