// Only staff accounts (the `users` auth collection) may write or read private data.
// Blog users (`blog-users`) are public sign-ups and must never get staff privileges:
// Payload's default access is "any logged-in user", which includes them.
export const isStaff = ({ req: { user } }: { req: { user?: unknown } }) =>
    Boolean(user && (user as { collection?: string }).collection === 'users')

// Once posts, comments and the interaction tables moved to Postgres (CONTENT_SOURCE=api), Mongo
// is a frozen archive: the old admin can still read it, but nothing may write to it, so a stray
// edit can neither diverge from the real data nor trigger the old newsletter hook.
const frozen = () => process.env.CONTENT_SOURCE === 'api'
export const staffUnlessFrozen = (args: { req: { user?: unknown } }) => !frozen() && isStaff(args)
export const publicUnlessFrozen = () => !frozen()
