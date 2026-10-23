// Deployment settings read from the environment.

export const isProduction = process.env.NODE_ENV === 'production';

// Email verification and password reset need working email (SMTP). Set
// EMAIL_VERIFICATION=off to let people sign up without it, e.g. on hosts that block SMTP.
export const emailVerification = (process.env.EMAIL_VERIFICATION || 'on').toLowerCase() !== 'off';
