import { ClerkClient, ClerkOptions } from '@clerk/backend';
import { Context, MiddlewareHandler } from 'hono';

type ClerkAuth = ReturnType<Awaited<ReturnType<ClerkClient['authenticateRequest']>>['toAuth']>;
declare module 'hono' {
    interface ContextVariableMap {
        clerk: ClerkClient;
        clerkAuth: ClerkAuth;
    }
}
declare const getAuth: (c: Context) => ClerkAuth;
declare const clerkMiddleware: (options?: ClerkOptions) => MiddlewareHandler;

export { clerkMiddleware, getAuth };
