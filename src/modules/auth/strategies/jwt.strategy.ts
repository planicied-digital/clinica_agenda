import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../../../common/auth/jwt-payload';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // JWT_SECRET é obrigatório em validation.schema.ts — a app não sobe sem ele.
      secretOrKey: config.get<string>('jwt.secret') as string,
    });
  }

  // O retorno vira request.user — payload já confiável (assinatura verificada
  // pelo passport-jwt antes de chamar validate).
  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}
