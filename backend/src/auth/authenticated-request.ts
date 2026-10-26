import type { Request } from 'express';
import { PublicUser } from '../users/entities/user.entity';

export type AuthenticatedRequest = Request & { user: PublicUser };
