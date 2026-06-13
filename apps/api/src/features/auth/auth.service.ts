import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE_PROVIDER } from '../../database/drizzle.provider';
import * as schema from '../../database/schema';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly usersService: UsersService,
    @Inject(DRIZZLE_PROVIDER)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async login(email: string, password: string, userAgent?: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Tài khoản không tồn tại hoặc đã bị vô hiệu hóa.');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Mật khẩu không chính xác.');
    }

    return this.generateTokenPair(user, userAgent);
  }

  async refresh(refreshToken: string, userAgent?: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET') || 'dev_refresh_secret_key_should_be_long_and_secure_at_least_32_characters',
      });

      const tokenHash = this.hashToken(refreshToken);
      const storedToken = await this.findRefreshToken(payload.sub, tokenHash);
      if (!storedToken) {
        throw new UnauthorizedException('Refresh token không tồn tại hoặc đã bị thu hồi.');
      }

      if (new Date() > storedToken.expiresAt) {
        await this.revokeRefreshToken(payload.sub, tokenHash);
        throw new UnauthorizedException('Refresh token đã hết hạn.');
      }

      const user = await this.usersService.findById(payload.sub);
      if (!user || !user.isActive) {
        throw new UnauthorizedException('Tài khoản không còn hoạt động.');
      }

      // Ký Access Token mới (refresh token giữ nguyên)
      const accessToken = this.jwtService.sign(
        { sub: user.id, email: user.email, role: user.role.name },
        {
          secret: this.config.get('JWT_ACCESS_SECRET') || 'dev_access_secret_key_should_be_long_and_secure_at_least_32_characters',
          expiresIn: this.config.get('JWT_ACCESS_EXPIRES') || '15m',
        },
      );

      return { accessToken, user: this.sanitizeUser(user) };
    } catch (error) {
      throw new UnauthorizedException('Refresh token không hợp lệ.');
    }
  }

  async logout(userId: string, refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    await this.revokeRefreshToken(userId, tokenHash);
  }

  private async generateTokenPair(user: any, userAgent?: string) {
    const roleName = user.role.name;
    const accessExpires = this.config.get('JWT_ACCESS_EXPIRES') || '15m';
    const refreshExpires = this.config.get('JWT_REFRESH_EXPIRES') || '7d';
    
    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, role: roleName },
      {
        secret: this.config.get('JWT_ACCESS_SECRET') || 'dev_access_secret_key_should_be_long_and_secure_at_least_32_characters',
        expiresIn: accessExpires,
      },
    );

    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      {
        secret: this.config.get('JWT_REFRESH_SECRET') || 'dev_refresh_secret_key_should_be_long_and_secure_at_least_32_characters',
        expiresIn: refreshExpires,
      },
    );

    const expiresAt = new Date(Date.now() + this.parseExpiresIn(refreshExpires));
    await this.storeRefreshToken(user.id, this.hashToken(refreshToken), expiresAt, userAgent);

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private parseExpiresIn(val: string): number {
    const match = val.match(/^(\d+)([smhd])$/);
    if (!match) {
      const num = parseInt(val, 10);
      return isNaN(num) ? 7 * 24 * 60 * 60 * 1000 : num * 1000;
    }
    const amount = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 's': return amount * 1000;
      case 'm': return amount * 60 * 1000;
      case 'h': return amount * 60 * 60 * 1000;
      case 'd': return amount * 24 * 60 * 60 * 1000;
      default: return 7 * 24 * 60 * 60 * 1000;
    }
  }

  private sanitizeUser(user: any) {
    const { password, ...safe } = user;
    return safe;
  }

  private async storeRefreshToken(userId: string, tokenHash: string, expiresAt: Date, userAgent?: string) {
    await this.db.insert(schema.refreshTokens).values({
      userId,
      tokenHash,
      userAgent,
      expiresAt,
    });
  }

  private async findRefreshToken(userId: string, tokenHash: string) {
    return this.db.query.refreshTokens.findFirst({
      where: and(
        eq(schema.refreshTokens.userId, userId),
        eq(schema.refreshTokens.tokenHash, tokenHash),
      ),
    });
  }

  private async revokeRefreshToken(userId: string, tokenHash: string) {
    await this.db.delete(schema.refreshTokens).where(
      and(
        eq(schema.refreshTokens.userId, userId),
        eq(schema.refreshTokens.tokenHash, tokenHash),
      ),
    );
  }
}
