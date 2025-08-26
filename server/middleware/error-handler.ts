import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class APIError extends Error {
    constructor(
        public statusCode: number,
        message: string
    ) {
        super(message);
        this.name = 'APIError';
    }
}

export function errorHandler(
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
) {
    console.error('Error:', err);

    if (err instanceof APIError) {
        return res.status(err.statusCode).json({
            error: err.message
        });
    }

    if (err instanceof ZodError) {
        return res.status(400).json({
            error: 'Validation Error',
            details: err.errors
        });
    }

    // Default error
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
}
