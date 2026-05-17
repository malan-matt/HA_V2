/**
 * Student Name: [Your Name]
 * Student Number: [Your Number]
 * Course: COS 216
 * Assignment: Homework Assignment - Flight Tracking System
 * Task 2: NodeJS WebSocket Server
 */

const WebSocket = require('ws');
const readline = require('readline');
const fetch = require('node-fetch');
const { API_BASE_URL, SERVER_API_KEY, BOARDING_WINDOW_MS, ANIMATION_TICK_MS } = require('./server.config');

let wss = null;
const clients = new Map();
const activeFlights = new Map();
const boardingTimers = new Map();
let serverRunning = true;

function getPort() {
  const args = process.argv.slice(2);
  const portFlag = args.find((arg) => arg.startsWith('--port='));
  const portArg = portFlag || args.find((arg) => !arg.startsWith('--'));
  let port = portArg ? parseInt(String(portArg).replace('--port=', ''), 10) : null;

  if (!port) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
      rl.question('Enter port number (1024-49151): ', (answer) => {
        rl.close();
        resolve(parseInt(answer, 10));
      });
    });
  }
  return Promise.resolve(port);
}

function isValidPort(port) {
  return !isNaN(port) && port >= 1024 && port <= 49151;
}

async function callAPI(endpoint, method = 'GET', data = null, userToken = null, queryParams = null) {
  let url = `${API_BASE_URL}/${endpoint}.php`;
  if (queryParams && Object.keys(queryParams).length > 0) {
    url += `?${new URLSearchParams(queryParams).toString()}`;
  }

  const headers = { 'Content-Type': 'application/json' };
  if (userToken) {
    headers['X-App-Authorization'] = `Bearer ${userToken}`;
  } else {
    headers['X-API-Key'] = SERVER_API_KEY;
  }

  const options = { method, headers };
  if (data && method !== 'GET') {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || 'API call failed');
  }
  return result;
}

function extractFlight(result) {
  return result.flight ?? result;
}

/** Spec: N-hour flight animates in N seconds. */
function flightDurationMs(durationHours) {
  const hours = Number(durationHours) || 1;
  return Math.max(hours * 1000, 1000);
}

function interpolatePosition(origin, destination, progress) {
  return {
    lat: origin.lat + (destination.lat - origin.lat) * progress,
    lon: origin.lon + (destination.lon - origin.lon) * progress,
  };
}

function broadcastToSubscribers(flightId, message) {
  for (const [, clientInfo] of clients) {
    if (clientInfo.subscriptions.has(flightId) && clientInfo.ws.readyState === WebSocket.OPEN) {
      clientInfo.ws.send(JSON.stringify(message));
    }
  }
}

function broadcastToAll(message) {
  for (const [, clientInfo] of clients) {
    if (clientInfo.ws.readyState === WebSocket.OPEN) {
      clientInfo.ws.send(JSON.stringify(message));
    }
  }
}

function broadcastStatusChange(flightId, status) {
  const message = { type: 'STATUS_CHANGE', flight_id: flightId, status };
  broadcastToSubscribers(flightId, message);
  broadcastToAll(message);
}

async function startFlightAnimation(flightId, flightNumber, origin, destination, durationHours) {
  if (activeFlights.has(flightId)) {
    clearInterval(activeFlights.get(flightId).interval);
  }

  const durationMs = flightDurationMs(durationHours);
  const startTime = Date.now();

  const interval = setInterval(async () => {
    if (!serverRunning) return;

    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / durationMs, 1);

    if (progress >= 1) {
      clearInterval(interval);
      activeFlights.delete(flightId);

      try {
        await callAPI('updateFlightPosition', 'POST', {
          flight_id: flightId,
          latitude: destination.lat,
          longitude: destination.lon,
          status: 'Landed',
        });

        broadcastToSubscribers(flightId, {
          type: 'POSITION',
          flight_id: flightId,
          flight_number: flightNumber,
          latitude: destination.lat,
          longitude: destination.lon,
          progress: 1,
        });
        broadcastStatusChange(flightId, 'Landed');
      } catch (error) {
        console.error(`Error landing flight ${flightId}:`, error.message);
      }
      return;
    }

    const { lat, lon } = interpolatePosition(origin, destination, progress);

    try {
      await callAPI('updateFlightPosition', 'POST', {
        flight_id: flightId,
        latitude: lat,
        longitude: lon,
      });
    } catch (error) {
      console.error(`Error updating flight ${flightId}:`, error.message);
    }

    broadcastToSubscribers(flightId, {
      type: 'POSITION',
      flight_id: flightId,
      flight_number: flightNumber,
      latitude: lat,
      longitude: lon,
      progress,
    });
  }, ANIMATION_TICK_MS);

  activeFlights.set(flightId, { interval, startTime, duration: durationMs, origin, destination, flightNumber });
}

