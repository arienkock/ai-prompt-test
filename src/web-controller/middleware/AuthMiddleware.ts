import { Request, Response, NextFunction } from 'express';
import { jwtService } from '../../shared/services/JwtService';
import { Context } from '../../shared/types/ValidationTypes';
import { AuthenticationDomainError } from '../../domain/types/UseCase';

// Extend Express Request to include user context
declare global {
  namespace Express {
    interface Request {
      context?: Context;
      user?: {
        userId: string;
        email: string;
      };
    }
  }
}

export class AuthMiddleware {
  /**
   * Middleware to authenticate requests using JWT tokens
   * Now throws domain errors instead of creating responses
   */
  static authenticate(req: Request, res: Response, next: NextFunction): void {
    try {
      const authHeader = req.headers.authorization;
      const token = jwtService.extractTokenFromHeader(authHeader);

      if (!token) {
        throw new AuthenticationDomainError('Authentication required');
      }

      const payload = jwtService.verifyAccessToken(token);
      if (!payload) {
        throw new AuthenticationDomainError('Invalid or expired token');
      }

      // Add user information to request
      req.user = {
        userId: payload.userId,
        email: payload.email
      };

      // Create context for the request
      req.context = new Context(payload.userId);

      next();
    } catch (error) {
      // Pass any error to the unified error handler
      next(error);
    }
  }

  /**
   * Optional authentication - doesn't fail if no token, but adds user info if token is valid
   */
  static optionalAuthenticate(req: Request, res: Response, next: NextFunction): void {
    try {
      const authHeader = req.headers.authorization;
      const token = jwtService.extractTokenFromHeader(authHeader);

      if (token) {
        const payload = jwtService.verifyAccessToken(token);
        if (payload) {
          req.user = {
            userId: payload.userId,
            email: payload.email
          };
          req.context = new Context(payload.userId);
        }
      }

      // Always continue, regardless of token validity
      if (!req.context) {
        req.context = new Context();
      }

      next();
    } catch (error) {
      // Even if there's an error, continue without authentication
      req.context = new Context();
      next();
    }
  }

  /**
   * Middleware to ensure user has valid context
   */
  static requireContext(req: Request, res: Response, next: NextFunction): void {
    if (!req.context) {
      req.context = new Context();
    }
    next();
  }
}
