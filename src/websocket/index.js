const WebSocket = require("ws");
const url = require("url");
const { verifyToken } = require("../utils/jwt");
const logger = require("../utils/logger");
const config = require("../config");

let wss = null;
const connections = new Map();

/**
 * Initialize WebSocket server
 */
const initWebSocket = (server) => {
  if (!config.websocket.enabled) {
    logger.info("WebSocket disabled");
    return null;
  }

  try {
    wss = new WebSocket.Server({
      server,
      path: config.websocket.path,
      verifyClient: (info, callback) => {
        try {
          const params = url.parse(info.req.url, true).query;
          const token = params.token;

          if (!token) {
            callback(false, 401, "Authentication required");
            return;
          }

          const decoded = verifyToken(token, "access");
          info.req.user = {
            id: decoded.userId,
            role: decoded.role,
            email: decoded.email,
          };

          callback(true);
        } catch (error) {
          logger.error("WebSocket authentication failed", { error: error.message });
          callback(false, 401, "Invalid token");
        }
      },
    });

    wss.on("connection", (ws, req) => {
      const user = req.user;
      const connectionId = `${user.id}_${Date.now()}`;

      connections.set(connectionId, {
        ws,
        user,
        connectedAt: Date.now(),
      });

      logger.info("WebSocket connection established", {
        userId: user.id,
        connectionId,
      });

      // Send welcome message
      ws.send(
        JSON.stringify({
          type: "connected",
          message: "WebSocket connection established",
          userId: user.id,
        })
      );

      // Setup ping interval
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        }
      }, config.websocket.pingInterval);

      const entry = connections.get(connectionId);
      if (entry) {
        entry.pingInterval = pingInterval;
      }

      ws.on("pong", () => {
        // Connection is alive
      });

      ws.on("message", (data) => {
        try {
          const message = JSON.parse(data.toString());
          handleClientMessage(connectionId, message);
        } catch (error) {
          logger.error("WebSocket message parse error", {
            error: error.message,
            connectionId,
          });
        }
      });

      ws.on("close", () => {
        clearInterval(pingInterval);
        connections.delete(connectionId);
        logger.info("WebSocket connection closed", {
          userId: user.id,
          connectionId,
        });
      });

      ws.on("error", (error) => {
        logger.error("WebSocket error", {
          error: error.message,
          connectionId,
        });
      });
    });

    logger.info("WebSocket server initialized", { path: config.websocket.path });
    return wss;
  } catch (error) {
    logger.error("WebSocket initialization failed", { error: error.message });
    return null;
  }
};

/**
 * Close WebSocket server and all active connections
 */
const closeWebSocket = () => {
  try {
    for (const [connectionId, connection] of connections.entries()) {
      try {
        if (connection?.pingInterval) {
          clearInterval(connection.pingInterval);
        }
      } catch (_) {}

      try {
        if (connection?.ws && connection.ws.readyState === WebSocket.OPEN) {
          connection.ws.close(1001, "Server shutting down");
        } else if (connection?.ws) {
          connection.ws.terminate?.();
        }
      } catch (_) {}

      connections.delete(connectionId);
    }

    if (wss) {
      try {
        wss.close();
      } catch (_) {}
      wss = null;
    }
  } catch (error) {
    logger.error("WebSocket close failed", { error: error.message });
  }
};

/**
 * Handle client messages
 */
const handleClientMessage = (connectionId, message) => {
  const connection = connections.get(connectionId);
  if (!connection) return;

  logger.info("WebSocket message received", {
    connectionId,
    type: message.type,
  });

  // Handle different message types
  switch (message.type) {
    case "ping":
      send(connectionId, { type: "pong", timestamp: Date.now() });
      break;

    case "subscribe":
      // Handle channel subscription
      break;

    case "unsubscribe":
      // Handle channel unsubscription
      break;

    default:
      logger.warn("Unknown WebSocket message type", {
        type: message.type,
        connectionId,
      });
  }
};

/**
 * Send message to specific connection
 */
const send = (connectionId, message) => {
  const connection = connections.get(connectionId);
  if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
    return false;
  }

  try {
    connection.ws.send(JSON.stringify(message));
    return true;
  } catch (error) {
    logger.error("Failed to send WebSocket message", {
      error: error.message,
      connectionId,
    });
    return false;
  }
};

/**
 * Broadcast message to all connections
 */
const broadcast = (message, filter = null) => {
  let count = 0;

  for (const [connectionId, connection] of connections.entries()) {
    if (filter && !filter(connection.user)) {
      continue;
    }

    if (send(connectionId, message)) {
      count++;
    }
  }

  return count;
};

/**
 * Send notification to specific user
 */
const notifyUser = (userId, message) => {
  let count = 0;

  for (const [connectionId, connection] of connections.entries()) {
    if (connection.user.id === userId) {
      if (send(connectionId, message)) {
        count++;
      }
    }
  }

  return count > 0;
};

/**
 * Send notification to users with specific role
 */
const notifyRole = (role, message) => {
  return broadcast(message, (user) => user.role === role);
};

/**
 * Send notification to admins
 */
const notifyAdmins = (message) => {
  return notifyRole("admin", message);
};

/**
 * Get active connections count
 */
const getConnectionsCount = () => {
  return connections.size;
};

/**
 * Get connections for specific user
 */
const getUserConnections = (userId) => {
  const userConnections = [];
  for (const [connectionId, connection] of connections.entries()) {
    if (connection.user.id === userId) {
      userConnections.push({
        connectionId,
        connectedAt: connection.connectedAt,
      });
    }
  }
  return userConnections;
};

module.exports = {
  initWebSocket,
  closeWebSocket,
  send,
  broadcast,
  notifyUser,
  notifyRole,
  notifyAdmins,
  getConnectionsCount,
  getUserConnections,
};
