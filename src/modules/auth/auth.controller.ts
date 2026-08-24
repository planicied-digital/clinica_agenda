import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from '../../common/auth/public.decorator';
import { UsuarioAtual } from '../../common/auth/usuario-atual.decorator';
import { JwtPayload } from '../../common/auth/jwt-payload';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.senha);
  }

  @Get('me')
  me(@UsuarioAtual() usuario: JwtPayload) {
    return usuario;
  }
}
