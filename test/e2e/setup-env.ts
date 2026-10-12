import { TEST_DATABASE_URL } from './test-database';

// A aplicação lê a configuração do ambiente; Dataprev e Gateway são substituídos por fakes.
process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.DATAPREV_BASE_URL = 'http://dataprev.invalid';
process.env.GATEWAY_BASE_URL = 'http://gateway.invalid';
