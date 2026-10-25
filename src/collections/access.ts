// Only staff accounts (the `users` auth collection) may write or read private data.
// Blog users (`blog-users`) are public sign-ups and must never get staff privileges:
// Payload's default access is "any logged-in user", which includes them.
export const isStaff = ({ req: { user } }: { req: { user?: unknown } }) =>
    Boolean(user && (user as { collection?: string }).collection === 'users')
