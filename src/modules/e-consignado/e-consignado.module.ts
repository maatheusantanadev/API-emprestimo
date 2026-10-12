import { Module } from '@nestjs/common';
import { EConsignadoService } from './services/e-consignado.service';

@Module({
  providers: [EConsignadoService],
  exports: [EConsignadoService],
})
export class EConsignadoModule {}
