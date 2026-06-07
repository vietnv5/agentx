import { Controller, Post, Body, Req, Res, UseGuards, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { Response, Request as ExpressRequest } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập vào hệ thống và nhận access token' })
  @ApiResponse({ status: 200, description: 'Đăng nhập thành công' })
  @ApiResponse({ status: 401, description: 'Email hoặc mật khẩu không chính xác' })
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userAgent = req.headers['user-agent'];
    const { accessToken, refreshToken, user } = await this.authService.login(
      loginDto.email,
      loginDto.password,
      userAgent,
    );

    // Gán refresh token vào HTTP-Only Cookie — path '/' để middleware Next.js đọc được khi navigate
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
    });

    return { accessToken, refreshToken, user };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Làm mới access token bằng refresh token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refreshToken: {
          type: 'string',
          description: 'Refresh token nhận được sau khi đăng nhập (có thể bỏ trống nếu dùng cookie hoặc Bearer header)',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Làm mới token thành công' })
  @ApiResponse({ status: 401, description: 'Refresh token không hợp lệ hoặc hết hạn' })
  async refresh(
    @Req() req: ExpressRequest,
    @Body('refreshToken') bodyToken?: string,
  ) {
    let refreshToken = bodyToken;

    // 1. Check Authorization Header (Bearer)
    if (!refreshToken) {
      const authHeader = req.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        refreshToken = authHeader.substring(7);
      }
    }

    // 2. Check Custom Header
    if (!refreshToken) {
      const xRefreshToken = req.headers['x-refresh-token'];
      if (typeof xRefreshToken === 'string') {
        refreshToken = xRefreshToken;
      }
    }

    // 3. Check Cookie fallback
    if (!refreshToken) {
      refreshToken = req.cookies?.['refreshToken'];
    }

    if (!refreshToken) {
      throw new UnauthorizedException('Không tìm thấy refresh token trong request (body, header hoặc cookie).');
    }

    const userAgent = req.headers['user-agent'];
    const { accessToken, user } = await this.authService.refresh(refreshToken, userAgent);

    return { accessToken, user };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Đăng xuất khỏi hệ thống và thu hồi refresh token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refreshToken: {
          type: 'string',
          description: 'Refresh token cần thu hồi (có thể bỏ trống nếu dùng cookie)',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Đăng xuất thành công' })
  async logout(
    @Req() req: ExpressRequest,
    @CurrentUser() user: any,
    @Res({ passthrough: true }) res: Response,
    @Body('refreshToken') bodyToken?: string,
  ) {
    let refreshToken = bodyToken;

    // 1. Check Custom Header
    if (!refreshToken) {
      const xRefreshToken = req.headers['x-refresh-token'];
      if (typeof xRefreshToken === 'string') {
        refreshToken = xRefreshToken;
      }
    }

    // 2. Check Cookie fallback
    if (!refreshToken) {
      refreshToken = req.cookies?.['refreshToken'];
    }

    if (refreshToken) {
      await this.authService.logout(user.id, refreshToken);
    }

    res.clearCookie('refreshToken', {
      path: '/',
    });
    return { message: 'Đăng xuất thành công' };
  }
}
