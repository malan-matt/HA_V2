COS 216 Homework Assignment - Flight Tracking System
====================================================

Student Name: [Your Name]
Student Number: [Your Number]

PROJECT STRUCTURE
-----------------
api/                  PHP API (deploy to Wheatley)
src/server.js         NodeJS WebSocket server (run locally)
src/app/              Angular web client

RUNNING THE SYSTEM
------------------
1. Deploy the api/ folder to Wheatley and configure database credentials via
   environment variables (see api/config.php). Set SERVER_API_KEY on Wheatley
   to match your local Node server.

2. Start the WebSocket server (choose a port 1024-49151):
   node src/server.js --port=8080

3. Start the Angular client:
   npm start

4. Log in with the same WebSocket port configured on the login screen (default 8080).

API ENDPOINTS (Task 1)
----------------------
login.php, getAllFlights.php, getFlights.php (GetFlight), getFlight.php (alias),
dispatchFlight.php, updateFlightPosition.php, getAirports.php, boardFlight.php,
getFlightPassengers.php (ATC passenger list helper)

FLIGHT DURATION RULE (Spec section 7)
-------------------------------------
A flight with real-world duration N hours completes its animation in N seconds.
Implemented in src/server.js as: durationMs = flight_duration_hours * 1000.

SYSTEM FLOW (Spec section 8.10 / 8.14)
--------------------------------------
1. ATC dispatches -> API status Scheduled -> Boarding; BOARDING_CALL sent.
2. 60-second boarding window; passengers confirm via BOARD / boardFlight.php.
3. After 60 seconds -> status In Flight; animation begins (N hours = N seconds).
4. POSITION messages sent to TRACK subscribers each animation tick.
5. On arrival -> status Landed via updateFlightPosition.php.

DATABASE UPDATE STRATEGY (Task 2 README requirement)
----------------------------------------------------
Choice: Update on every animation tick.

The server calls updateFlightPosition on every tick (every 100ms during animation).
This keeps the Wheatley database aligned with the live map for all clients and
supports FLIGHT STATUS CLI queries with accurate coordinates. The trade-off is
more API traffic, which is acceptable for this assignment's scaled short flights.

Alternative (on interval): store position in memory and write every N seconds;
fewer API calls but stale DB between writes.

WEBSOCKET MESSAGES
------------------
Client -> Server: AUTHENTICATE, DISPATCH, BOARD, TRACK
Server -> Client: BOARDING_CALL, POSITION, STATUS_CHANGE, BOARDING_CONFIRMATION,
                  NO_SHOW, SHUTDOWN, ERROR, AUTHENTICATE_SUCCESS

CLI COMMANDS (server terminal only)
-----------------------------------
FLIGHT STATUS <flight_id>  (alias: FLIGHT_STATUS)
KILL <username>
QUIT

WHEATLEY HTTP AUTH (spec section 8.8)
-------------------------------------
Wheatley requires your CS hosting credentials in API requests:
  https://username:password@wheatley.cs.up.ac.za/uXXXXXXXX/public_html/api

This is separate from flight-app login (atc_admin / passenger1 via login.php).

Node server — set environment variables before starting:
  WHEATLEY_USER=u25009801
  WHEATLEY_PASS=your_wheatley_password
  node src/server.js --port=8080

Angular client — edit src/app/environment.local.ts (copy from .example):
  wheatleyUser, wheatleyPass, wheatleyPath
  Do NOT submit environment.local.ts with real passwords to ClickUP.

CORS ON WHEATLEY
----------------
Wheatley's web server already adds Access-Control-Allow-Origin. Do not send the
same headers again from config.php or you will see:
  "contains multiple values '*, *'"
Upload the latest api/config.php (CORS headers removed from PHP).

SECURITY
--------
Do not commit real Wheatley passwords, database passwords, or API keys.
Use environment variables / environment.local.ts (gitignored).
