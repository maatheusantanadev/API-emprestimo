import { Global, Injectable, Module } from '@nestjs/common';

export const CLOCK = Symbol('CLOCK');

/** Abstração do relógio: permite testar expiração de 24h e datas de vencimento. */
export interface Clock {
  now(): Date;
}

@Injectable()
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

@Global()
@Module({
  providers: [{ provide: CLOCK, useClass: SystemClock }],
  exports: [CLOCK],
})
export class ClockModule {}
