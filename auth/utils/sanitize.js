// Strip sensitive fields from a raw DB user row.
export const userSanitize = (user) => {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    createdAt: user.created_at,
    updatedAt: user.updated_at ?? null,
  };
};