async function beginFlightAfterBoarding(flightId, flight, userToken) {
  try {
    const passengersResult = await callAPI('getFlightPassengers', 'GET', null, userToken, { id: flightId });

    for (const passenger of passengersResult.passengers || []) {
      if (!passenger.boarding_confirmed) {
        broadcastToAll({
          type: 'NO_SHOW',
          flight_id: flightId,
          flight_number: flight.flight_number,
          passenger: passenger.username,
          message: `${passenger.username} did not confirm boarding within 60 seconds (no-show)`,
        });
      }
    }

    await callAPI('updateFlightPosition', 'POST', {
      flight_id: flightId,
      latitude: flight.origin.lat,
      longitude: flight.origin.lon,
      status: 'In Flight',
    });

    broadcastStatusChange(flightId, 'In Flight');

    startFlightAnimation(
      flight.id,
      flight.flight_number,
      flight.origin,
      flight.destination,
      flight.flight_duration_hours
    );
  } catch (error) {
    console.error(`Error starting flight ${flightId} after boarding:`, error.message);
  }
}

async function handleDispatch(ws, data, userToken) {
  const { flight_id: flightId } = data;

  try {
    await callAPI('dispatchFlight', 'POST', { flight_id: flightId }, userToken);

    const flightResult = await callAPI('getFlights', 'GET', null, userToken, { id: flightId });
    const flight = extractFlight(flightResult);

    const passengersResult = await callAPI('getFlightPassengers', 'GET', null, userToken, { id: flightId });

    for (const passenger of passengersResult.passengers || []) {
      const clientInfo = clients.get(passenger.username);
      if (clientInfo?.ws.readyState === WebSocket.OPEN) {
        clientInfo.ws.send(
          JSON.stringify({
            type: 'BOARDING_CALL',
            flight_id: flight.id,
            flight_number: flight.flight_number,
            boarding_deadline: Date.now() + BOARDING_WINDOW_MS,
          })
        );
      }
    }

    broadcastStatusChange(flightId, 'Boarding');

    if (boardingTimers.has(flightId)) {
      clearTimeout(boardingTimers.get(flightId));
    }

    const timer = setTimeout(() => {
      boardingTimers.delete(flightId);
      beginFlightAfterBoarding(flightId, flight, userToken);
    }, BOARDING_WINDOW_MS);

    boardingTimers.set(flightId, timer);

    ws.send(
      JSON.stringify({
        type: 'DISPATCH_SUCCESS',
        flight_id: flight.id,
        flight_number: flight.flight_number,
        message: 'Flight dispatched — 60 second boarding window started',
      })
    );
  } catch (error) {
    ws.send(JSON.stringify({ type: 'ERROR', message: error.message }));
  }
}

async function handleBoard(ws, data, username, userToken) {
  const { flight_id: flightId } = data;

  try {
    await callAPI('boardFlight', 'POST', { flight_id: flightId }, userToken);

    broadcastToAll({
      type: 'BOARDING_CONFIRMATION',
      flight_id: flightId,
      passenger: username,
      message: `${username} has confirmed boarding`,
    });

    ws.send(JSON.stringify({ type: 'BOARD_SUCCESS', message: 'Boarding confirmed successfully' }));
  } catch (error) {
    ws.send(JSON.stringify({ type: 'ERROR', message: error.message }));

    if (error.message.includes('expired') || error.message.includes('Boarding window')) {
      broadcastToAll({
        type: 'NO_SHOW',
        flight_id: flightId,
        passenger: username,
        message: `${username} failed to board within 60 seconds (no-show)`,
      });
    }
  }
}

async function handleTrack(ws, data, username, userType, userToken) {
  const { flight_id: flightId } = data;

  if (userType === 'Passenger') {
    try {
      await callAPI('getFlights', 'GET', null, userToken, { id: flightId });
    } catch {
      ws.send(JSON.stringify({ type: 'ERROR', message: 'You are not booked on this flight' }));
      return;
    }
  }

  const clientInfo = clients.get(username);
  if (!clientInfo) return;

  clientInfo.subscriptions.add(flightId);

  try {
    const flightResult = await callAPI('getFlights', 'GET', null, userToken, { id: flightId });
    const flight = extractFlight(flightResult);
    ws.send(
      JSON.stringify({
        type: 'POSITION',
        flight_id: flightId,
        flight_number: flight.flight_number,
        latitude: flight.current_latitude,
        longitude: flight.current_longitude,
        status: flight.status,
        progress: 0,
      })
    );
  } catch (error) {
    console.error('Error getting current position:', error.message);
  }
}

