import * as jwt from 'jsonwebtoken';

export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface UserTokenData {
  userId: string;
  email: string;
}

export class JwtService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;

  constructor() {
    this.accessTokenSecret = process.env.JWT_ACCESS_SECRET || 'your-super-secret-access-key-change-in-production';
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production';
    this.accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY || '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';
  }

  generateTokenPair(userData: UserTokenData): TokenPair {
    const payload: JwtPayload = {
      userId: userData.userId,
      email: userData.email
    };

    const accessToken = jwt.sign(
      payload,
      this.accessTokenSecret,
      {
        expiresIn: this.accessTokenExpiry,
        issuer: 'ai-rules-test',
        audience: 'ai-rules-test-users'
      } as jwt.SignOptions
    );

    const refreshToken = jwt.sign(
      payload,
      this.refreshTokenSecret,
      {
        expiresIn: this.refreshTokenExpiry,
        issuer: 'ai-rules-test',
        audience: 'ai-rules-test-users'
      } as jwt.SignOptions
    );

    return { accessToken, refreshToken };
  }

  verifyAccessToken(token: string): JwtPayload | null {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret, {
        issuer: 'ai-rules-test',
        audience: 'ai-rules-test-users'
      }) as JwtPayload;
      
      return decoded;
    } catch (error) {
      return null;
    }
  }

  verifyRefreshToken(token: string): JwtPayload | null {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret, {
        issuer: 'ai-rules-test',
        audience: 'ai-rules-test-users'
      }) as JwtPayload;
      
      return decoded;
    } catch (error) {
      return null;
    }
  }

  extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  refreshTokenPair(refreshToken: string): TokenPair | null {
    const payload = this.verifyRefreshToken(refreshToken);
    if (!payload) {
      return null;
    }

    // Create user data object for token generation
    const userData: UserTokenData = {
      userId: payload.userId,
      email: payload.email
    };

    return this.generateTokenPair(userData);
  }

  getTokenExpiration(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as JwtPayload;
      if (!decoded || !decoded.exp) {
        return null;
      }
      
      return new Date(decoded.exp * 1000);
    } catch (error) {
      return null;
    }
  }

  isTokenExpired(token: string): boolean {
    const expiration = this.getTokenExpiration(token);
    if (!expiration) {
      return true;
    }
    
    return expiration <= new Date();
  }
}

// Export singleton instance
export const jwtService = new JwtService();
