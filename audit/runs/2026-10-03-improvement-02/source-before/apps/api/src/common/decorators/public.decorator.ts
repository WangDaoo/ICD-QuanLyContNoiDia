import { SetMetadata } from '@nestjs/common';

import { IS_PUBLIC_KEY } from '../constants/auth-metadata.constants';

/**
 * Đánh dấu endpoint không cần Access Token.
 *
 * Chỉ dùng cho những API thực sự public:
 *
 * - login
 * - refresh
 * - health
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
