import type { Extension, onConnectPayload } from "@hocuspocus/server";
import { logger } from "@plane/logger";
import { env } from "@/env";
import { redisManager } from "@/redis";
import type { HocusPocusServerContext } from "@/types";

interface RateLimiterConfig {
  maxConnectionsPerUser: number;
  connectionWindowSeconds: number;
  maxMessagesPerSecond: number;
}

/**
 * WebSocket Rate Limiter Extension
 *
 * Provides connection-level rate limiting for Hocuspocus WebSocket connections.
 * Uses Redis to track connection counts per user across multiple server instances.
 *
 * Rate limiting rules:
 * 1. Connection rate: Max N connections per user within a time window
 * 2. Message rate: Max N messages per second per connection (tracked in-memory)
 */
export class RateLimiter implements Extension {
  private config: RateLimiterConfig;
  private messageCounters: Map<string, { count: number; resetTime: number }> = new Map();

  constructor() {
    this.config = {
      maxConnectionsPerUser: env.WS_RATE_LIMIT_CONNECTIONS_PER_USER,
      connectionWindowSeconds: env.WS_RATE_LIMIT_CONNECTIONS_WINDOW_SECONDS,
      maxMessagesPerSecond: env.WS_RATE_LIMIT_MESSAGES_PER_SECOND,
    };

    logger.info(
      `RATE_LIMITER: Initialized with max ${this.config.maxConnectionsPerUser} connections/user, ` +
        `${this.config.connectionWindowSeconds}s window, ${this.config.maxMessagesPerSecond} messages/second`
    );
  }

  /**
   * Check connection rate limit before allowing a new connection
   */
  async onConnect(data: onConnectPayload): Promise<void> {
    const context = data.context as HocusPocusServerContext;
    const userId = context.userId;

    if (!userId) {
      logger.warn("RATE_LIMITER: No userId in context, skipping rate limit check");
      return;
    }

    const key = this.getConnectionRateKey(userId);

    try {
      const allowed = await this.checkConnectionRateLimit(key, userId);
      if (!allowed) {
        logger.warn(`RATE_LIMITER: Connection rate limit exceeded for user ${userId}`);
        throw new Error("Connection rate limit exceeded. Please try again later.");
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("rate limit")) {
        throw error;
      }
      // Log but don't block on Redis errors - fail open for availability
      logger.error("RATE_LIMITER: Error checking connection rate limit:", error);
    }
  }

  /**
   * Track connection and check rate limit using Redis
   */
  private async checkConnectionRateLimit(key: string, userId: string): Promise<boolean> {
    const client = redisManager.getClient();

    // If Redis is not available, allow the connection (fail open)
    if (!client) {
      logger.warn("RATE_LIMITER: Redis not available, allowing connection");
      return true;
    }

    try {
      // Use Redis INCR with expiration for sliding window rate limiting
      const current = await client.incr(key);

      // Set expiration on first increment
      if (current === 1) {
        await client.expire(key, this.config.connectionWindowSeconds);
      }

      const allowed = current <= this.config.maxConnectionsPerUser;

      if (!allowed) {
        logger.warn(
          `RATE_LIMITER: User ${userId} has ${current} connections in window, max is ${this.config.maxConnectionsPerUser}`
        );
      }

      return allowed;
    } catch (error) {
      logger.error("RATE_LIMITER: Redis operation failed:", error);
      // Fail open - allow connection if Redis fails
      return true;
    }
  }

  /**
   * Track message rate for a connection (in-memory for low latency)
   */
  checkMessageRateLimit(connectionId: string): boolean {
    const now = Date.now();
    const counter = this.messageCounters.get(connectionId);

    if (!counter || now >= counter.resetTime) {
      // Reset counter for new time window
      this.messageCounters.set(connectionId, {
        count: 1,
        resetTime: now + 1000, // 1 second window
      });
      return true;
    }

    counter.count++;

    if (counter.count > this.config.maxMessagesPerSecond) {
      logger.warn(`RATE_LIMITER: Message rate limit exceeded for connection ${connectionId}`);
      return false;
    }

    return true;
  }

  /**
   * Clean up message counter when connection closes
   */
  onDisconnect(data: { documentName: string; context: unknown; socketId: string }): void {
    this.messageCounters.delete(data.socketId);
  }

  /**
   * Generate Redis key for connection rate limiting
   */
  private getConnectionRateKey(userId: string): string {
    return `ws:rate:conn:${userId}`;
  }
}
