import { PayOS } from '@payos/node';
import { PAYOS_API_KEY, PAYOS_CLIENT_ID, PAYOS_CHECKSUM_KEY } from '@/constants/env';

const payOS = new PayOS({
  clientId: PAYOS_CLIENT_ID,
  apiKey: PAYOS_API_KEY,
  checksumKey: PAYOS_CHECKSUM_KEY,
});

export default payOS;
