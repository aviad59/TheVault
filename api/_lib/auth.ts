import type { VercelRequest, VercelResponse } from '@vercel/node';

export function getUserId(req: VercelRequest, res: VercelResponse): string | null {
  const userId = req.headers['x-user-id'];
  if (typeof userId !== 'string' || userId.length < 8 || userId.length > 128) {
    res.status(401).json({ error: 'missing or invalid x-user-id header' });
    return null;
  }
  return userId;
}