async function handleFlightStatus(flightId) {
  try {
    const result = await callAPI('getFlights', 'GET', null, null, { id: flightId });
    const flight = extractFlight(result);

    console.log(`\n=== Flight ${flight.flight_number} (ID: ${flightId}) ===`);
    console.log(`Status: ${flight.status}`);
    console.log(`Position: ${flight.current_latitude}, ${flight.current_longitude}`);
    console.log(
      `Passengers: ${flight.confirmed_passengers ?? 0}/${flight.total_passengers ?? 0} confirmed boarding`
    );

    if (flight.status === 'In Flight' && activeFlights.has(flightId)) {
      const active = activeFlights.get(flightId);
      const elapsed = Date.now() - active.startTime;
      const remaining = Math.max(0, active.duration - elapsed);
      console.log(`Estimated time to landing: ${Math.ceil(remaining / 1000)} seconds`);
    } else if (flight.status === 'Scheduled') {
      console.log(`Scheduled departure: ${flight.departure_time}`);
    }
    console.log('========================\n');
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
}

function handleKill(username) {
  const clientInfo = clients.get(username);
  if (clientInfo?.ws.readyState === WebSocket.OPEN) {
    clientInfo.ws.send(
      JSON.stringify({
        type: 'KILL_NOTIFICATION',
        message: 'Your connection is being terminated by the server administrator',
      })
    );
    setTimeout(() => {
      clientInfo.ws.close();
      clients.delete(username);
      console.log(`User ${username} has been disconnected`);
    }, 1000);
  } else {
    console.log(`User ${username} not found or already disconnected`);
  }
}

function handleQuit() {
  console.log('Shutting down server...');
  const shutdownMsg = {
    type: 'SHUTDOWN',
    message: 'Server is shutting down gracefully. Please reconnect later.',
  };
  broadcastToAll(shutdownMsg);
  broadcastToAll({ ...shutdownMsg, type: 'SERVER_SHUTDOWN' });

  serverRunning = false;

  for (const timer of boardingTimers.values()) {
    clearTimeout(timer);
  }
  boardingTimers.clear();

  for (const [, clientInfo] of clients) {
    if (clientInfo.ws.readyState === WebSocket.OPEN) {
      clientInfo.ws.close();
    }
  }

  for (const [, flight] of activeFlights) {
    clearInterval(flight.interval);
  }
  activeFlights.clear();

  wss.close(() => {
    console.log('Server shutdown complete');
    process.exit(0);
  });
}

function setupCLI() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log('\nServer CLI Commands:');
  console.log('  FLIGHT STATUS <flight_id>  (alias: FLIGHT_STATUS)');
  console.log('  KILL <username>');
  console.log('  QUIT\n');

  rl.on('line', async (input) => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const parts = trimmed.split(/\s+/);
    const command = parts[0].toUpperCase();
    const subCommand = parts[1]?.toUpperCase();

    if (command === 'FLIGHT' && subCommand === 'STATUS') {
      if (parts[2]) {
        await handleFlightStatus(parseInt(parts[2], 10));
      } else {
        console.log('Usage: FLIGHT STATUS <flight_id>');
      }
      return;
    }

    switch (command) {
      case 'FLIGHT_STATUS':
        if (parts[1]) {
          await handleFlightStatus(parseInt(parts[1], 10));
        } else {
          console.log('Usage: FLIGHT_STATUS <flight_id>');
        }
        break;
      case 'KILL':
        if (parts[1]) handleKill(parts[1]);
        else console.log('Usage: KILL <username>');
        break;
      case 'QUIT':
        handleQuit();
        break;
      default:
        console.log('Unknown command. Available: FLIGHT STATUS, KILL, QUIT');
    }
  });
}

async function startServer(port) {
  wss = new WebSocket.Server({ port });
  console.log(`WebSocket server running on ws://localhost:${port}`);
  console.log(`API: ${API_BASE_URL}`);

  wss.on('connection', (ws) => {
    let username = null;
    let userType = null;
    let userToken = null;

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);

        if (data.type === 'AUTHENTICATE') {
          if (!data.token || !data.userType) {
            ws.send(
              JSON.stringify({ type: 'AUTHENTICATE_FAILED', message: 'Token and userType required' })
            );
            return;
          }

          try {
            await callAPI('getAllFlights', 'GET', null, data.token);
            username = data.username || `user_${Date.now()}`;
            userType = data.userType;
            userToken = data.token;

            clients.set(username, { ws, subscriptions: new Set(), type: userType });

            ws.send(
              JSON.stringify({ type: 'AUTHENTICATE_SUCCESS', message: 'Successfully authenticated' })
            );
            console.log(`User ${username} (${userType}) connected`);
          } catch {
            ws.send(
              JSON.stringify({
                type: 'AUTHENTICATE_FAILED',
                message: 'Invalid token or authorization failed',
              })
            );
          }
          return;
        }

        if (!username) {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Not authenticated. Please authenticate first.' }));
          return;
        }

        switch (data.type) {
          case 'DISPATCH':
            await handleDispatch(ws, data, userToken);
            break;
          case 'BOARD':
            await handleBoard(ws, data, username, userToken);
            break;
          case 'TRACK':
            await handleTrack(ws, data, username, userType, userToken);
            break;
          default:
            ws.send(JSON.stringify({ type: 'ERROR', message: `Unknown message type: ${data.type}` }));
        }
      } catch (error) {
        console.error('Error processing message:', error);
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Internal server error' }));
      }
    });

    ws.on('close', () => {
      if (username) {
        console.log(`User ${username} disconnected`);
        if (userType === 'ATC') {
          broadcastToAll({
            type: 'ATC_DISCONNECTED',
            message: 'ATC connection lost, but flights continue normally',
          });
        }
        clients.delete(username);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  setupCLI();
}

(async () => {
  const port = await getPort();
  if (!isValidPort(port)) {
    console.error('Error: Invalid port number. Must be between 1024 and 49151');
    process.exit(1);
  }
  await startServer(port);
})();
