export function requireRole(role: 'ADMIN') {
  return (req: any, res: any, next: any) => {
    if (req.user.role !== role) {
      return res.sendStatus(403);
    }
    next();
  };
}
