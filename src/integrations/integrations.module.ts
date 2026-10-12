import { Global, Module } from '@nestjs/common';
import { DATAPREV_CLIENT } from './dataprev/dataprev.client';
import { DataprevHttpClient } from './dataprev/dataprev.http-client';
import { JsonHttpClient } from './http/json-http.client';
import { PAYMENT_GATEWAY_CLIENT } from './payment-gateway/payment-gateway.client';
import { PaymentGatewayHttpClient } from './payment-gateway/payment-gateway.http-client';

@Global()
@Module({
  providers: [
    JsonHttpClient,
    { provide: DATAPREV_CLIENT, useClass: DataprevHttpClient },
    { provide: PAYMENT_GATEWAY_CLIENT, useClass: PaymentGatewayHttpClient },
  ],
  exports: [DATAPREV_CLIENT, PAYMENT_GATEWAY_CLIENT],
})
export class IntegrationsModule {}
